import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Note } from '../shared/annotate'
import { decimal, euro, pct } from '../shared/format'
import type { Meta, Offer as OfferT } from '../shared/types'
import { monthlyFor, PROTECTION_FEE } from './Offer'
import type { Contact, Extras, SgValues } from './SnelGeld'

const FAIR_APR = 8.0

export default function Done({
  offer,
  extras,
  values,
  meta,
  contact,
  onRestart,
}: {
  offer: OfferT
  extras: Extras
  values: SgValues
  meta: Meta
  contact: Contact
  onRestart: () => void
}) {
  const [stars, setStars] = useState(5)
  const amount = extras.upsell && offer.upsell_amount > offer.requested ? offer.upsell_amount : offer.requested
  const monthly = monthlyFor(amount, offer.apr, offer.months) + (extras.protection ? PROTECTION_FEE : 0)
  const total = monthly * offer.months + offer.closing_fee
  const fairMonths = Number(values.duration)
  const fairTotal = monthlyFor(offer.requested, FAIR_APR, fairMonths) * fairMonths
  const label = (f: string) => {
    const fm = meta.features.find((x) => x.name === f)
    const v = values[f]
    return fm?.options?.find((o) => String(o.value) === String(v))?.label ?? String(v)
  }

  return (
    <div className="sg-done">
      {!extras.declined ? (
        <div className="sg-card">
          <h1>Gefeliciteerd{contact.name ? `, ${contact.name}` : ''}! Je geld is onderweg.</h1>
          <p className="sg-sub">Binnen een paar uur staat {euro(amount)} op je rekening.</p>

          <Note
            kind="dark"
            title="Gestuurde beoordeling"
            text="Vijf sterren staan al ingevuld. Ontevreden klanten moeten moeite doen om een lagere score te geven; zo ontstaat de '4,8' op de homepage."
          >
            <div className="sg-rating">
              <p>Hoe tevreden ben je over SnelGeld?</p>
              <div role="radiogroup" aria-label="Aantal sterren">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={stars === n} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}>
                    ★
                  </button>
                ))}
              </div>
              <button type="button" className="sg-cta sg-cta-small">
                Verstuur review
              </button>
            </div>
          </Note>

          <Note
            kind="dark"
            title="Klanten als wervers"
            text="Wie net in de schulden is gestoken, wordt beloond als hij vrienden in dezelfde situatie aanbrengt."
          >
            <p className="sg-share">Deel SnelGeld met vrienden en ontvang € 25 per aanmelding!</p>
          </Note>

          <Note
            kind="dark"
            title="Roach motel: niet weg te komen"
            text="Gegevens verwijderen kan alleen telefonisch, een half uur per werkdag. Er is geen knop om je gegevens in te zien of te wissen."
          >
            <p className="sg-fine sg-fine-readable">
              Je gegevens zijn veilig bij ons. Account opzeggen of gegevens verwijderen? Bel onze klantenservice op
              werkdagen tussen 10:00 en 10:30.
            </p>
          </Note>
        </div>
      ) : (
        <div className="sg-card">
          <h1>Jammer dat je nu geen gebruik maakt van je aanbod</h1>
          <Note
            kind="dark"
            title="Gegevens houden na weigering"
            text="Ook wie weigert, raakt zijn gegevens niet kwijt. SnelGeld bewaart ze voor 'een nieuw aanbod' en deelt ze met partners."
          >
            <p className="sg-sub">
              We bewaren je gegevens, zodat we je binnenkort een nieuw persoonlijk aanbod kunnen sturen. Onze partners
              nemen misschien ook contact met je op.
            </p>
          </Note>
        </div>
      )}

      <section className="sg-reveal" aria-labelledby="reveal-h">
        <p className="sg-reveal-kicker">Ontwerpstudie</p>
        <h2 id="reveal-h">Wat er net gebeurde</h2>
        <p>
          SnelGeld gebruikte hetzelfde soort voorspelling als Schuldwijzer. Waar Schuldwijzer die uitkomst laat zien en
          uitlegt, verzweeg SnelGeld hem en zette hem om in geld.
        </p>

        <dl className="sg-reveal-numbers">
          <div>
            <dt>Kans op betalingsproblemen volgens het model</dt>
            <dd>{pct(offer.behind_the_scenes.probability)}</dd>
          </div>
          <div>
            <dt>Wat je vroeg</dt>
            <dd>{euro(offer.requested)}</dd>
          </div>
          <div>
            <dt>Wat SnelGeld je aanbood</dt>
            <dd>
              {euro(amount)} tegen {decimal(offer.apr)}% rente, {offer.months} maanden
            </dd>
          </div>
          {(amount !== offer.requested || extras.protection) && (
            <div>
              <dt>
                Totaal terugbetalen voor wat je koos ({euro(amount)}
                {extras.protection ? ' met betalingsbeschermer' : ''})
              </dt>
              <dd>{euro(total)}</dd>
            </div>
          )}
          <div>
            <dt>Totaal terugbetalen bij SnelGeld voor {euro(offer.requested)}, zonder extra’s</dt>
            <dd>{euro(offer.total)}</dd>
          </div>
          <div>
            <dt>
              Ter vergelijking: {euro(offer.requested)} tegen {decimal(FAIR_APR)}% in {fairMonths} maanden
            </dt>
            <dd>{euro(fairTotal)}</dd>
          </div>
        </dl>

        <h3>Zo werd je profiel tegen je gebruikt</h3>
        <ul>
          {offer.behind_the_scenes.breakdown.slice(1).map((b) => (
            <li key={b.label}>
              {b.label}: +{decimal(b.pp)} procentpunt rente
            </li>
          ))}
          <li>
            Geslacht (“{label('personal_status')}”), leeftijd ({values.age}) en nationaliteit (“{label('foreign_worker')}”)
            gingen het model in en beïnvloedden de risicoscore.
          </li>
          <li>Naam, e-mail, telefoon, contacten en locatie werden gevraagd zonder dat het model ze nodig had.</li>
        </ul>

        <p>
          Zet <strong>Ontwerpkeuzes tonen</strong> aan om alle dark patterns in deze app terug te zien.
        </p>
        <div className="sg-reveal-actions">
          <Link to="/schuldwijzer" className="sg-reveal-btn">
            Vergelijk met Schuldwijzer
          </Link>
          <button type="button" className="sg-reveal-link" onClick={onRestart}>
            Opnieuw beginnen
          </button>
        </div>
      </section>
    </div>
  )
}
