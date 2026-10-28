"""Train de twee neurale netwerken (Schuldwijzer en SnelGeld).

Gebruik:  python -m ml.train

Stappen per model:
  1. 80/20 stratified split, testset blijft ongezien.
  2. GridSearchCV over de architectuur en regularisatie van een MLPClassifier.
  3. Kalibratie (sigmoid) zodat de kans echt als kans te lezen is.
  4. Evaluatie op de testset, vergeleken met twee baselines.
  5. Fairness-audit per geslacht, leeftijdsgroep en nationaliteit.
  6. Permutation importance (globale uitleg).
  7. Hertrainen op alle data voor de app, risicogrenzen bepalen op out-of-fold kansen.
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

from ml.config import (
    DATA_PATH,
    MODEL_DIR,
    NUMERIC,
    POSITIVE,
    RANDOM_STATE,
    SCHULDWIJZER_FEATURES,
    SNELGELD_FEATURES,
    TARGET,
)

warnings.filterwarnings("ignore", category=UserWarning)

PARAM_GRID = {
    "mlp__hidden_layer_sizes": [(4,), (8,), (16,), (8, 4)],
    "mlp__alpha": [0.3, 1.0, 3.0, 10.0],
}

# Schuldwijzer wil zo min mogelijk mensen missen die in de problemen komen
# (recall op "bad"). Een vals alarm kost een gesprek met een schuldhulpverlener,
# een gemiste waarschuwing kan jaren schuld kosten.
RECALL_HIGH = 0.60  # "hoog" vangt 60% van de probleemgevallen
RECALL_LOW = 0.90  # "gemiddeld" of hoger vangt 90%


def load_data() -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(DATA_PATH)
    y = (df[TARGET] == POSITIVE).astype(int)
    return df.drop(columns=TARGET), y


def make_pipeline(features: list[str], model) -> Pipeline:
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
        "roc_auc": round(roc_auc_score(y, p), 3),
        "accuracy_05": round(accuracy_score(y, p >= 0.5), 3),
        "balanced_accuracy": round(balanced_accuracy_score(y, pred), 3),
        "recall_bad": round(recall_score(y, pred), 3),
        "precision_bad": round(precision_score(y, pred, zero_division=0), 3),
        "brier": round(brier_score_loss(y, p), 3),
        "confusion": confusion_matrix(y, pred).tolist(),
    }


def train_one(name: str, features: list[str], X: pd.DataFrame, y: pd.Series) -> dict:
    print(f"\n=== {name} ({len(features)} features) ===")
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)

    search = GridSearchCV(
        make_pipeline(features, mlp()), PARAM_GRID, scoring="roc_auc", cv=cv, n_jobs=-1
    )
    search.fit(X_tr[features], y_tr)
    best = {k.replace("mlp__", ""): v for k, v in search.best_params_.items()}
    print("beste parameters:", best, "cv auc:", round(search.best_score_, 3))

    def calibrated():
        return CalibratedClassifierCV(
            make_pipeline(features, mlp(**best)), method="sigmoid", cv=5, ensemble=False
        )

    # Evaluatie op ongeziene testset
    model = calibrated().fit(X_tr[features], y_tr)
    p_te = model.predict_proba(X_te[features])[:, 1]
    p_oof_tr = cross_val_predict(calibrated(), X_tr[features], y_tr, cv=cv, method="predict_proba")[:, 1]
    flag_at = threshold_for_recall(y_tr.to_numpy(), p_oof_tr, RECALL_HIGH)
    test_metrics = evaluate(y_te.to_numpy(), p_te, flag_at)
    print("test:", {k: v for k, v in test_metrics.items() if k != "confusion"})

    baselines = {}
    for bname, bmodel in [
        ("altijd_good", DummyClassifier(strategy="most_frequent")),
        ("logistische_regressie", LogisticRegression(max_iter=2000, C=0.3)),
    ]:
        pipe = make_pipeline(features, bmodel).fit(X_tr[features], y_tr)
        pb = pipe.predict_proba(X_te[features])[:, 1]
        baselines[bname] = {
            "roc_auc": round(roc_auc_score(y_te, pb), 3),
            "accuracy_05": round(accuracy_score(y_te, pb >= 0.5), 3),
        }
    print("baselines:", baselines)

    fairness = fairness_report(X_te.reset_index(drop=True), y_te.to_numpy(), p_te, flag_at)

    imp = permutation_importance(
        model, X_te[features], y_te, scoring="roc_auc", n_repeats=20, random_state=RANDOM_STATE
    )
    importance = sorted(
        ({"feature": f, "mean": round(float(m), 4), "std": round(float(s), 4)}
         for f, m, s in zip(features, imp.importances_mean, imp.importances_std)),
        key=lambda d: -d["mean"],
    )

    # Eindmodel op alle data, grenzen op out-of-fold kansen
    final = calibrated().fit(X[features], y)
    p_oof = cross_val_predict(calibrated(), X[features], y, cv=cv, method="predict_proba")[:, 1]
    t_high = threshold_for_recall(y.to_numpy(), p_oof, RECALL_HIGH)
    t_low = threshold_for_recall(y.to_numpy(), p_oof, RECALL_LOW)
    bands = []
    for label, lo, hi in [("laag", 0.0, t_low), ("gemiddeld", t_low, t_high), ("hoog", t_high, 1.01)]:
        m = (p_oof >= lo) & (p_oof < hi)
        bands.append({
            "band": label,
            "van": round(lo, 3),
            "tot": round(min(hi, 1.0), 3),
            "aandeel": round(float(m.mean()), 3),
            "werkelijk_bad": round(float(y.to_numpy()[m].mean()), 3),
        })
    print("banden:", bands)

    background = X[features].sample(40, random_state=RANDOM_STATE).reset_index(drop=True)

    meta = {
        "name": name,
        "features": features,
        "best_params": {k: list(v) if isinstance(v, tuple) else v for k, v in best.items()},
        "cv_auc": round(search.best_score_, 3),
        "test": test_metrics,
        "baselines": baselines,
        "fairness_test": fairness,
        "importance": importance,
        "thresholds": {"laag_tot": round(t_low, 4), "hoog_vanaf": round(t_high, 4)},
        "bands": bands,
        "base_rate": round(float(y.mean()), 3),
        "n_train": int(len(X_tr)),
        "n_test": int(len(X_te)),
    }
    joblib.dump({"model": final, "features": features, "background": background, "meta": meta},
                MODEL_DIR / f"{name}.joblib")
    return meta


def main() -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    X, y = load_data()
    metas = {
        "schuldwijzer": train_one("schuldwijzer", SCHULDWIJZER_FEATURES, X, y),
        "snelgeld": train_one("snelgeld", SNELGELD_FEATURES, X, y),
    }
    with open(MODEL_DIR / "metrics.json", "w") as fh:
        json.dump(metas, fh, indent=2, ensure_ascii=False)
    print("\nOpgeslagen in", MODEL_DIR)


if __name__ == "__main__":
    main()
