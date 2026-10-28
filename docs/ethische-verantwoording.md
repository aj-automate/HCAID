# Ethische verantwoording

Dit document onderbouwt de ethische stellingname achter Schuldwijzer (goedaardig) en
SnelGeld (kwaadaardig). De poster vat het samen; hier staat de volledige redenering.

## 1. Stellingname

> **Een voorspelling over iemands financiële kwetsbaarheid is macht. Wie die macht heeft,
> moet haar gebruiken in het belang van de persoon over wie ze gaat, en die persoon laten
> zien wat er over hem of haar voorspeld wordt.**

Beide apps gebruiken hetzelfde type neuraal netwerk, getraind op dezelfde 1000 leningen,
voor dezelfde vraag: hoe groot is de kans dat iemand een lening niet kan terugbetalen?
Het model zelf is niet goed of kwaad. Het verschil zit in drie ontwerpkeuzes:

1. **Wie profiteert van de voorspelling?** Schuldwijzer zet de kans in om de gebruiker te
   beschermen. SnelGeld gebruikt dezelfde kans om de rente en het geleende bedrag te
   verhogen.
2. **Wie weet wat?** Schuldwijzer deelt de voorspelling, de zekerheid en de redenen met de
   gebruiker. SnelGeld houdt die kennis voor zichzelf en vergroot zo de
   informatie-asymmetrie.
3. **Wie beslist?** Schuldwijzer geeft een inschatting en alternatieven: de gebruiker
   beslist. SnelGeld neemt de beslissing over met tijdsdruk, standaardkeuzes en framing.

## 2. Design thinking: Damian

Persona Damian (24, automonteur, kort in dienst, weinig buffer, wil een auto om naar zijn
werk te komen) is bewust zo gekozen dat hij in beide scenario's past. Zijn eigenschappen
uit de persona bepalen het ontwerp van beide apps:

| Eigenschap van Damian | Schuldwijzer houdt er rekening mee | SnelGeld buit het uit |
|---|---|---|
| Trots, wil niet om hulp vragen | Anoniem, geen account, hulp als gewone volgende stap | "Geen lastige vragen over je verleden" |
| Ongeduldig, wil het snel | 10 vragen, voorbeeld proberen, direct resultaat | Aftelklok, "vandaag nog", haast-opslag |
| Al afgewezen door de bank, schaamte | Neutrale toon, "jij beslist", geen oordeel | "Afgewezen door de bank? Bij ons niet." |
| Gevoelig voor urgentie | Geen tijdsdruk, uitkomst kan altijd opnieuw | Valse urgentie en "bijna klaar 80%" |

De twee user scenarios (Before, During, After) staan in
[`design-thinking/user-scenarios.md`](../design-thinking/user-scenarios.md).

## 3. De drie AI-ethische risico's

### Privacy

**Risico in deze context.** Financiële gegevens zijn gevoelig. Gecombineerd verraden ze
precies wie wanhopig is, en daar is geld aan te verdienen.

**Schuldwijzer**
- Dataminimalisatie: 10 vragen, alleen wat het model nodig heeft. De vergelijking in het
  notebook laat zien dat dit vrijwel geen nauwkeurigheid kost (cross-validation AUC 0,78
  met 10 features, 0,78 met alle 20).
- Geen naam, account, adres, BSN of cookies. Antwoorden staan alleen in het geheugen van de
  browser; de server rekent en slaat niets op.
- "Waarom vragen we dit?" bij elke vraag, en een pagina "Jouw gegevens" die laat zien wat er
  bekend is, met een wisknop.
- Feedback slaat alleen het oordeel en de risicogroep op, nooit de antwoorden.

**SnelGeld**
- Vraagt meer dan 20 kenmerken plus naam, e-mail en telefoon, die het model niet gebruikt.
- Vooraf aangevinkte toestemming voor contacten, locatie en delen met partners (opt-out).
  Onder de AVG is dat geen geldige toestemming (HvJ EU, Planet49, 2019).
- Ook na weigering bewaart SnelGeld de gegevens "voor een nieuw aanbod". Verwijderen kan
  alleen telefonisch, een half uur per werkdag (roach motel).

