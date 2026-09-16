# HCAID: Kredietrisico

Human Centered AI Design project. We bouwen twee werkende apps op hetzelfde
kredietrisico-model: een goedaardige en een kwaadaardige. Over beide nemen we
een kritische, ethische stelling in.

## Het idee

Het model voorspelt kredietrisico, dus de kans dat iemand een lening niet
terugbetaalt (target `class`: good of bad).

- **Goedaardige app:** beschermt hoog-risico klanten. Waarschuwt dat een lening
  onbetaalbaar is en verwijst naar schuldhulp, of biedt eerlijke voorwaarden.
- **Kwaadaardige app:** exploiteert diezelfde voorspelling. Zoekt hoog-risico
  maar wanhopige mensen op en biedt ze juist een dure lening aan.

Zelfde model, zelfde data, zelfde voorspelling, tegengestelde bedoeling.

## Ethische risico's

- **Bias:** features als `age`, `personal_status` (geslacht) en `foreign_worker`
  hangen samen met beschermde kenmerken.
- **Privacy:** gevoelige financiele data om kwetsbaarheid in kaart te brengen.
- **Explainability:** kunnen we uitleggen waarom iemand geflagd wordt?

## Dataset

German Credit (via OpenML `credit-g`): 1000 rijen, 20 features, target good/bad.
Staat in `data/german_credit.csv`.

## Structuur

- `data/` de dataset
- notebooks en app-code volgen
