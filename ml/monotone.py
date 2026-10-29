"""Monotoon neuraal netwerk voor kredietrisico.

Een gewoon neuraal netwerk volgt elke eigenaardigheid in de data. In German Credit
leidt dat tot voorspellingen die een mens onlogisch vindt: "geen werk" lager risico
dan "korter dan 1 jaar in dienst", of een langere looptijd die veiliger lijkt.

Dit netwerk legt domeinkennis vast als harde regel. Voor geordende kenmerken
(looptijd, bedrag, saldo, spaargeld, dienstverband, ...) ligt de richting vast:

    p = sigmoid( sum_j v_j * tanh( sum_i w_ij x_i + b_j ) + c )

met v_j >= 0 en, voor een monotoon kenmerk i met richting d_i (+1 of -1),
sign(w_ij) = d_i. Omdat tanh stijgend is, kan de kans dan nooit de verkeerde kant
op bewegen als dat kenmerk verandert, hoe de andere kenmerken ook staan. De
positiviteit wordt afgedwongen via softplus-parametrisatie. Niet-geordende
kenmerken (doel, woonsituatie, ...) hebben vrije gewichten.

Training: volledige batch, Adam, binaire cross-entropy met L2-regularisatie.
De klasse is scikit-learn-compatibel, dus GridSearchCV en CalibratedClassifierCV
werken gewoon (sigmoid-kalibratie is zelf stijgend en behoudt de monotonie).
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin

from ml.config import MONOTONE, NUMERIC


def _softplus(u):
    return np.logaddexp(0.0, u)


def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))


class Encoder:
    """Zet een DataFrame om in (monotone kolommen, vrije kolommen)."""

    def __init__(self, features: list[str]):
        self.features = features

    def fit(self, X: pd.DataFrame) -> "Encoder":
        self.mono_ = [f for f in self.features if f in MONOTONE]
        self.free_num_ = [f for f in self.features if f not in MONOTONE and f in NUMERIC]
        self.free_cat_ = [f for f in self.features if f not in MONOTONE and f not in NUMERIC]
        self.directions_ = np.array([MONOTONE[f]["direction"] for f in self.mono_], dtype=float)
        ranks = self._ranks(X)
        self.r_min_ = ranks.min(axis=0)
        self.r_span_ = np.where(ranks.max(axis=0) > self.r_min_, ranks.max(axis=0) - self.r_min_, 1.0)
        self.num_mean_ = X[self.free_num_].astype(float).mean().to_numpy() if self.free_num_ else np.zeros(0)
        self.num_std_ = X[self.free_num_].astype(float).std().replace(0, 1).to_numpy() if self.free_num_ else np.zeros(0)
        self.categories_ = {f: sorted(X[f].astype(str).unique()) for f in self.free_cat_}
        self.flags_ = [(f, v) for f in self.mono_ for v in MONOTONE[f].get("flags", [])]
        return self

    def _ranks(self, X: pd.DataFrame) -> np.ndarray:
        cols = []
        for f in self.mono_:
            spec = MONOTONE[f]
            if "order" in spec:
                cols.append(X[f].map(lambda v, o=spec["order"]: o[v]).astype(float).to_numpy())
            else:
                cols.append(X[f].astype(float).to_numpy())
        return np.column_stack(cols) if cols else np.zeros((len(X), 0))

    def transform(self, X: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        Xm = (self._ranks(X) - self.r_min_) / self.r_span_
        parts = []
        if self.free_num_:
            parts.append((X[self.free_num_].astype(float).to_numpy() - self.num_mean_) / self.num_std_)
        for f in self.free_cat_:
            vals = X[f].astype(str).to_numpy()
            parts.append(np.column_stack([(vals == c).astype(float) for c in self.categories_[f]]))
        for f, v in self.flags_:
            parts.append((X[f].astype(str).to_numpy() == v).astype(float)[:, None])
        Xf = np.hstack(parts) if parts else np.zeros((len(X), 0))
        return Xm, Xf


class MonotoneNNClassifier(ClassifierMixin, BaseEstimator):
    def __init__(self, features=None, hidden=8, alpha=1e-2, epochs=1500, lr=0.02, random_state=0):
        self.features = features
        self.hidden = hidden
        self.alpha = alpha
        self.epochs = epochs
        self.lr = lr
        self.random_state = random_state

    # ---------- parameters ----------
    def _unpack(self):
        Wm = self.directions_[:, None] * _softplus(self.U_)
        v = _softplus(self.Vr_)
        return Wm, v

    def _forward(self, Xm, Xf):
        Wm, v = self._unpack()
        a = Xm @ Wm + Xf @ self.Wf_ + self.b_
        h = np.tanh(a)
        z = h @ v + self.c_
        return h, z

    def fit(self, X, y):
        X = pd.DataFrame(X)
        y = np.asarray(y, dtype=float)
        self.classes_ = np.array([0, 1])
        self.enc_ = Encoder(self.features or list(X.columns)).fit(X)
        self.directions_ = self.enc_.directions_
        Xm, Xf = self.enc_.transform(X)
        rng = np.random.default_rng(self.random_state)
        H = self.hidden
        self.U_ = rng.normal(-1.0, 0.5, (Xm.shape[1], H))
        self.Wf_ = rng.normal(0.0, 0.3, (Xf.shape[1], H))
        self.b_ = np.zeros(H)
        self.Vr_ = rng.normal(0.0, 0.5, H)
        self.c_ = np.log(y.mean() / (1 - y.mean()))

        params = ["U_", "Wf_", "b_", "Vr_", "c_"]
        m = {k: np.zeros_like(np.asarray(getattr(self, k), dtype=float)) for k in params}
        s = {k: np.zeros_like(m[k]) for k in params}
        n = len(y)
        for t in range(1, self.epochs + 1):
            grads = self._grads(Xm, Xf, y, n)
            for k in params:
                g = grads[k]
                m[k] = 0.9 * m[k] + 0.1 * g
                s[k] = 0.999 * s[k] + 0.001 * g * g
                step = self.lr * (m[k] / (1 - 0.9**t)) / (np.sqrt(s[k] / (1 - 0.999**t)) + 1e-8)
                setattr(self, k, getattr(self, k) - step)
        return self

    def _loss(self, Xm, Xf, y):
        _, z = self._forward(Xm, Xf)
        p = np.clip(_sigmoid(z), 1e-9, 1 - 1e-9)
        Wm, v = self._unpack()
        reg = 0.5 * self.alpha * ((Wm**2).sum() + (self.Wf_**2).sum() + (v**2).sum())
        return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)) + reg

    def _grads(self, Xm, Xf, y, n):
        Wm, v = self._unpack()
        h, z = self._forward(Xm, Xf)
        dz = (_sigmoid(z) - y) / n
        dv = h.T @ dz + self.alpha * v
        dh = np.outer(dz, v)
        da = dh * (1 - h**2)
        dWm = Xm.T @ da + self.alpha * Wm
        return {
            "U_": dWm * self.directions_[:, None] * _sigmoid(self.U_),
            "Wf_": Xf.T @ da + self.alpha * self.Wf_,
            "b_": da.sum(axis=0),
            "Vr_": dv * _sigmoid(self.Vr_),
            "c_": dz.sum(),
        }

    def decision_function(self, X):
        Xm, Xf = self.enc_.transform(pd.DataFrame(X))
        return self._forward(Xm, Xf)[1]

    def predict_proba(self, X):
        p = _sigmoid(self.decision_function(X))
        return np.column_stack([1 - p, p])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)
