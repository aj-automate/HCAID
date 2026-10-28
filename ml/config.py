"""Feature-definities, Nederlandse labels en vaste instellingen.

De dataset (German Credit, Statlog) komt uit Duitsland in de jaren '70 en
rekent in Duitse marken (DM). De apps vragen bedragen in euro en rekenen die om
met de officiele koers. Koopkracht is daarmee niet gecorrigeerd: dat is een
bewuste, gedocumenteerde beperking.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "german_credit.csv"
MODEL_DIR = ROOT / "models"

DM_PER_EUR = 1.95583
RANDOM_STATE = 42
TARGET = "class"
POSITIVE = "bad"  # 1 = betalingsproblemen

NUMERIC = {
    "duration",
    "credit_amount",
    "installment_commitment",
    "residence_since",
    "age",
    "existing_credits",
    "num_dependents",
}

# Schuldwijzer: dataminimalisatie en geen beschermde kenmerken.
# Bewust weggelaten:
#   personal_status  -> geslacht en burgerlijke staat (beschermd kenmerk)
#   foreign_worker   -> nationaliteit/herkomst (beschermd kenmerk)
#   age              -> leeftijd (beschermd kenmerk)
#   credit_history   -> categorieen werken omgekeerd door selectiebias
#                       ("kritieke rekening" = laagste risico), onlogische uitleg
#   overige          -> voegen nauwelijks iets toe, dus niet uitvragen
SCHULDWIJZER_FEATURES = [
    "credit_amount",
    "duration",
    "purpose",
    "checking_status",
    "savings_status",
    "employment",
    "installment_commitment",
    "housing",
    "property_magnitude",
    "other_payment_plans",
]

# SnelGeld: alles wat er is, inclusief beschermde kenmerken.
SNELGELD_FEATURES = [
    "credit_amount",
    "duration",
    "purpose",
    "checking_status",
    "savings_status",
    "employment",
    "installment_commitment",
    "housing",
    "property_magnitude",
    "other_payment_plans",
    "credit_history",
    "personal_status",
    "other_parties",
    "residence_since",
    "age",
    "existing_credits",
    "job",
    "num_dependents",
    "own_telephone",
    "foreign_worker",
]

SENSITIVE = ["personal_status", "foreign_worker", "age"]

# Labels per feature: vraag, korte naam voor uitleg, en per categorie een label.
FEATURES = {
    "credit_amount": {
        "question": "Hoeveel wil je lenen?",
        "short": "Leenbedrag",
        "why": "Een groter bedrag betekent hogere maandlasten.",
        "unit": "eur",
        "min": 250,
        "max": 10000,
        "step": 250,
    },
    "duration": {
        "question": "In hoeveel maanden wil je het terugbetalen?",
        "short": "Looptijd",
        "why": "Hoe langer je afbetaalt, hoe langer er iets mis kan gaan.",
        "unit": "maanden",
        "min": 6,
        "max": 72,
        "step": 6,
    },
    "purpose": {
        "question": "Waar is de lening voor?",
        "short": "Doel van de lening",
        "why": "Sommige doelen gaan in de data vaker samen met betalingsproblemen.",
        "options": {
            "used car": "Tweedehands auto",
            "new car": "Nieuwe auto",
            "furniture/equipment": "Meubels of inrichting",
            "radio/tv": "Elektronica (tv, audio, computer)",
            "domestic appliance": "Huishoudelijke apparaten",
            "repairs": "Reparaties",
            "education": "Opleiding",
            "retraining": "Omscholing",
            "business": "Zakelijk",
            "other": "Anders",
        },
    },
    "checking_status": {
        "question": "Hoeveel staat er gemiddeld op je betaalrekening?",
        "short": "Saldo betaalrekening",
        "why": "Je saldo laat zien hoeveel buffer je hebt aan het eind van de maand.",
        "options": {
            "<0": "Ik sta vaak rood",
            "0<=X<200": "Tussen € 0 en € 100",
            ">=200": "Meer dan € 100",
            "no checking": "Geen betaalrekening bij deze bank",
        },
    },
    "savings_status": {
        "question": "Hoeveel spaargeld heb je?",
        "short": "Spaargeld",
        "why": "Spaargeld vangt tegenvallers op, zoals een kapotte auto.",
        "options": {
            "<100": "Minder dan € 50",
            "100<=X<500": "€ 50 tot € 250",
            "500<=X<1000": "€ 250 tot € 500",
            ">=1000": "Meer dan € 500",
            "no known savings": "Onbekend of geen spaarrekening",
        },
    },
    "employment": {
        "question": "Hoe lang werk je al bij je huidige werkgever?",
        "short": "Dienstverband",
        "why": "Een langer dienstverband geeft meestal een stabieler inkomen.",
        "options": {
            "unemployed": "Ik heb nu geen werk",
            "<1": "Korter dan 1 jaar",
            "1<=X<4": "1 tot 4 jaar",
            "4<=X<7": "4 tot 7 jaar",
            ">=7": "7 jaar of langer",
        },
    },
    "installment_commitment": {
        "question": "Welk deel van je inkomen gaat straks naar aflossen?",
        "short": "Aflossing t.o.v. inkomen",
        "why": "Als een groot deel van je inkomen naar aflossen gaat, blijft er weinig over.",
        "options": {
            1: "Minder dan 20%",
            2: "20 tot 25%",
            3: "25 tot 35%",
            4: "35% of meer",
        },
    },
    "housing": {
        "question": "Hoe woon je?",
        "short": "Woonsituatie",
        "why": "Woonlasten bepalen hoeveel je overhoudt.",
        "options": {
            "rent": "Ik huur",
            "own": "Koopwoning",
            "for free": "Inwonend of gratis",
        },
    },
    "property_magnitude": {
        "question": "Wat is je meest waardevolle bezit?",
        "short": "Bezit",
        "why": "Bezit kan in nood verkocht worden.",
        "options": {
            "no known property": "Geen noemenswaardig bezit",
            "car": "Auto of ander bezit",
            "life insurance": "Spaar- of levensverzekering",
            "real estate": "Huis of grond",
        },
    },
    "other_payment_plans": {
        "question": "Heb je al andere afbetalingsregelingen lopen?",
        "short": "Andere afbetalingen",
        "why": "Lopende regelingen drukken op hetzelfde inkomen.",
        "options": {
            "none": "Nee",
            "bank": "Ja, bij een bank",
            "stores": "Ja, bij een winkel of achteraf betalen",
        },
    },
    # ---- Alleen SnelGeld ----
    "credit_history": {
        "question": "Hoe ging het met eerdere leningen?",
        "short": "Kredietverleden",
        "options": {
            "no credits/all paid": "Nooit eerder geleend",
            "all paid": "Alles bij deze bank afgelost",
            "existing paid": "Lopende leningen, netjes betaald",
            "delayed previously": "Wel eens te laat betaald",
            "critical/other existing credit": "Achterstand of leningen elders",
        },
    },
    "personal_status": {
        "question": "Geslacht en burgerlijke staat",
        "short": "Geslacht en relatie",
        "options": {
            "male single": "Man, alleenstaand",
            "male mar/wid": "Man, getrouwd of weduwnaar",
            "male div/sep": "Man, gescheiden",
            "female div/dep/mar": "Vrouw",
        },
    },
    "other_parties": {
        "question": "Tekent er iemand mee?",
        "short": "Medeaanvrager",
        "options": {
            "none": "Nee",
            "co applicant": "Ja, een partner",
            "guarantor": "Ja, iemand staat borg",
        },
    },
    "residence_since": {
        "question": "Hoe lang woon je op je huidige adres?",
        "short": "Woonduur",
        "options": {1: "Korter dan 1 jaar", 2: "1 tot 2 jaar", 3: "2 tot 4 jaar", 4: "Langer dan 4 jaar"},
    },
    "age": {
        "question": "Hoe oud ben je?",
        "short": "Leeftijd",
        "unit": "jaar",
        "min": 18,
        "max": 75,
        "step": 1,
    },
    "existing_credits": {
        "question": "Hoeveel leningen heb je nu?",
        "short": "Lopende leningen",
        "options": {1: "1", 2: "2", 3: "3", 4: "4 of meer"},
    },
    "job": {
        "question": "Wat voor werk doe je?",
        "short": "Beroep",
        "options": {
            "unemp/unskilled non res": "Geen werk",
            "unskilled resident": "Ongeschoold werk",
            "skilled": "Geschoold werk (mbo/vak)",
            "high qualif/self emp/mgmt": "Hoogopgeleid, zzp of leidinggevend",
        },
    },
    "num_dependents": {
        "question": "Voor hoeveel mensen zorg je financieel?",
        "short": "Personen ten laste",
        "options": {1: "Alleen mezelf", 2: "Ook voor anderen"},
    },
    "own_telephone": {
        "question": "Telefoonnummer op eigen naam?",
        "short": "Telefoon op eigen naam",
        "options": {"yes": "Ja", "none": "Nee"},
    },
    "foreign_worker": {
        "question": "Heb je een buitenlandse nationaliteit?",
        "short": "Buitenlandse nationaliteit",
        "options": {"yes": "Ja", "no": "Nee"},
    },
}

# Persona Damian (zie design-thinking/persona.md), vertaald naar de features.
DAMIAN = {
    "credit_amount": 3000,
    "duration": 48,
    "purpose": "used car",
    "checking_status": "0<=X<200",
    "savings_status": "<100",
    "employment": "<1",
    "installment_commitment": 4,
    "housing": "rent",
    "property_magnitude": "no known property",
    "other_payment_plans": "stores",
    "credit_history": "existing paid",
    "personal_status": "male single",
    "other_parties": "none",
    "residence_since": 1,
    "age": 24,
    "existing_credits": 1,
    "job": "skilled",
    "num_dependents": 1,
    "own_telephone": "yes",
    "foreign_worker": "no",
}


def to_model_row(values: dict, features: list[str]) -> dict:
    """Zet app-invoer (euro) om naar een rij in datasetformaat (DM)."""
    row = {}
    for f in features:
        v = values[f]
        if f == "credit_amount":
            v = float(v) * DM_PER_EUR
        elif f in NUMERIC:
            v = float(v)
        row[f] = v
    return row
