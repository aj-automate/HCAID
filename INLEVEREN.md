# Inleveren HCAID: Kredietrisico

**Team:** Jur Kiestra & [naam duopartner]
**Inleverdatum:** 4 november 2026

## Gedeployde apps

| App | URL |
|---|---|
| Startpagina | [URL na deploy] |
| Schuldwijzer (goedaardig) | [URL na deploy]/schuldwijzer |
| SnelGeld (kwaadaardig) | [URL na deploy]/snelgeld |

Snel testen: `/schuldwijzer?voorbeeld` en `/snelgeld?demo`. Zet rechtsonder
**Ontwerpkeuzes tonen** aan om alle AI-UX-richtlijnen, ethische keuzes en dark patterns
gemarkeerd te zien.

## Inhoud van de inlevering

1. `HCAID-Kredietrisico-broncode.zip`: de volledige broncode (model, API, beide apps,
   notebook, tests, design, poster-bron). Zie `README.md` in de zip.
2. `HCAID-Kredietrisico-poster.pdf`: de poster (A2).

## Hoe de rubric terug te vinden is

| Criterium | Weging | Bewijs |
|---|---|---|
| Interactief prototype met logische ML-voorspelling | 40% | Beide apps live; neuraal netwerk (`ml/train.py`); tests op logische richting (`tests/test_api.py`); notebook |
| Ethiek en poster (Privacy, Bias, Explainability) | 40% | Poster; `docs/ethische-verantwoording.md`; fairness-audit in het notebook; "Ontwerpkeuzes tonen" in de apps |
| UX (onboarding, limitations, transparency, confidence, feedback, data privacy) | 20% | Schuldwijzer zet ze allemaal in, SnelGeld misbruikt ze; wireframes in `design/wireframes.pdf` |