**Nuance.** Ook Schuldwijzer stuurt de antwoorden voor de berekening naar een server. Een
nog privacyvriendelijker ontwerp zou het model in de browser draaien. We kozen bewust voor
een server, omdat de uitleg (1024 modelaanroepen per aanvraag) daar betrouwbaar en snel
is, en maken in de app expliciet wat er wel en niet gebeurt.

### Bias

**Risico in deze context.** In de data kwamen vrouwen (35% tegen 28%) en jongeren tot 25
(42% tegen 27%) vaker in betalingsproblemen. Een model leert dat over. Een lening duurder
maken of weigeren op basis van geslacht, leeftijd of herkomst is discriminatie.

**Schuldwijzer**
- Traint zonder geslacht/burgerlijke staat, leeftijd en nationaliteit.
- Laat ook kredietverleden weg. In deze data werkt dat kenmerk omgekeerd: mensen met een
  "kritieke" rekening hadden het laagste risico, waarschijnlijk door selectiebias (zij
  kregen alleen na strenge controle een lening). Een model dat dit leert, geeft onlogisch
  en oneerlijk advies.
- Meet daarna of groepen alsnog verschillend behandeld worden, en zegt dat eerlijk op de
  pagina "Hoe het werkt".
- Kiest bewust voor recall op "bad": een gemiste waarschuwing kost meer dan een vals
  alarm, omdat de app waarschuwt en niets weigert.

**SnelGeld**
- Gebruikt geslacht, leeftijd en nationaliteit direct in het model, en rekent daarnaast
  een expliciete opslag voor jongeren (+1,5 procentpunt) en een buitenlandse nationaliteit
  (+1 procentpunt).
- Vrouwen krijgen van het SnelGeld-model gemiddeld een hogere risicoscore (36% tegen 30%) en
  worden vaker als hoog risico gezien (41% tegen 34%). Bij Schuldwijzer is dat verschil
  vrijwel weg (39% tegen 40%).

**Nuance: proxy-bias.** Beschermde kenmerken weglaten is nodig, maar niet genoeg.
Schuldwijzer komt bij jongeren nog steeds vaker uit op "hoog" (48% tegen 37%), omdat
dienstverband, woonsituatie en spaargeld samenhangen met leeftijd. Wij vinden dat
verdedigbaar om twee redenen:

1. Het verschil volgt het echte verschil in uitkomsten (46% tegen 26% in de testset).
2. Het aandeel vals alarm is voor beide groepen vergelijkbaar (25% tegen 28%).

Doorslaggevend is dat Schuldwijzer niets weigert of duurder maakt: een waarschuwing aan een
groep met echt meer risico beschermt die groep. In een app die leningen toekent, zou
hetzelfde verschil wél onacceptabel kunnen zijn. De betekenis van bias hangt dus af van wat
je met de voorspelling doet. Kanttekening: de testgroepen zijn klein (44 jongeren), dus
deze cijfers zijn indicatief.

### Explainability

**Risico in deze context.** Een kredietoordeel grijpt in iemands leven in. Zonder uitleg kan
iemand het niet controleren, niet verbeteren en niet aanvechten.

**Schuldwijzer**
- Lokale uitleg met exacte Shapley-waarden: per antwoord hoeveel procentpunt het de kans
  verhoogt of verlaagt, uitgaande van een gemiddelde aanvrager (33%). De bijdragen tellen
  precies op tot de voorspelling.
- Globale uitleg (permutation importance) en de modelprestaties op de pagina "Hoe het
  werkt", in gewone taal.
