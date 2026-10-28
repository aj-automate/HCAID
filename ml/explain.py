"""Voorspellen en uitleggen.

Lokale uitleg met exacte (interventionele) Shapley-waarden: voor elke subset van
features meten we de gemiddelde voorspelling als alleen die features van de
gebruiker zijn en de rest uit een achtergrondsteekproef komt. Met 10 features
zijn dat 1024 subsets, klein genoeg om exact te rekenen in plaats van te
benaderen zoals SHAP's KernelExplainer doet.
"""

from itertools import product
from math import factorial

import numpy as np
import pandas as pd

from ml.config import FEATURES, to_model_row


class Predictor:
    def __init__(self, bundle: dict):
        self.model = bundle["model"]
        self.features: list[str] = bundle["features"]
        self.background: pd.DataFrame = bundle["background"]
        self.meta: dict = bundle["meta"]
        n = len(self.features)
        self._masks = np.array(list(product([0, 1], repeat=n)), dtype=bool)
        self._weights = np.array(
            [factorial(k) * factorial(n - k - 1) / factorial(n) for k in range(n)]
        )
        self._base = float(self.model.predict_proba(self.background)[:, 1].mean())

    # ---------- voorspelling ----------
    def proba_rows(self, rows: list[dict]) -> np.ndarray:
        return self.model.predict_proba(pd.DataFrame(rows, columns=self.features))[:, 1]

    def proba(self, values: dict) -> float:
        return float(self.proba_rows([to_model_row(values, self.features)])[0])

    def band(self, p: float) -> dict:
        for b in self.meta["bands"]:
            if p < b["tot"] or b["band"] == "hoog":
                return b
        return self.meta["bands"][-1]

    def confidence(self, p: float) -> dict:
        """Hoe ver ligt de kans van de dichtstbijzijnde bandgrens?"""
        t = self.meta["thresholds"]
        dist = min(abs(p - t["laag_tot"]), abs(p - t["hoog_vanaf"]))
        if dist < 0.04:
            label = "twijfelgeval"
        elif dist < 0.12:
            label = "redelijk zeker"
        else:
            label = "zeker"
        return {"label": label, "afstand_tot_grens": round(dist, 3)}

    # ---------- uitleg ----------
    def shapley(self, values: dict) -> dict:
        x = np.array([to_model_row(values, self.features)[f] for f in self.features], dtype=object)
        bg = self.background[self.features].to_numpy(dtype=object)
        masks = self._masks
        stacked = np.where(masks[:, None, :], x[None, None, :], bg[None, :, :])
        flat = stacked.reshape(-1, len(self.features))
        preds = self.model.predict_proba(pd.DataFrame(flat, columns=self.features))[:, 1]
        v = preds.reshape(len(masks), len(bg)).mean(axis=1)

        index = {tuple(m): i for i, m in enumerate(masks)}
        sizes = masks.sum(axis=1)
        phi = np.zeros(len(self.features))
        for i in range(len(self.features)):
            without = ~masks[:, i]
            for row in np.where(without)[0]:
                with_i = masks[row].copy()
                with_i[i] = True
                phi[i] += self._weights[sizes[row]] * (v[index[tuple(with_i)]] - v[row])
        return {"base": float(v[0]), "prediction": float(v[-1]), "phi": dict(zip(self.features, phi))}

    def explain(self, values: dict) -> list[dict]:
        s = self.shapley(values)
        out = []
        for f, contrib in sorted(s["phi"].items(), key=lambda kv: -abs(kv[1])):
            out.append({
                "feature": f,
                "label": FEATURES[f]["short"],
                "value": values[f],
                "value_label": value_label(f, values[f]),
                "contribution": round(float(contrib), 4),
            })
        return out

    # ---------- wat verlaagt het risico ----------
    def counterfactuals(self, values: dict, max_items: int = 3) -> list[dict]:
        """Zoek haalbare aanpassingen van bedrag en looptijd die de kans verlagen.

        Het model houdt "aflossing t.o.v. inkomen" vast, dus een kortere looptijd
        lijkt gratis. Daarom staan we alleen opties toe waarbij het maandbedrag
        (bedrag / looptijd) niet hoger wordt dan nu.
        """
        p0 = self.proba(values)
        cfg_amount, cfg_dur = FEATURES["credit_amount"], FEATURES["duration"]
        amount0, dur0 = float(values["credit_amount"]), int(values["duration"])
        monthly0 = amount0 / dur0
        amounts = np.arange(cfg_amount["min"], amount0 + 1, cfg_amount["step"])
        durations = range(12, cfg_dur["max"] + 1, cfg_dur["step"])
        options = []
        for a, d in product(amounts, durations):
            if (a == amount0 and d == dur0) or a / d > monthly0 * 1.001:
                continue
            options.append({**values, "credit_amount": float(a), "duration": int(d)})
        if not options:
            return []
        ps = self.proba_rows([to_model_row(o, self.features) for o in options])

        rank = {"laag": 0, "gemiddeld": 1, "hoog": 2}
        candidates = [(float(p), o) for o, p in zip(options, ps) if p < p0 - 0.03]
        # Liefst een lagere risicoband, en binnen die band zo min mogelijk inleveren op het bedrag.
        candidates.sort(key=lambda c: (rank[self.band(c[0])["band"]], -c[1]["credit_amount"], c[0]))
        picked, seen = [], set()
        for p, o in candidates:
            key = (self.band(p)["band"], o["credit_amount"] == amount0)
            if key in seen:
                continue
            seen.add(key)
            picked.append({
                "credit_amount": o["credit_amount"],
                "duration": o["duration"],
                "probability": round(p, 4),
                "band": self.band(p)["band"],
                "verschil": round(p - p0, 4),
            })
            if len(picked) == max_items:
                break
        return picked


    # Situaties die iemand zelf op termijn kan veranderen, van slechter naar beter.
    LEVERS = {
        "other_payment_plans": ["stores", "bank", "none"],
        "savings_status": ["<100", "100<=X<500", "500<=X<1000", ">=1000"],
        "checking_status": ["<0", "0<=X<200", ">=200"],
        "installment_commitment": [4, 3, 2, 1],
    }

    def levers(self, values: dict, max_items: int = 3) -> list[dict]:
        """Welke enkele, haalbare stap in iemands situatie verlaagt de kans het meest?"""
        p0 = self.proba(values)
        options = []
        for f, ladder in self.LEVERS.items():
            if f not in self.features:
                continue
            current = int(values[f]) if f == "installment_commitment" else values[f]
            if current not in ladder or current == ladder[-1]:
                continue
            if f == "other_payment_plans":
                options.append((f, "none"))  # regeling afronden
            else:
                options.append((f, ladder[ladder.index(current) + 1]))  # eerstvolgende stap
        if not options:
            return []
        rows = [to_model_row({**values, f: t}, self.features) for f, t in options]
        ps = self.proba_rows(rows)
        out = [
            {
                "feature": f,
                "label": FEATURES[f]["short"],
                "from": value_label(f, values[f]),
                "to": value_label(f, t),
                "probability": round(float(p), 4),
                "band": self.band(float(p))["band"],
                "verschil": round(float(p) - p0, 4),
            }
            for (f, t), p in zip(options, ps)
            if p < p0 - 0.02
        ]
        return sorted(out, key=lambda d: d["verschil"])[:max_items]


def value_label(feature: str, value) -> str:
    cfg = FEATURES[feature]
    if "options" in cfg:
        opts = cfg["options"]
        return opts.get(value, opts.get(int(value) if str(value).isdigit() else value, str(value)))
    if cfg.get("unit") == "eur":
        return f"€ {float(value):,.0f}".replace(",", ".")
    return f"{int(float(value))} {cfg.get('unit', '')}".strip()
