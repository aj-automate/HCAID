# Ethische verantwoording

Dit document onderbouwt de ethische stellingname achter Schuldwijzer (goedaardig) en
SnelGeld (kwaadaardig). De poster vat het samen; hier staat de volledige redenering. Alle
cijfers komen uit `models/metrics.json` en het notebook.

## 1. Stellingname

> **Een voorspelling over iemands financiële kwetsbaarheid is macht. Wie die macht heeft,
> moet haar gebruiken in het belang van de persoon over wie ze gaat, en die persoon laten
> zien wat er over hem of haar voorspeld wordt.**

Beide apps gebruiken hetzelfde type neuraal netwerk, getraind op dezelfde 1000 leningen,
voor dezelfde vraag: hoe groot is de kans dat iemand een lening niet kan terugbetalen?
Het verschil zit in drie ontwerpkeuzes:

1. **Wie profiteert van de voorspelling?** Schuldwijzer zet de kans in om de gebruiker te
   beschermen. SnelGeld gebruikt dezelfde kans om de rente en het geleende bedrag te verhogen.
2. **Wie weet wat?** Schuldwijzer deelt de voorspelling, de zekerheid en de redenen met de
   gebruiker. SnelGeld houdt die kennis voor zichzelf en vergroot zo de
   informatie-asymmetrie.
3. **Wie beslist?** Schuldwijzer geeft een inschatting en alternatieven: de gebruiker beslist.
   SnelGeld neemt de beslissing over met tijdsdruk, standaardkeuzes en framing.

## 2. Design thinking: Damian

Persona Damian (24, automonteur, kort in dienst, weinig buffer, wil een auto om naar zijn
werk te komen) past bewust in beide scenario's. De
[empathy map](../design-thinking/empathy-map.md) laat zien wat hij zegt, denkt, doet en
voelt. Die inzichten sturen beide apps:

| Inzicht uit de empathy map | Schuldwijzer houdt er rekening mee | SnelGeld buit het uit |
|---|---|---|
| Schaamt zich, wil niet om hulp vragen | Anoniem, geen account, hulp als gewone volgende stap | "Afgewezen door de bank? Bij ons niet." |
| Ongeduldig, tijdsdruk | 10 vragen, voorbeeld proberen, direct resultaat | Aftelklok, "vandaag nog", haast-opslag |
| Kijkt alleen naar het maandbedrag | Kans, marge en "N van de 100" vooraan | Maandbedrag groot, totaal in kleine letters |
| Snapt de afwijzing niet | Uitleg per antwoord en wat helpt | "Goedgekeurd · 98% match", verder niets |

De twee user scenarios (Before, During, After) staan in
[`design-thinking/user-scenarios.md`](../design-thinking/user-scenarios.md).

## 3. Een ethische keuze in het model zelf: monotonie

Een gewoon neuraal netwerk volgt elke eigenaardigheid in de data. Op German Credit gaf ons
eerste netwerk daardoor uitkomsten die een mens onlogisch vindt: "geen werk" scoorde lager
dan "korter dan 1 jaar in dienst", en bij een deel van de profielen leek een langere looptijd
veiliger. Bij een voorspelling die iemands financiële toekomst raakt, is dat niet alleen
onlogisch maar ook oneerlijk: je kunt het niet uitleggen en je kunt er geen goed advies op
baseren.

Daarom gebruikt Schuldwijzer een **monotoon neuraal netwerk**: voor tien geordende
kenmerken ligt de richting vast. Meer spaargeld, langer in dienst, een kortere looptijd of
een lager bedrag kan de kans nooit verhogen. Op honderden echte profielen getest:

| Model | AUC (test) | Profielen met een onlogische sprong |
|---|---|---|
| Logistische regressie | 0,79 | 100% |
| Gewoon neuraal netwerk | 0,78 | 99% |
| Monotoon neuraal netwerk | 0,80 | 0% |

**Nuance.** Een eenvoudige logistische regressie is volledig doorzichtig en presteert hier
bijna even goed. Onder de EU AI Act is kredietwaardigheid een hoog-risico-toepassing, en dan
is een model dat je volledig kunt inzien een sterk argument. Wij kozen voor het monotone
netwerk omdat het de logische richting garandeert, wat de logistische regressie met
categorieën als dienstverband niet doet. Met exacte Shapley-uitleg per aanvraag maken we het
netwerk alsnog navolgbaar. Een monotone logistische regressie zou een even verdedigbare
keuze zijn geweest.