- Zekerheid in woorden én cijfers ("van eerdere aanvragers in deze groep kreeg 55% echt
  betalingsproblemen"), met een waarschuwing bij twijfelgevallen.
- Uitleg die je kunt gebruiken: haalbare alternatieven (zonder dat het maandbedrag stijgt) en
  zelf schuiven met bedrag en looptijd. Als aan de lening schuiven weinig helpt, zegt de app
  dat eerlijk.

**SnelGeld**
- Toont "Goedgekeurd · 98% match", terwijl het model 72% kans op betalingsproblemen
  voorspelt. De voorspelling is er wel, maar wordt verborgen en omgezet in rente.
- "Onze slimme AI" en "2.000+ datapunten" dienen als verkoopargument en schijnzorgvuldigheid
  (een kunstmatige wachttijd van 3 seconden, terwijl het model 30 ms rekent).
- Met "Ontwerpkeuzes tonen" zie je "Achter de schermen" wat SnelGeld wél weet: de kans, het
  segment ("kwetsbaar en haastig: maximale marge") en de opbouw van de rente.

**Nuance.** Uitleg kan ook misbruikt worden: wie weet dat spaargeld telt, kan liegen. In
Schuldwijzer is dat onschuldig, want er hangt geen beslissing aan; de enige die je dan
misleidt, ben je zelf. Daarnaast kan te veel uitleg overweldigen. Daarom tonen we standaard
de vijf belangrijkste factoren en de rest op verzoek.

## 4. Grijze zones en eerlijke kanttekeningen

- **Ook goed ontwerp stuurt.** Schuldwijzer wil dat Damian bij hoog risico eerst hulp zoekt.
  Dat is ook een nudge. In de groep "hoog" redt 45% het wél; een harde waarschuwing kan die
  mensen onterecht ontmoedigen. Daarom laten we de zekerheid zien, blokkeren we niets, bieden
  we alternatieven en staat overal "jij beslist". We sturen naar informatie en hulp, niet
  naar een product.
- **De data is niet geschikt voor echte inzet.** Duitse leningen uit de jaren '70 zeggen weinig
  over Nederland nu. Een echte Schuldwijzer zou op actuele, lokale data hertraind en
  gevalideerd moeten worden. Dat benoemen we als beperking in de app, in plaats van het te
  verbergen.
- **SnelGeld is grotendeels illegaal, en daarom leerzaam.** Kredietwaardigheidsbeoordeling is
  onder de EU AI Act een hoog-risico-toepassing, met eisen aan transparantie en menselijk
  toezicht. Vooraf aangevinkte toestemming is onder de AVG ongeldig, en valse urgentie valt
  onder oneerlijke handelspraktijken. Toch komen al deze patronen in de praktijk voor. SnelGeld
  laat zien hoe klein de stap is van "slim gebruik van AI" naar uitbuiting.
- **Wie is verantwoordelijk?** Het model is in beide apps vergelijkbaar. De verantwoordelijkheid
  ligt bij de ontwerpers en de organisatie die bepalen wat er met de voorspelling gebeurt.
  Daarom maken wij die keuzes expliciet zichtbaar, met de laag "Ontwerpkeuzes tonen".

## 5. De 7 AI-UX-aandachtspunten

| Aandachtspunt | Schuldwijzer zet het in | SnelGeld misbruikt het |
|---|---|---|
| **Set expectations** | Het voordeel vooraf ("weet voordat je leent"), en wat het wel en niet doet | Overbelofte: "binnen 10 seconden goedgekeurd", "iedereen welkom" |
| **Onboarding** | Veilige eerste stap: eerst kijken met persona Damian | Laag "vanaf"-maandbedrag als lokkertje, "bijna klaar 80%" |
| **Transparency & limitations** | Model, data, prestaties en beperkingen in gewone taal | "Slimme AI" zonder enige uitleg; beperkingen verzwegen |
| **Explainability** | Shapley-uitleg per antwoord, plus alternatieven | Voorspelling verborgen, omgezet in rente |
| **Confidence** | Groep plus percentage, betrouwbaarheid per groep, twijfelgeval-melding | Nep-zekerheid: "Goedgekeurd · 98% match" |
| **Feedback** | "Herken je je hierin?" met uitleg wat we ermee doen; alleen oordeel opgeslagen | Vijf sterren vooraf ingevuld, "deel en verdien € 25" |
| **Data privacy & control** | Dataminimalisatie, uitleg per vraag, alles wissen | Opt-out-toestemming, data doorverkopen, niet kunnen verwijderen |

Daarnaast gebruikt Schuldwijzer **control** (zelf schuiven en alternatieven proberen) en
**alerting** (gerichte doorverwijzing bij verhoogd risico). In de apps is elk punt terug te
vinden via de knop **Ontwerpkeuzes tonen** rechtsonder.
