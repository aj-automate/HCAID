# Frontend

React + TypeScript (Vite). Bevat drie routes:

- `/` projectpagina
- `/schuldwijzer` de goedaardige app (richting A, "publieke dienst")
- `/snelgeld` de kwaadaardige app (richting Y, "vriendelijke valkuil")

```bash
npm ci
npm run dev     # http://localhost:5173, /api wordt doorgestuurd naar FastAPI op :8000
npm run build   # bouwt naar dist/, wordt door FastAPI geserveerd
```

`src/shared/annotate.tsx` bevat de laag "Ontwerpkeuzes tonen" die per element de
AI-UX-richtlijn, het ethische risico of het dark pattern markeert.
