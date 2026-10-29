"""Train de twee neurale netwerken (Schuldwijzer en SnelGeld).

Gebruik:  python -m ml.train

Stappen per model:
  1. 80/20 stratified split, testset blijft ongezien.
  2. GridSearchCV over grootte en regularisatie van een monotoon neuraal netwerk
     (ml/monotone.py): geordende kenmerken kunnen de kans alleen de logische kant op
     bewegen.
  3. Kalibratie (sigmoid) zodat de kans echt als kans te lezen is.
  4. Evaluatie op de testset, vergeleken met een baseline, logistische regressie en
     een gewoon (niet-monotoon) neuraal netwerk, inclusief een monotoniecheck.
  5. Eindmodel op alle data; risicogrenzen, fairness-audit en betrouwbaarheid per kans
     op out-of-fold voorspellingen van alle 1000 aanvragen.
  6. Een klein ensemble (bootstrap) om per aanvraag een onzekerheidsmarge te tonen.
"""

import json
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_predict, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.checks import violations
from ml.config import (
    DATA_PATH,
    MODEL_DIR,
    NUMERIC,
    POSITIVE,
    RANDOM_STATE,
    SCHULDWIJZER_EXCLUDE,
    SCHULDWIJZER_FEATURES,
    SNELGELD_FEATURES,
    TARGET,
)
from ml.monotone import MonotoneNNClassifier

warnings.filterwarnings("ignore")

PARAM_GRID = {"hidden": [4, 8, 16], "alpha": [1e-3, 1e-2, 3e-2, 1e-1]}

# Schuldwijzer wil zo min mogelijk mensen missen die in de problemen komen
# (recall op "bad"). Een vals alarm kost een gesprek met een schuldhulpverlener,
# een gemiste waarschuwing kan jaren schuld kosten.
RECALL_HIGH = 0.60  # "hoog" vangt 60% van de probleemgevallen
RECALL_LOW = 0.90  # "gemiddeld" of hoger vangt 90%
N_ENSEMBLE = 8


def load_data() -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(DATA_PATH)
    y = (df[TARGET] == POSITIVE).astype(int)
    return df.drop(columns=TARGET), y


def make_pipeline(features: list[str], model) -> Pipeline:
    """One-hot-pipeline voor de vergelijkingsmodellen (gewoon MLP, logistische regressie)."""
    num = [f for f in features if f in NUMERIC]
    cat = [f for f in features if f not in NUMERIC]
    pre = ColumnTransformer(
        [
            ("num", StandardScaler(), num),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat),
        ]
    )
    return Pipeline([("pre", pre), ("mlp", model)])


def mlp(**kw) -> MLPClassifier:
    return MLPClassifier(max_iter=3000, random_state=RANDOM_STATE, **kw)


def threshold_for_recall(y: np.ndarray, p: np.ndarray, target: float) -> float:
    """Hoogste grens waarbij nog minstens `target` van de positieven gevangen wordt."""
    pos = np.sort(p[y == 1])[::-1]
    k = int(np.ceil(target * len(pos))) - 1
    return float(pos[k])


def group_labels(X: pd.DataFrame) -> dict[str, pd.Series]:
    sex = X["personal_status"].map(lambda s: "vrouw" if s.startswith("female") else "man")
    age = pd.cut(X["age"], [0, 25, 200], labels=["25 of jonger", "ouder dan 25"]).astype(str)
    nat = X["foreign_worker"].map({"yes": "buitenlands", "no": "niet buitenlands"})
    return {"geslacht": sex, "leeftijd": age, "nationaliteit": nat}


