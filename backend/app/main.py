"""API voor Schuldwijzer (goedaardig) en SnelGeld (kwaadaardig).

Draai lokaal:  uvicorn backend.app.main:app --reload
De gebouwde frontend (frontend/dist) wordt door dezelfde server geserveerd.
"""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.app.pricing import offer
from ml.config import DAMIAN, FEATURES, MODEL_DIR, ROOT, SENSITIVE
from ml.explain import Predictor

app = FastAPI(title="HCAID Kredietrisico", version="1.0")

PREDICTORS = {
    name: Predictor(joblib.load(MODEL_DIR / f"{name}.joblib"))
    for name in ("schuldwijzer", "snelgeld")
}

FEEDBACK_FILE = ROOT / "feedback" / "schuldwijzer.jsonl"
_feedback_lock = threading.Lock()


# ---------- validatie ----------
def validate(values: dict, features: list[str]) -> dict:
    clean = {}
    for f in features:
        if f not in values:
            raise HTTPException(422, f"Ontbrekend veld: {f}")
        cfg, v = FEATURES[f], values[f]
        if "options" in cfg:
            keys = list(cfg["options"].keys())
            if isinstance(keys[0], int):
                try:
                    v = int(v)
                except (TypeError, ValueError):
                    raise HTTPException(422, f"Ongeldige waarde voor {f}")
            if v not in keys:
                raise HTTPException(422, f"Ongeldige waarde voor {f}: {v}")
        else:
            try:
                v = float(v)
            except (TypeError, ValueError):
                raise HTTPException(422, f"{f} moet een getal zijn")
            if not cfg["min"] <= v <= cfg["max"]:
                raise HTTPException(422, f"{f} moet tussen {cfg['min']} en {cfg['max']} liggen")
        clean[f] = v
    return clean


def feature_meta(features: list[str]) -> list[dict]:
    out = []
    for f in features:
        cfg = FEATURES[f]
        item = {"name": f, "question": cfg["question"], "short": cfg["short"], "why": cfg.get("why")}
        if "options" in cfg:
            item["options"] = [{"value": k, "label": v} for k, v in cfg["options"].items()]
        else:
            item.update({k: cfg[k] for k in ("unit", "min", "max", "step")})
        out.append(item)
    return out


# ---------- algemeen ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta/{name}")
def meta(name: Literal["schuldwijzer", "snelgeld"]):
    P = PREDICTORS[name]
    m = P.meta
    return {
        "features": feature_meta(P.features),
        "defaults": {f: DAMIAN[f] for f in P.features},
        "not_used": [{"name": f, "short": FEATURES[f]["short"]} for f in SENSITIVE if f not in P.features],
        "model": {
            "type": "Neuraal netwerk (MLPClassifier), gekalibreerd",
            "hidden_layers": m["best_params"]["hidden_layer_sizes"],
            "dataset": "German Credit (Statlog), 1000 leningen, Duitsland jaren '70",
            "test_auc": m["test"]["roc_auc"],
            "test_accuracy": m["test"]["accuracy_05"],
            "recall_bad": m["test"]["recall_bad"],
            "base_rate": m["base_rate"],
            "bands": m["bands"],
            "importance": [
                {**i, "label": FEATURES[i["feature"]]["short"]} for i in m["importance"]
            ],
            "fairness": m["fairness_test"],
            "n_test": m["n_test"],
        },
    }


# ---------- Schuldwijzer ----------
class PredictIn(BaseModel):
    values: dict


@app.post("/api/schuldwijzer/predict")
def schuldwijzer_predict(body: PredictIn):
    P = PREDICTORS["schuldwijzer"]
    values = validate(body.values, P.features)
    p = P.proba(values)
    band = P.band(p)
    return {
        "probability": round(p, 4),
        "band": band,
        "confidence": P.confidence(p),
        "base_rate": P.meta["base_rate"],
        "explanation": P.explain(values),
        "counterfactuals": P.counterfactuals(values),
        "levers": P.levers(values),
    }


class FeedbackIn(BaseModel):
    agree: bool
    band: Literal["laag", "gemiddeld", "hoog"]
    reason: str | None = Field(default=None, max_length=500)


@app.post("/api/schuldwijzer/feedback")
def schuldwijzer_feedback(body: FeedbackIn):
    # Bewust geen invoerwaarden opslaan: alleen het oordeel en de risicoband.
    record = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "agree": body.agree,
        "band": body.band,
        "reason": (body.reason or "").strip()[:500] or None,
    }
    with _feedback_lock:
        FEEDBACK_FILE.parent.mkdir(exist_ok=True)
        with FEEDBACK_FILE.open("a") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        lines = FEEDBACK_FILE.read_text().splitlines()
    rows = [json.loads(line) for line in lines if line.strip()]
    disagree = sum(1 for r in rows if not r["agree"])
    return {"total": len(rows), "disagree": disagree}


# ---------- SnelGeld ----------
class SnelGeldIn(BaseModel):
    values: dict
    urgency: Literal["vandaag", "deze_week", "geen_haast"] = "vandaag"


@app.post("/api/snelgeld/predict")
def snelgeld_predict(body: SnelGeldIn):
    P = PREDICTORS["snelgeld"]
    values = validate(body.values, P.features)
    p = P.proba(values)
    return offer(values, p, body.urgency, P.meta["thresholds"]["hoog_vanaf"])


# ---------- frontend ----------
DIST = ROOT / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        target = DIST / path
        if path and target.is_file() and DIST in target.resolve().parents:
            return FileResponse(target)
        return FileResponse(DIST / "index.html")
