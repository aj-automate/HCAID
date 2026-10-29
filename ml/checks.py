"""Controle op logische voorspellingen (monotonie).

Voor willekeurige echte profielen uit de data laten we één geordend kenmerk over
zijn hele bereik lopen en tellen we hoe vaak de kans de verkeerde kant op beweegt
(meer dan `tol` procentpunt). Een monotoon model scoort hier per definitie 0.
"""

import numpy as np
import pandas as pd

from ml.config import DM_PER_EUR, MONOTONE

AMOUNTS_EUR = np.arange(250, 10001, 250)
DURATIONS = np.arange(6, 73, 6)


def ladder(feature: str, exclude: dict | None = None) -> list:
    """Waarden van een kenmerk van laag naar hoog in de ordening (in modelformaat)."""
    spec = MONOTONE[feature]
    if feature == "credit_amount":
        return list(AMOUNTS_EUR * DM_PER_EUR)
    if feature == "duration":
        return list(DURATIONS.astype(float))
    if "order" in spec:
        skip = set(spec.get("flags", [])) | set((exclude or {}).get(feature, []))
        vals = [v for v in spec["order"] if v not in skip]
        return sorted(vals, key=lambda v: spec["order"][v])
    return [1.0, 2.0, 3.0, 4.0]


def violations(predict, X: pd.DataFrame, features: list[str], n: int = 300, tol: float = 0.005,
               exclude: dict | None = None, seed: int = 0) -> dict:
    """Aandeel profielen waarbij de kans ergens de verkeerde kant op gaat, per kenmerk."""
    base = X[features].sample(n, random_state=seed, replace=len(X) < n).reset_index(drop=True)
    out = {}
    for f in [f for f in features if f in MONOTONE]:
        steps = ladder(f, exclude)
        rows = pd.concat([base.assign(**{f: v}) for v in steps], ignore_index=True)
        p = predict(rows).reshape(len(steps), n)  # rij = stap, kolom = profiel
        diffs = np.diff(p, axis=0) * MONOTONE[f]["direction"]  # moet >= 0 zijn
        out[f] = round(float((diffs < -tol).any(axis=0).mean()), 3)
    return out
