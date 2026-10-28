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
    </div>
  )
}
