# HCAID: Kredietrisico, één voorspelling, twee moralen

Human Centered AI Design, Avans Minor AI 2026. Jur Kiestra en Peter van Berkum.
Twee werkende apps op hetzelfde soort
kredietrisicomodel: een goedaardige en een kwaadaardige. Over beide nemen we een
kritische, ethische stelling in.

| | |
|---|---|
| **Schuldwijzer** (goedaardig) | Laat vooraf zien of een lening te dragen is, legt uit waarom, en verwijst naar gratis hulp. Vraagt 10 gegevens en gebruikt geen geslacht, leeftijd of nationaliteit. |
| **SnelGeld** (kwaadaardig) | Gebruikt dezelfde soort voorspelling om juist kwetsbare mensen een dure lening te verkopen. Vraagt alles, legt niets uit, en stuurt met tijdsdruk, framing en vooraf aangevinkte keuzes. |

**Live:** https://hcaid-production.up.railway.app (beveiligd met een wachtwoord; dat staat alleen in de inlevering).
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
| Persona, empathy map en user scenarios | [`design-thinking/`](design-thinking/) |
| Wireframes en user flow | [`design/wireframes.pdf`](design/wireframes.pdf) |
| Designrichting (en wat we vermijden) | [`design/designrichtingen.html`](design/designrichtingen.html) (gekozen: A en Y) |
| Schermafbeeldingen | [`design/screenshots/`](design/screenshots/) |
| Poster | [`poster/poster.pdf`](poster/poster.pdf), bron [`poster/poster.html`](poster/poster.html) |
| Deploy naar Railway | [`DEPLOY.md`](DEPLOY.md) |

## Model in het kort

- **Data:** German Credit (Statlog, OpenML `credit-g`): 1000 leningen, 20 kenmerken, doel
  `class` (good/bad, 30% bad). Staat in `data/german_credit.csv`.
- **Model:** een eigen **monotoon neuraal netwerk** (`ml/monotone.py`): één verborgen laag (tanh),
  scikit-learn-compatibel. Voor tien geordende kenmerken (looptijd, bedrag, saldo, spaargeld,
  dienstverband, ...) ligt de richting vast via teken-beperkte gewichten. Meer spaargeld of een
  kortere looptijd kan de kans dus nooit verhogen.
  - Gekozen met `GridSearchCV`, daarna sigmoid-gekalibreerd.
  - Schuldwijzer (10 features): test-AUC 0,80. SnelGeld (20 features): test-AUC 0,82.
  - Ter vergelijking: logistische regressie 0,79 en een gewoon `MLPClassifier`-netwerk 0,78.
    Beide maken bij vrijwel elk profiel onlogische sprongen; het monotone netwerk bij geen enkel
    (`ml/checks.py`, getest in `tests/test_api.py`).
- **Drempels:** Schuldwijzer optimaliseert recall op "bad". "Hoog" vangt 60% van de
  probleemgevallen, "gemiddeld of hoog" vangt er 90%.
- **Zekerheid:** een marge uit een bootstrap-ensemble van 8 netwerken, plus "N van de 100": hoeveel
  van de 100 eerdere aanvragers met de dichtstbijzijnde (out-of-fold) kans echt problemen kregen.
- **Uitleg:** exacte (interventionele) Shapley-waarden over 2^10 subsets per aanvraag, plus
  permutation importance voor de globale uitleg.
- **Alternatieven:** "wat verlaagt het risico" stelt nooit een langere looptijd of een hoger
  maandbedrag voor, plus haalbare hefbomen in iemands situatie.
- **Fairness:** gemeten op alle 1000 aanvragen (out-of-fold) bij de grens die de app gebruikt.

## Structuur

```
data/            dataset
ml/              features, monotoon netwerk, training (python -m ml.train), monotoniecheck, uitleg
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
.venv/bin/python -m pytest -q             # 18 tests, inclusief monotonie op honderden profielen

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
- Bias verdwijnt niet door kenmerken weg te laten. Bij leeftijd blijft proxy-bias: jongeren krijgen
  vaker onterecht een waarschuwing. We meten het en tonen het eerlijk; zie het notebook en de
  verantwoording.
- SnelGeld is een bewust schadelijke, fictieve ontwerpstudie. Er wordt niets verstrekt of
  opgeslagen, en aan het eind laat de app zien wat er gebeurde.