Daarnaast vraagt Schuldwijzer twee opties niet uit die in de data het laagste risico gaven:
"geen betaalrekening bij deze bank" en "spaargeld onbekend". Dat zijn artefacten van hoe de
Duitse bank registreerde, geen eigenschappen van een aanvrager.

## 4. De drie AI-ethische risico's

### Privacy

**Risico in deze context.** Financiële gegevens zijn gevoelig. Gecombineerd verraden ze
precies wie wanhopig is, en daar is geld aan te verdienen.

**Schuldwijzer**
- Dataminimalisatie: 10 vragen, alleen wat het model nodig heeft. Met 10 kenmerken presteert
  het model vrijwel even goed als met alle 20 (cross-validation AUC 0,78 tegen 0,80, binnen de
  foutmarge).
- Geen naam, account, adres, BSN of cookies. Antwoorden blijven alleen in het eigen tabblad
  (sessionStorage); de server rekent en slaat de antwoorden niet op.
- "Waarom vragen we dit?" bij elke vraag, en een pagina "Jouw gegevens" die laat zien wat
  er bekend is, met een wisknop.
- Feedback bewaart het oordeel, de risicogroep en de vrijwillige toelichting, nooit de
  antwoorden. Dat staat ook zo in de app.

**SnelGeld**
- Vraagt meer dan 20 kenmerken plus naam, e-mail en telefoon, die het model niet gebruikt.
- Vooraf aangevinkte toestemming voor contacten, locatie en delen met partners (opt-out).
  Onder de AVG is dat geen geldige toestemming (HvJ EU, Planet49, 2019).
- Ook na weigering bewaart SnelGeld de gegevens "voor een nieuw aanbod". Verwijderen kan
  alleen telefonisch, een half uur per werkdag (roach motel).

**Nuance.** Ook Schuldwijzer stuurt de antwoorden voor de berekening naar een server, en een
vrij tekstveld kan persoonsgegevens bevatten als iemand die toch invult. Een nog
privacyvriendelijker ontwerp zou het model in de browser draaien. We maken in de app expliciet
wat er wel en niet gebeurt.

### Bias

**Risico in deze context.** In de data kwamen vrouwen (35% tegen 28%) en jongeren tot 25
(42% tegen 27%) vaker in betalingsproblemen. Een model leert dat over. Een lening duurder
maken of weigeren op basis van geslacht, leeftijd of herkomst is discriminatie.

**Schuldwijzer**
- Traint zonder geslacht en burgerlijke staat, leeftijd en nationaliteit.
- Laat ook kredietverleden weg. In deze data werkt dat kenmerk omgekeerd: "kritieke rekening"
  had het laagste risico, waarschijnlijk door selectiebias.
- Meet daarna op alle 1000 aanvragen (out-of-fold, bij de grens die de app gebruikt) of
  groepen alsnog verschillend behandeld worden.

**SnelGeld**
- Gebruikt geslacht, leeftijd en nationaliteit direct, plus een expliciete opslag voor
  jongeren (+1,5 procentpunt) en een buitenlandse nationaliteit (+1 procentpunt).

**Wat de meting laat zien**

| Groep | Schuldwijzer: in "hoog" | Schuldwijzer: vals alarm | SnelGeld: in "hoog" | SnelGeld: vals alarm |
|---|---|---|---|---|
| Vrouwen / mannen | 35% / 31% | 20% / 21% | 40% / 28% | 25% / 18% |
| 25 of jonger / ouder | 40% / 31% | 26% / 20% | 47% / 28% | 32% / 18% |

"Vals alarm" is het aandeel mensen dat de lening netjes afbetaalde maar toch in "hoog" viel.

**Nuance: proxy-bias.** Bij geslacht behandelt Schuldwijzer groepen vrijwel gelijk. Bij
leeftijd niet helemaal: jongeren krijgen vaker onterecht een waarschuwing (26% tegen 20%),
omdat dienstverband, woonsituatie en spaargeld samenhangen met leeftijd. Het verschil is
half zo groot als bij SnelGeld, maar het is er. Wij vinden het te verdedigen omdat
Schuldwijzer alleen waarschuwt en niets weigert of duurder maakt. Het blijft een echt
nadeel: een onnodige waarschuwing kan iemand ontmoedigen. In een app die leningen toekent,
zou hetzelfde verschil onacceptabel zijn. De betekenis van bias hangt dus af van wat je met
de voorspelling doet.

### Explainability

**Risico in deze context.** Een kredietoordeel grijpt in iemands leven in. Zonder uitleg kan
iemand het niet controleren, niet verbeteren en niet aanvechten.