def fairness_report(X: pd.DataFrame, y: np.ndarray, p: np.ndarray, flag_at: float) -> dict:
    out = {}
    flagged = p >= flag_at
    for name, groups in group_labels(X).items():
        rows = {}
        for g in sorted(groups.unique()):
            m = (groups == g).to_numpy()
            yt, ft = y[m], flagged[m]
            tn, fp, fn, tp = confusion_matrix(yt, ft, labels=[0, 1]).ravel()
            rows[g] = {
                "n": int(m.sum()),
                "n_good": int((yt == 0).sum()),
                "werkelijk_bad": round(float(yt.mean()), 3),
                "gemiddelde_kans": round(float(p[m].mean()), 3),
                "geflagd": round(float(ft.mean()), 3),
                "fpr": round(float(fp / (fp + tn)) if fp + tn else 0.0, 3),
                "fnr": round(float(fn / (fn + tp)) if fn + tp else 0.0, 3),
            }
        out[name] = rows
    return out


def evaluate(y: np.ndarray, p: np.ndarray, flag_at: float) -> dict:
    pred = (p >= flag_at).astype(int)
    return {
        "roc_auc": round(float(roc_auc_score(y, p)), 3),
        "accuracy_05": round(float(accuracy_score(y, p >= 0.5)), 3),
        "balanced_accuracy": round(float(balanced_accuracy_score(y, pred)), 3),
        "recall_bad": round(float(recall_score(y, pred)), 3),
        "precision_bad": round(float(precision_score(y, pred, zero_division=0)), 3),
        "brier": round(float(brier_score_loss(y, p)), 3),
        "confusion": confusion_matrix(y, pred).tolist(),
    }


