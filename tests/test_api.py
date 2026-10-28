"""Tests: de API werkt, en de voorspellingen zijn logisch.

"Logisch" is een eis uit de rubric: de voorspelling moet passen bij de invoer.
Daarom testen we niet alleen of er een getal uitkomt, maar ook of duidelijke
gevallen de goede kant op vallen.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import PREDICTORS, app
from ml.config import DAMIAN, SCHULDWIJZER_FEATURES

client = TestClient(app)

SW = {f: DAMIAN[f] for f in SCHULDWIJZER_FEATURES}

STRONG = {
    **SW,
    "credit_amount": 1500,
    "duration": 12,
    "checking_status": ">=200",
    "savings_status": ">=1000",
    "employment": ">=7",
    "installment_commitment": 1,
    "housing": "own",
    "property_magnitude": "real estate",
    "other_payment_plans": "none",
}


def predict(values):
    r = client.post("/api/schuldwijzer/predict", json={"values": values})
    assert r.status_code == 200, r.text
    return r.json()


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta_hides_sensitive_features_for_schuldwijzer():
    meta = client.get("/api/meta/schuldwijzer").json()
    names = {f["name"] for f in meta["features"]}
    assert not names & {"personal_status", "foreign_worker", "age"}
    assert len(names) >= 4  # eis: minimaal 4 features
    assert {n["name"] for n in meta["not_used"]} == {"personal_status", "foreign_worker", "age"}


def test_snelgeld_uses_sensitive_features():
    meta = client.get("/api/meta/snelgeld").json()
    names = {f["name"] for f in meta["features"]}
    assert {"personal_status", "foreign_worker", "age"} <= names


def test_damian_is_high_risk_and_strong_profile_is_low():
    assert predict(SW)["band"]["band"] == "hoog"
    assert predict(STRONG)["band"]["band"] == "laag"


@pytest.mark.parametrize(
    "feature, worse, better",
    [
        ("duration", 60, 12),
        ("checking_status", "<0", ">=200"),
        ("savings_status", "<100", ">=1000"),
        ("employment", "<1", ">=7"),
        ("installment_commitment", 4, 1),
    ],
)
def test_predictions_move_in_logical_direction(feature, worse, better):
    base = {**SW, "checking_status": "0<=X<200"}
    p_worse = predict({**base, feature: worse})["probability"]
    p_better = predict({**base, feature: better})["probability"]
    assert p_worse > p_better, f"{feature}: {worse}={p_worse} moet hoger zijn dan {better}={p_better}"


def test_explanation_adds_up_to_prediction():
    """Shapley-waarden: basis + som van bijdragen = voorspelling."""
    P = PREDICTORS["schuldwijzer"]
    s = P.shapley(SW)
    assert abs(s["base"] + sum(s["phi"].values()) - P.proba(SW)) < 1e-6


def test_counterfactuals_lower_risk_without_raising_monthly_payment():
    res = predict(SW)
    monthly = SW["credit_amount"] / SW["duration"]
    for c in res["counterfactuals"]:
        assert c["probability"] < res["probability"]
        assert c["credit_amount"] / c["duration"] <= monthly + 1e-6


def test_invalid_input_is_rejected():
    r = client.post("/api/schuldwijzer/predict", json={"values": {**SW, "credit_amount": 999999}})
    assert r.status_code == 422
    r = client.post("/api/schuldwijzer/predict", json={"values": {**SW, "housing": "kasteel"}})
    assert r.status_code == 422


def test_snelgeld_prices_risk_and_discriminates():
    young = client.post("/api/snelgeld/predict", json={"values": DAMIAN, "urgency": "vandaag"}).json()
    calm = client.post(
        "/api/snelgeld/predict", json={"values": {**DAMIAN, "age": 40}, "urgency": "geen_haast"}
    ).json()
    assert young["approved"] and calm["approved"]  # iedereen wordt "goedgekeurd"
    assert young["apr"] > calm["apr"]
    labels = [b["label"] for b in young["behind_the_scenes"]["breakdown"]]
    assert any("Leeftijd" in label for label in labels)
