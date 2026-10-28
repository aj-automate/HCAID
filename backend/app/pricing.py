"""SnelGeld: hoe dezelfde risicovoorspelling omgezet wordt in winst.

Dit bestand is het kwaadaardige hart van SnelGeld en bewust expliciet
gehouden, zodat de ontwerpkeuzes in de app en op de poster te herleiden zijn.
Niets hiervan is een echt aanbod.
"""

from math import ceil

BASE_APR = 9.9
RISK_MARKUP = 18.0  # tot +18 procentpunt bij hoog risico
URGENCY_MARKUP = {"vandaag": 4.0, "deze_week": 2.0, "geen_haast": 0.0}
YOUNG_MARKUP = 1.5  # jongeren vergelijken minder vaak
FOREIGN_MARKUP = 1.0  # discriminerende opslag op nationaliteit
MAX_APR = 29.9
CLOSING_FEE = 149.0
LATE_FEE = 35.0


def annuity(amount: float, apr: float, months: int) -> float:
    r = apr / 100 / 12
    return amount * r / (1 - (1 + r) ** -months)


def offer(values: dict, p: float, urgency: str, high_from: float) -> dict:
    requested = float(values["credit_amount"])
    breakdown = [
        {"label": "Basisrente", "pp": BASE_APR},
        {"label": "Risico-opslag (uit het model)", "pp": round(RISK_MARKUP * p, 1)},
        {"label": "Haast-opslag", "pp": URGENCY_MARKUP.get(urgency, 0.0)},
    ]
    if float(values.get("age", 99)) < 25:
        breakdown.append({"label": "Leeftijdsopslag (jonger dan 25)", "pp": YOUNG_MARKUP})
    if values.get("foreign_worker") == "yes":
        breakdown.append({"label": "Opslag buitenlandse nationaliteit", "pp": FOREIGN_MARKUP})
    apr = round(min(MAX_APR, sum(b["pp"] for b in breakdown)), 1)

    # Hoog risico krijgt juist meer geld aangeboden: daar zit de marge.
    upsell = requested
    if p >= high_from:
        upsell = ceil(requested * 1.5 / 250) * 250

    # Looptijd oprekken zodat het maandbedrag klein oogt.
    months = min(72, max(int(values["duration"]), ceil(int(values["duration"]) * 1.5 / 6) * 6))
    monthly = annuity(requested, apr, months)
    total = monthly * months + CLOSING_FEE

    if p >= high_from and urgency == "vandaag":
        segment = "Kwetsbaar en haastig: maximale marge"
    elif p >= high_from:
        segment = "Hoog risico: hoge rente, extra bedrag aanbieden"
    elif urgency == "vandaag":
        segment = "Haastig: rente-opslag, geen vergelijking laten zien"
    else:
        segment = "Standaard: verkopen op gemak"

    return {
        "approved": True,
        "requested": requested,
        "upsell_amount": upsell,
        "apr": apr,
        "months": months,
        "monthly": round(monthly, 2),
        "total": round(total, 2),
        "closing_fee": CLOSING_FEE,
        "late_fee": LATE_FEE,
        "behind_the_scenes": {
            "probability": round(p, 4),
            "segment": segment,
            "breakdown": breakdown,
            "expected_extra_interest": round(total - requested - CLOSING_FEE, 2),
        },
    }
