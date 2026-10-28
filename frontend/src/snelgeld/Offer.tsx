import { useEffect, useState } from 'react'
import { Note, useNotesOn } from '../shared/annotate'
import { decimal, euro, euroCents, pct } from '../shared/format'
import type { Offer as OfferT, Urgency } from '../shared/types'
import type { Extras } from './SnelGeld'

export const PROTECTION_FEE = 4.95

export function monthlyFor(amount: number, apr: number, months: number) {
  const r = apr / 100 / 12
  return (amount * r) / (1 - (1 + r) ** -months)
}

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    // Loopt de tijd af, dan begint hij stilletjes opnieuw.
    const t = window.setInterval(() => setLeft((s) => (s <= 1 ? seconds : s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [seconds])
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
}

export default function Offer({
  offer,
  name,
  urgency,
  extras,
  setExtras,
  onAccept,
  onDecline,
}: {
  offer: OfferT
  name: string
  urgency: Urgency
  extras: Extras
  setExtras: (e: Extras) => void
  onAccept: () => void
  onDecline: () => void
}) {
  const clock = useCountdown(299)
  const notesOn = useNotesOn()
  const [confirmDecline, setConfirmDecline] = useState(false)
  const canUpsell = offer.upsell_amount > offer.requested
  const amount = extras.upsell && canUpsell ? offer.upsell_amount : offer.requested
  const monthly = monthlyFor(amount, offer.apr, offer.months) + (extras.protection ? PROTECTION_FEE : 0)
  const total = monthly * offer.months + offer.closing_fee
  const bts = offer.behind_the_scenes

  if (confirmDecline) {
    return (
      <div className="sg-card sg-offer">
        <Note
          kind="dark"
          title="Confirmshaming en obstructie"
          text="Weigeren wordt ontmoedigd met verlies-framing en een dreigende wachttijd. De knop om echt te weigeren is klein en grijs."
        >
          <h1>Weet je het zeker?</h1>
          <p className="sg-sub">
            Je persoonlijke aanbod van {euro(amount)} vervalt dan definitief. Je kunt pas over 6 maanden opnieuw
            aanvragen.
          </p>
          <button type="button" className="sg-cta" onClick={() => setConfirmDecline(false)}>
            Nee, ik wil mijn aanbod houden
          </button>
          <button type="button" className="sg-decline" onClick={onDecline}>
            Ja, laat mijn aanbod vervallen
          </button>
        </Note>
      </div>
    )
  }

  return (
    <div className="sg-offer-layout">
      <div className="sg-card sg-offer">
        <Note
          kind="dark"
          title="Valse urgentie"
          text="Een aftelklok die bij nul stilletjes opnieuw begint. Tijdsdruk voorkomt dat iemand vergelijkt of er een nacht over slaapt."
        >
          <div className="sg-timer" role="timer">
            <span>Jouw persoonlijke tarief geldt nog</span>
            <strong>{clock}</strong>
          </div>
        </Note>

        <div className="sg-offer-head">
          <Note
            kind="dark"
            title="Nep-zekerheid"
            text="'Goedgekeurd' en '98% match' suggereren zekerheid en een goede uitkomst. De echte voorspelling (hoog risico) wordt verzwegen en juist gebruikt om de rente te verhogen."
            inline
          >
            <span className="sg-badge">Goedgekeurd · 98% match</span>
          </Note>
        </div>
        <h1>Goed nieuws{name ? `, ${name}` : ''}! We hebben iets voor je geregeld</h1>

        {canUpsell && (
          <Note
            kind="dark"
            title="Meer lenen bij hoog risico"
            text="Juist omdat het model een hoog risico voorspelt, biedt SnelGeld 50% méér geld aan, en zet die optie standaard aan. Meer schuld betekent meer rente-inkomsten."
          >
            <fieldset className="sg-amounts">
              <legend className="visually-hidden">Kies je bedrag</legend>
              <label className={!extras.upsell ? 'on' : ''}>
                <input type="radio" checked={!extras.upsell} onChange={() => setExtras({ ...extras, upsell: false })} />
                <span className="sg-amount-val">{euro(offer.requested)}</span>
                <span>Wat je vroeg</span>
              </label>
              <label className={extras.upsell ? 'on' : ''}>
                <input type="radio" checked={extras.upsell} onChange={() => setExtras({ ...extras, upsell: true })} />
                <span className="sg-amount-val">{euro(offer.upsell_amount)}</span>
                <span>Populair: wat extra ruimte</span>
              </label>
            </fieldset>
          </Note>
        )}
        {!canUpsell && <p className="sg-big-amount">{euro(amount)}</p>}

        <Note
          kind="dark"
          title="Framing op maandbedrag"
          text="Groot in beeld staat alleen het maandbedrag. De looptijd is opgerekt zodat het bedrag klein oogt; rente en totale kosten staan in kleine letters onderaan."
        >
          <p className="sg-monthly">
            Slechts <strong>{euro(monthly)}</strong> per maand
          </p>
          <p className="sg-sub">Vandaag nog op je rekening{urgency === 'vandaag' ? ', zoals je wilde' : ''}.</p>
        </Note>

        <Note
          kind="dark"
          title="Ongevraagd product in het mandje"
          text="Een 'betalingsbeschermer' staat vooraf aan en wordt bij het maandbedrag opgeteld."
        >
          <label className="sg-addon">
            <input type="checkbox" checked={extras.protection} onChange={(e) => setExtras({ ...extras, protection: e.target.checked })} />
            <span>
              <strong>Betalingsbeschermer</strong> voor maar {euroCents(PROTECTION_FEE)} per maand. Zorgeloos lenen!
            </span>
          </label>
        </Note>

        <button type="button" className="sg-cta" onClick={onAccept}>
          Ja, regel het voor me
        </button>
        <Note
          kind="dark"
          title="Confirmshaming"
          text="De weigerknop is klein, grijs en schuldgevoel-oproepend geformuleerd."
          inline
        >
          <button type="button" className="sg-decline" onClick={() => setConfirmDecline(true)}>
            Nee, ik heb geen geld nodig
          </button>
        </Note>

        <p className="sg-proof">Al 12.408 mensen gingen je deze maand voor</p>

        <Note
          kind="dark"
          title="Verborgen kosten in de kleine lettertjes"
          text="Het jaarlijks kostenpercentage, de totale terugbetaling en het delen van gegevens staan er wel, maar in klein, lichtgrijs, onleesbaar schrift."
        >
          <p className="sg-fine">
            *Jaarlijks kostenpercentage {decimal(offer.apr)}%. Looptijd {offer.months} maanden. Totaal terug te betalen{' '}
            {euroCents(total)}, inclusief afsluitkosten {euroCents(offer.closing_fee)}
            {extras.protection ? ` en betalingsbeschermer ${euroCents(PROTECTION_FEE)} p/m` : ''}. Bij te late betaling{' '}
            {euroCents(offer.late_fee)} per keer. Je gegevens worden gedeeld met geselecteerde partners voor
            marketingdoeleinden. Rentepercentage is afhankelijk van je persoonlijke profiel.
          </p>
        </Note>
      </div>

      {notesOn && (
        <Note
          kind="ethiek"
          title="Explainability omgekeerd"
          text="Dit ziet SnelGeld wel, de klant niet. Dezelfde voorspelling die Schuldwijzer uitlegt, wordt hier verborgen en omgezet in rente. Inclusief discriminerende opslagen op leeftijd en nationaliteit."
        >
          <aside className="sg-bts" aria-label="Achter de schermen">
            <h2>Achter de schermen</h2>
            <p className="sg-bts-sub">Alleen zichtbaar met “Ontwerpkeuzes tonen”</p>
            <dl>
              <div>
                <dt>Kans op betalingsproblemen (model)</dt>
                <dd>{pct(bts.probability)}</dd>
              </div>
              <div>
                <dt>Segment</dt>
                <dd>{bts.segment}</dd>
              </div>
            </dl>
            <h3>Zo is de rente opgebouwd</h3>
            <table>
              <tbody>
                {bts.breakdown.map((b) => (
                  <tr key={b.label}>
                    <th scope="row">{b.label}</th>
                    <td>+{decimal(b.pp)}</td>
                  </tr>
                ))}
                <tr className="sg-bts-total">
                  <th scope="row">Jaarlijks kostenpercentage</th>
                  <td>{decimal(offer.apr)}%</td>
                </tr>
              </tbody>
            </table>
            <p>
              Verwachte rente-inkomsten op {euro(offer.requested)}: <strong>{euro(bts.expected_extra_interest)}</strong>
            </p>
          </aside>
        </Note>
      )}
    </div>
  )
}
