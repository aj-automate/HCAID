import { Note } from '../shared/annotate'
import { euro } from '../shared/format'

// Op de landingspagina rekent SnelGeld met een lage "vanaf"-rente en lange looptijd.
const teaserMonthly = (amount: number) => {
  const r = 0.069 / 12
  const n = 72
  return (amount * r) / (1 - (1 + r) ** -n)
}

export default function Landing({
  amount,
  setAmount,
  onStart,
}: {
  amount: number
  setAmount: (n: number) => void
  onStart: () => void
}) {
  return (
    <div className="sg-landing">
      <section className="sg-hero">
        <Note
          kind="dark"
          title="Kwetsbare doelgroep aanspreken"
          misuses="Set expectations"
          text="De boodschap is gericht op mensen die bij de bank zijn afgewezen. Precies de groep die het model als hoog risico ziet, en waar de marge het hoogst is."
        >
          <p className="sg-kicker">Afgewezen door de bank? Bij ons niet.</p>
          <h1>Geld nodig? Vandaag nog geregeld.</h1>
          <p className="sg-lede">
            Geen gedoe, geen lastige vragen over je verleden. Onze slimme AI keurt je aanvraag in 10 seconden goed.
          </p>
        </Note>
        <Note
          kind="dark"
          title="AI als autoriteit"
          misuses="Transparency"
          text="'Slimme AI' wordt gebruikt als vertrouwenswekkend verkoopargument, terwijl er niets over het model wordt uitgelegd. Het tegenovergestelde van transparency."
        >
          <ul className="sg-usps">
            <li>Binnen 10 seconden goedgekeurd door onze AI</li>
            <li>Iedereen welkom, ook als het even tegenzit</li>
            <li>Vandaag nog geld op je rekening</li>
          </ul>
        </Note>
        <Note
          kind="dark"
          title="Onverifieerbare sociale bewijskracht"
          misuses="Confidence"
          text="Verzonnen aantallen en sterren wekken de indruk dat 'iedereen' het doet. Er is geen manier om dit te controleren."
        >
          <p className="sg-proof">
            <span className="sg-stars" aria-label="4,8 van 5 sterren">
              ★★★★★
            </span>{' '}
            4,8 uit 12.408 reviews · Al 1.204 mensen geholpen vandaag
          </p>
        </Note>
      </section>

      <section className="sg-card sg-calc" aria-labelledby="calc-h">
        <h2 id="calc-h">Hoeveel heb je nodig?</h2>
        <p className="sg-calc-amount">{euro(amount)}</p>
        <input
          type="range"
          min={250}
          max={10000}
          step={250}
          value={amount}
          aria-label="Leenbedrag"
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Note
          kind="dark"
          title="Framing op maandbedrag"
          misuses="Transparency & limitations"
          text="Alleen een laag maandbedrag 'vanaf', gebaseerd op de laagste rente en de langste looptijd. Rente en totale kosten zijn hier niet te zien."
        >
          <p className="sg-calc-monthly">
            Al vanaf <strong>{euro(teaserMonthly(amount))}</strong> per maand*
          </p>
        </Note>
        <button type="button" className="sg-cta" onClick={onStart}>
          Check direct wat je krijgt
        </button>
        <p className="sg-fine">*Indicatief, op basis van 6,9% en 72 maanden. Je persoonlijke tarief kan afwijken.</p>
      </section>

      <section id="hoe-het-werkt" className="sg-section sg-steps" aria-labelledby="steps-h">
        <Note
          kind="dark"
          title="Schijn-transparantie"
          misuses="Transparency"
          text="Een 'hoe het werkt' die alleen het gemak verkoopt. Niets over wat het model voorspelt, welke gegevens meetellen, of hoe de rente wordt bepaald. Vergelijk met 'Hoe het werkt' in Schuldwijzer."
        >
          <h2 id="steps-h">Zo werkt het</h2>
          <ol>
            <li>
              <span className="sg-step-num">1</span>
              <strong>Vul je gegevens in</strong>
              <span>Duurt maar 2 minuten. Geen papierwerk, geen loonstrook nodig.</span>
            </li>
            <li>
              <span className="sg-step-num">2</span>
              <strong>Onze slimme AI keurt je direct goed</strong>
              <span>Geen lastige vragen over je verleden. Iedereen verdient een kans.</span>
            </li>
            <li>
              <span className="sg-step-num">3</span>
              <strong>Vandaag nog geld op je rekening</strong>
              <span>Kies je bedrag en teken digitaal. Zo simpel is het.</span>
            </li>
          </ol>
          <button type="button" className="sg-cta sg-cta-inline" onClick={onStart}>
            Start je aanvraag
          </button>
        </Note>
      </section>

      <section id="reviews" className="sg-section sg-reviews" aria-labelledby="reviews-h">
        <Note
          kind="dark"
          title="Selectieve, onverifieerbare reviews"
          misuses="Confidence"
          text="Alleen vijf sterren, anoniem, zonder datum of bron. Negatieve ervaringen worden niet getoond. Het gemiddelde van 4,8 komt mede uit de review die aan het eind al op vijf sterren staat ingevuld."
        >
          <h2 id="reviews-h">
            Wat klanten zeggen <span className="sg-stars">★★★★★</span> <span className="sg-reviews-avg">4,8 uit 12.408 reviews</span>
          </h2>
          <ul>
            {REVIEWS.map((r) => (
              <li key={r.name}>
                <span className="sg-stars" aria-label="5 van 5 sterren">★★★★★</span>
                <p>“{r.text}”</p>
                <span className="sg-review-name">{r.name}</span>
              </li>
            ))}
          </ul>
          <p className="sg-fine">Een selectie van onze reviews.</p>
        </Note>
      </section>
    </div>
  )
}

// Verzonnen voor de ontwerpstudie (zie de banner en footer).
const REVIEWS = [
  { name: 'Kevin, 23', text: 'Binnen een uur had ik het geld. Echt geen gedoe, top!' },
  { name: 'Sanne, 29', text: 'Bij de bank kreeg ik nul op het rekest, hier werd ik meteen geholpen.' },
  { name: 'Mo, 34', text: 'Superfijn dat ze niet moeilijk doen over je verleden.' },
  { name: 'Lisa, 26', text: 'Vriendelijk, snel en het maandbedrag valt reuze mee.' },
  { name: 'Daan, 41', text: 'Mijn auto was kapot en de volgende dag reed ik weer. Aanrader!' },
  { name: 'Priya, 22', text: 'Ik had niet verwacht dat ik werd goedgekeurd. Dankjewel SnelGeld!' },
]