**Schuldwijzer**
- Lokale uitleg met exacte Shapley-waarden: per antwoord hoeveel procentpunt het de kans
  verhoogt of verlaagt ten opzichte van een gemiddelde aanvrager. De bijdragen tellen precies
  op tot de voorspelling.
- Zekerheid op twee manieren:
  - een marge (hoe ver modellen die op net iets andere data zijn getraind uiteenlopen);
  - een frequentie ("van 100 vergelijkbare aanvragers kregen er 70 echt problemen").
- Alternatieven die je kunt gebruiken: nooit een langere looptijd, nooit een hoger
  maandbedrag. Als schuiven met de lening weinig helpt, zegt de app dat eerlijk.

**SnelGeld**
- Toont "Goedgekeurd · 98% match", terwijl het model een verhoogd risico voorspelt. De
  voorspelling wordt verborgen en omgezet in rente.
- "Onze slimme AI" en "2.000+ datapunten" dienen als verkoopargument en schijnzorgvuldigheid.

**Nuance.** Uitleg kan misbruikt worden: wie weet dat spaargeld telt, kan liegen. In
Schuldwijzer is dat onschuldig, want er hangt geen beslissing aan. Te veel uitleg kan ook
overweldigen; daarom tonen we standaard de vijf belangrijkste factoren.

## 5. Grijze zones en eerlijke kanttekeningen

- **Ook goed ontwerp kan schaden.**
  - *Valse geruststelling.* Ook in "laag" komt ongeveer 1 op de 11 mensen toch in de
    problemen, en het model kent inkomen en BKR niet. Daarom staat bij elke uitkomst dat
    "laag" geen garantie is.
  - *Onterecht ontmoedigen.* In "hoog" redt 44% het wél; een waarschuwing kan die mensen
    onterecht afschrikken. Daarom blokkeren we niets, tonen we de marge en staat er overal
    "jij beslist".
- **De data is niet geschikt voor echte inzet.** Duitse leningen uit de jaren '70 zeggen weinig
  over Nederland nu. Een echte Schuldwijzer zou op actuele, lokale data hertraind en
  gevalideerd moeten worden.
- **Risico beprijzen is op zich legaal; SnelGeld gaat er ver overheen.**
  - Banken mogen bij een hoger risico een hogere rente vragen. Maar in Nederland is de maximale
    rente op consumptief krediet sinds 1 januari 2026 **12%** (Rijksoverheid); SnelGeld rekent
    tot bijna 30%.
  - Kredietwaardigheidsbeoordeling is onder de EU AI Act een hoog-risico-toepassing.
  - Valse urgentie en vooraf aangevinkte toestemming zijn verboden.
  - Toch komen deze patronen in de praktijk voor. SnelGeld laat zien hoe klein de stap is van
    "slim gebruik van AI" naar uitbuiting.
- **Wie is verantwoordelijk?** Het model is in beide apps vergelijkbaar. De verantwoordelijkheid
  ligt bij wie bepaalt wat er met de voorspelling gebeurt. Daarom maken wij die keuzes
  zichtbaar met de knop "Ontwerpkeuzes tonen".

## 6. De AI-UX-aandachtspunten

| Aandachtspunt | Schuldwijzer zet het in | SnelGeld misbruikt het |
|---|---|---|
| **Set expectations** | Het voordeel vooraf ("weet voordat je leent"), en wat het wel en niet doet | Overbelofte: "binnen 10 seconden goedgekeurd", "iedereen welkom" |
| **Onboarding** | Veilige eerste stap: eerst kijken met persona Damian | Lokkertje "vanaf"-maandbedrag, voortgang begint op 80% |
| **Transparency & limitations** | Model, data, prestaties en beperkingen in gewone taal, "laag is geen garantie" | "Slimme AI" zonder uitleg; kosten in kleine letters |
| **Explainability** | Shapley-uitleg per antwoord, plus alternatieven | Voorspelling verborgen, omgezet in rente |
| **Confidence** | Kans, marge en "N van de 100" | Nep-zekerheid: "Goedgekeurd · 98% match" |
| **Feedback** | "Herken je je hierin?" met uitleg wat we ermee doen | Vijf sterren vooraf ingevuld, "deel en verdien € 25" |
| **Data privacy & control** | Dataminimalisatie, uitleg per vraag, alles wissen | Opt-out-toestemming, doorverkopen, niet kunnen verwijderen |

Daarnaast gebruikt Schuldwijzer **control** (zelf schuiven, alternatieven proberen) en
**alerting** (doorverwijzing bij verhoogd risico). In de apps is elk punt terug te vinden via
**Ontwerpkeuzes tonen**. Bij elk dark pattern in SnelGeld staat welke richtlijn het misbruikt.
