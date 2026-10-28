import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Note } from '../shared/annotate'

export default function Intro({ onStart, onExample }: { onStart: () => void; onExample: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="sw-intro">
      <Note
        kind="ux"
        title="Set expectations"
        text="We beginnen bij het voordeel voor de gebruiker, niet bij de techniek: weten of je een lening kunt dragen voordat je tekent."
      >
        <p className="sw-eyebrow">Gratis, anoniem en zonder account</p>
        <h1>Weet voordat je leent of je het kunt dragen</h1>
        <p className="sw-lede">
          Schuldwijzer schat in hoe groot de kans is dat een lening je in betalingsproblemen brengt, laat zien
          waardoor dat komt, en wat je kunt doen om het te voorkomen.
        </p>
      </Note>

      <Note
        kind="ux"
        title="Transparency & limitations"
        text="Vooraf duidelijk wat het model wel en niet kan. Zo leggen gebruikers niet meer vertrouwen in de uitkomst dan die verdient."
      >
        <dl className="sw-facts">
          <div>
            <dt>Wat Schuldwijzer doet</dt>
            <dd>Een computermodel vergelijkt jouw situatie met 1000 eerdere leningen en schat het risico in.</dd>
          </div>
          <div>
            <dt>Wat het niet doet</dt>
            <dd>Het verstrekt geen lening, neemt geen besluit en kijkt niet in het BKR. Jij beslist zelf.</dd>
          </div>
          <div>
            <dt>Wat we vragen</dt>
            <dd>10 vragen over de lening en je geld, ongeveer 2 minuten. Geen naam, leeftijd, geslacht of nationaliteit.</dd>
          </div>
        </dl>
      </Note>

      <Note
        kind="ux"
        title="Onboarding"
        text="Een veilige, omkeerbare eerste stap: eerst kijken met een voorbeeldpersoon, zonder eigen gegevens te delen."
      >
        <div className="sw-actions">
          <button type="button" className="sw-btn sw-btn-primary" onClick={onStart}>
            Begin met mijn situatie
          </button>
          <button
            type="button"
            className="sw-btn sw-btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onExample()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Voorbeeld laden…' : 'Eerst kijken met een voorbeeld'}
          </button>
        </div>
        <p className="sw-hint">
          Het voorbeeld is Damian, 24, automonteur, die € 3.000 wil lenen voor een tweedehands auto.
        </p>
      </Note>

      <p className="sw-note sw-intro-note">
        Dit is een inschatting van een computermodel dat getraind is op oude leningen. Het kan ernaast zitten.{' '}
        <Link to="/schuldwijzer/hoe-het-werkt">Lees hoe het werkt</Link>.
      </p>
    </div>
  )
}
