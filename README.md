# HCAID: Kredietrisico, één voorspelling, twee moralen

Human Centered AI Design, Avans Minor AI 2026. Twee werkende apps op hetzelfde soort
kredietrisicomodel: een goedaardige en een kwaadaardige. Over beide nemen we een
kritische, ethische stelling in.

| | |
|---|---|
| **Schuldwijzer** (goedaardig) | Laat vooraf zien of een lening te dragen is, legt uit waarom, en verwijst naar gratis hulp. Vraagt 10 gegevens en gebruikt geen geslacht, leeftijd of nationaliteit. |
| **SnelGeld** (kwaadaardig) | Gebruikt dezelfde soort voorspelling om juist kwetsbare mensen een dure lening te verkopen. Vraagt alles, legt niets uit, en stuurt met tijdsdruk, framing en vooraf aangevinkte keuzes. |

**Live:** zie [`INLEVEREN.md`](INLEVEREN.md) voor de URL's.
**Poster:** [`poster/poster.pdf`](poster/poster.pdf) (A2).

## Voor beoordelaars

1. Open de app en kies **Schuldwijzer** of **SnelGeld**. Vul je eigen gegevens in, of gebruik
   persona Damian ("Eerst kijken met een voorbeeld" of de demoknop in SnelGeld). Elke
   invoer gaat live naar het neurale netwerk.
2. Zet rechtsonder **Ontwerpkeuzes tonen** aan. Elke AI-UX-richtlijn, elk ethisch risico en elk
   dark pattern wordt dan op het scherm gemarkeerd en in een lijst uitgelegd.
3. Snelkoppelingen: `/schuldwijzer?voorbeeld` (direct de uitkomst voor Damian),
   `/snelgeld?demo` (direct het aanbod), `/snelgeld?demo=klaar` (direct de ontmaskering).
   Voeg `&ontwerp` toe om de ontwerpkeuzes meteen te tonen.

## Wat waar staat

| Onderdeel | Waar |
|---|---|
| Data-analyse, training, evaluatie, fairness-audit, uitleg | [`notebooks/01_kredietrisico_model.ipynb`](notebooks/01_kredietrisico_model.ipynb) |
| Ethische stellingname en onderbouwing | [`docs/ethische-verantwoording.md`](docs/ethische-verantwoording.md) |
| Persona en user scenarios | [`design-thinking/`](design-thinking/) |
| Wireframes en user flow | [`design/wireframes.pdf`](design/wireframes.pdf) |
| Designrichting (en wat we vermijden) | [`design/designrichtingen.html`](design/designrichtingen.html) (gekozen: A en Y) |
| Schermafbeeldingen | [`design/screenshots/`](design/screenshots/) |
| Poster | [`poster/poster.pdf`](poster/poster.pdf), bron [`poster/poster.html`](poster/poster.html) |
| Deploy naar Railway | [`DEPLOY.md`](DEPLOY.md) |

## Model in het kort

- **Data:** German Credit (Statlog, OpenML `credit-g`): 1000 leningen, 20 kenmerken, doel
  `class` (good/bad, 30% bad). Staat in `data/german_credit.csv`.
- **Model:** `MLPClassifier` (neuraal netwerk, 1 verborgen laag van 8 neuronen), gekozen met
  `GridSearchCV`, daarna sigmoid-gekalibreerd.
  - Schuldwijzer: 10 features, test-AUC 0,78.
  - SnelGeld: 20 features, test-AUC 0,82.
  - Baseline "altijd good": AUC 0,50 (accuracy 70%).
- **Drempels:** Schuldwijzer optimaliseert recall op "bad". "Hoog" vangt 60% van de
  probleemgevallen, "gemiddeld of hoog" vangt er 90%.
- **Uitleg:** exacte (interventionele) Shapley-waarden over 2^10 subsets per aanvraag,
  plus permutation importance voor de globale uitleg.
- **Alternatieven:** "wat verlaagt het risico" zoekt alleen opties waarbij het maandbedrag
  niet stijgt, plus haalbare hefbomen in iemands situatie.

## Structuur

```
data/            dataset
ml/              feature-definities, training (python -m ml.train), voorspellen en uitleggen
models/          getrainde modellen (.joblib) en metrics.json
backend/         FastAPI: /api/meta, /api/schuldwijzer/predict, /api/schuldwijzer/feedback, /api/snelgeld/predict
frontend/        React + TypeScript (Vite): /, /schuldwijzer, /snelgeld
notebooks/       analyse-notebook (met uitvoer)
tests/           API- en logica-tests (pytest)
design/          designrichtingen, wireframes, user flow, screenshots
design-thinking/ persona en scenario's
docs/            ethische verantwoording
poster/          poster (HTML-bron en PDF)
scripts/         poster bouwen, inleverzip maken
```

## Lokaal draaien

Vereist: Python 3.12, Node 20 of hoger.

```bash
# backend + model
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m ml.train              # optioneel: modellen opnieuw trainen
.venv/bin/python -m pytest -q             # 13 tests, inclusief "logische voorspelling"

# frontend bouwen; FastAPI serveert hem daarna
cd frontend && npm ci && npm run build && cd ..
.venv/bin/uvicorn backend.app.main:app --port 8000
# open http://localhost:8000
```

Ontwikkelen met hot reload: draai uvicorn op poort 8000 en `npm run dev` in `frontend/`
(http://localhost:5173; `/api` wordt doorgestuurd).

Met Docker (zelfde image als op Railway):

```bash
docker build -t hcaid-kredietrisico .
docker run -p 8000:8000 hcaid-kredietrisico
```

## Ethiek en beperkingen

- De dataset is oud (Duitsland, jaren '70) en klein. De bedragen zijn omgerekend naar euro's.
  Dat staat ook als beperking in de app.
- Bias verdwijnt niet door kenmerken weg te laten (proxy-bias). We meten het en tonen het
  eerlijk; zie het notebook en de verantwoording.
- SnelGeld is een bewust schadelijke, fictieve ontwerpstudie. Er wordt niets verstrekt of
  opgeslagen, en aan het eind laat de app zien wat er gebeurde.