def train_one(name: str, features: list[str], X: pd.DataFrame, y: pd.Series, exclude: dict) -> dict:
    print(f"\n=== {name} ({len(features)} features) ===")
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)

    search = GridSearchCV(
        MonotoneNNClassifier(features, random_state=RANDOM_STATE), PARAM_GRID,
        scoring="roc_auc", cv=cv, n_jobs=-1,
    )
    search.fit(X_tr[features], y_tr)
    best = search.best_params_
    print("beste parameters:", best, "cv auc:", round(search.best_score_, 3))

    def calibrated(seed=RANDOM_STATE):
        return CalibratedClassifierCV(
            MonotoneNNClassifier(features, random_state=seed, **best),
            method="sigmoid", cv=5, ensemble=False,
        )

    # ---------- evaluatie op de ongeziene testset ----------
    model = calibrated().fit(X_tr[features], y_tr)
    p_te = model.predict_proba(X_te[features])[:, 1]
    p_oof_tr = cross_val_predict(calibrated(), X_tr[features], y_tr, cv=cv, method="predict_proba")[:, 1]
    flag_at = threshold_for_recall(y_tr.to_numpy(), p_oof_tr, RECALL_HIGH)
    test_metrics = evaluate(y_te.to_numpy(), p_te, flag_at)
    print("test:", {k: v for k, v in test_metrics.items() if k != "confusion"})

    # Vergelijking: baseline, logistische regressie (white box) en een gewoon neuraal netwerk.
    comparison = {}
    for cname, cmodel in [
        ("baseline_altijd_good", make_pipeline(features, DummyClassifier(strategy="most_frequent"))),
        ("logistische_regressie", make_pipeline(features, LogisticRegression(max_iter=2000, C=0.3))),
        ("gewoon_neuraal_netwerk", make_pipeline(features, mlp(hidden_layer_sizes=(8,), alpha=1.0))),
        ("monotoon_neuraal_netwerk", model),
    ]:
        fitted = cmodel if cname == "monotoon_neuraal_netwerk" else cmodel.fit(X_tr[features], y_tr)
        pb = fitted.predict_proba(X_te[features])[:, 1]
        viol = violations(lambda d, m=fitted: m.predict_proba(d)[:, 1], X, features, exclude=exclude)
        comparison[cname] = {
            "roc_auc": round(float(roc_auc_score(y_te, pb)), 3),
            "accuracy_05": round(float(accuracy_score(y_te, pb >= 0.5)), 3),
            "onlogisch_per_kenmerk": viol,
            "onlogisch_max": max(viol.values()) if viol else 0.0,
        }
    print("vergelijking:", {k: (v["roc_auc"], v["onlogisch_max"]) for k, v in comparison.items()})

    imp = permutation_importance(
        model, X_te[features], y_te, scoring="roc_auc", n_repeats=20, random_state=RANDOM_STATE
    )
    importance = sorted(
        ({"feature": f, "mean": round(float(m), 4), "std": round(float(s), 4)}
         for f, m, s in zip(features, imp.importances_mean, imp.importances_std)),
        key=lambda d: -d["mean"],
    )

    # ---------- eindmodel op alle data ----------
    final = calibrated().fit(X[features], y)
    p_oof = cross_val_predict(calibrated(), X[features], y, cv=cv, method="predict_proba")[:, 1]
    t_high = threshold_for_recall(y.to_numpy(), p_oof, RECALL_HIGH)
    t_low = threshold_for_recall(y.to_numpy(), p_oof, RECALL_LOW)
    bands = []
    for label, lo, hi in [("laag", 0.0, t_low), ("gemiddeld", t_low, t_high), ("hoog", t_high, 1.0001)]:
        m = (p_oof >= lo) & (p_oof < hi)
        bands.append({
            "band": label,
            "van": round(lo, 4),
            "tot": round(min(hi, 1.0), 4),
            "aandeel": round(float(m.mean()), 3),
            "werkelijk_bad": round(float(y.to_numpy()[m].mean()), 3),
        })
    print("banden:", bands)

    # Fairness op alle 1000 out-of-fold voorspellingen, bij de grens die de app gebruikt.
    fairness = fairness_report(X.reset_index(drop=True), y.to_numpy(), p_oof, t_high)
    test_metrics_app = evaluate(y.to_numpy(), p_oof, t_high)

    # Ensemble voor de onzekerheidsmarge: zelfde netwerk op bootstrap-steekproeven.
    rng = np.random.default_rng(RANDOM_STATE)
    ensemble = []
    for i in range(N_ENSEMBLE):
        idx = rng.integers(0, len(X), len(X))
        ensemble.append(
            MonotoneNNClassifier(features, random_state=i, **best).fit(X[features].iloc[idx], y.iloc[idx])
        )

    background = X[features].sample(40, random_state=RANDOM_STATE).reset_index(drop=True)

    meta = {
        "name": name,
        "features": features,
        "model_type": "monotoon neuraal netwerk (1 verborgen laag, tanh), sigmoid-gekalibreerd",
        "best_params": best,
        "cv_auc": round(float(search.best_score_), 3),
        "test": test_metrics,
        "comparison": comparison,
        "oof_all": test_metrics_app,
        "fairness": fairness,
        "importance": importance,
        "thresholds": {"laag_tot": round(t_low, 4), "hoog_vanaf": round(t_high, 4)},
        "bands": bands,
        "base_rate": round(float(y.mean()), 3),
        "n_train": int(len(X_tr)),
        "n_test": int(len(X_te)),
    }
    order = np.argsort(p_oof)
    joblib.dump(
        {
            "model": final,
            "ensemble": ensemble,
            "features": features,
            "background": background,
            "oof": {"p": p_oof[order], "y": y.to_numpy()[order]},
            "meta": meta,
        },
        MODEL_DIR / f"{name}.joblib",
    )
    return meta


def main() -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    X, y = load_data()
    metas = {
        "schuldwijzer": train_one("schuldwijzer", SCHULDWIJZER_FEATURES, X, y, SCHULDWIJZER_EXCLUDE),
        "snelgeld": train_one("snelgeld", SNELGELD_FEATURES, X, y, {}),
    }
    with open(MODEL_DIR / "metrics.json", "w") as fh:
        json.dump(metas, fh, indent=2, ensure_ascii=False, default=float)
    print("\nOpgeslagen in", MODEL_DIR)


if __name__ == "__main__":
    main()
