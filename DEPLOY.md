# Deploy naar Railway

**Live:** https://hcaid-production.up.railway.app (Railway-project `harmonious-perception`, service `HCAID`, branch `main`).

De app draait als één service: de Dockerfile bouwt de React-frontend en start FastAPI, die
zowel de API als de frontend serveert. Lokaal getest met `docker build` en `docker run`.

## Wat al klaarstaat

- `Dockerfile`: multi-stage build (Node 22 voor de frontend, Python 3.12 voor de API).
  Luistert op `$PORT`, die Railway zelf zet.
- `railway.json`: builder `DOCKERFILE`, healthcheck op `/login` (het enige openbare pad), herstart bij fouten.
- Wachtwoordpoort (`backend/app/auth.py`): alles behalve het loginscherm vraagt om een geldige sessie.
- `.dockerignore`: houdt notebooks, poster, design en `.venv` buiten de image.
- De getrainde modellen (`models/*.joblib`) staan in git. Er wordt bij de deploy dus niet
  opnieuw getraind.

## Stappen

1. Push de branch naar GitHub (`jurajautomate/HCAID`).
2. In Railway: **New Project** → **Deploy from GitHub repo** → kies `HCAID`.
3. **Root Directory** laat je leeg: de `Dockerfile` staat in de root van de repo. Kies bij
   **Settings → Source → Branch** de branch die je wilt deployen (`eindopdracht`, of `main`
   na het mergen).
4. Railway herkent `railway.json` en bouwt met de Dockerfile. Zet bij **Variables** één
   variabele: `APP_PASSWORD` met de waarde uit `.secrets/app_password.txt` (lokaal, niet in
   git). Zonder deze variabele start de server bewust niet.
5. **Settings → Networking → Generate Domain**. Je krijgt een URL als
   `https://hcaid-kredietrisico-production.up.railway.app`.
6. Controleer:
   - `<url>/` en `<url>/api/health` sturen je zonder login naar het loginscherm of geven 401
   - na inloggen geeft `<url>/api/health` `{"status":"ok"}`
   - `<url>/schuldwijzer?voorbeeld` toont de uitkomst voor Damian
   - `<url>/snelgeld?demo` toont het aanbod
7. Zet de URL in `poster/poster.html` (het element met `data-edit="url"`) en in
   `INLEVEREN.md`. Draai daarna `scripts/build_poster.sh`, commit en push. Railway deployt
   automatisch opnieuw.

## Opmerkingen

- Feedback uit Schuldwijzer wordt in `feedback/schuldwijzer.jsonl` in de container
  geschreven. Op Railway is dat bestandssysteem tijdelijk, dus de tellers beginnen na elke
  deploy opnieuw. Voor een prototype is dat bewust zo gelaten; wie dit wil bewaren, koppelt een
  Railway Volume aan `/app/feedback`.
- Kosten: één kleine service, ruim binnen het gratis of hobby-tegoed.
