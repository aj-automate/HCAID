import { Link } from 'react-router-dom'
import { Note } from '../shared/annotate'
import type { SwState } from './Schuldwijzer'

export default function NextStep({ state }: { state: SwState }) {
  const band = state.prediction?.band.band

  return (
    <div className="sw-next">
      <p className="sw-eyebrow">Stap 3 van 3</p>
      <h1>{band === 'laag' ? 'Goed voorbereid lenen' : 'Wat nu?'}</h1>
      <p className="sw-lede">
        {band === 'hoog'
          ? 'Een lening afsluiten met een hoog risico hoeft niet, maar doe het niet alleen. Hier kun je terecht.'
          : band === 'gemiddeld'
            ? 'Je kunt deze lening waarschijnlijk dragen, als er niets tegenzit. Zo zorg je dat je voorbereid bent.'
            : 'Hier kun je terecht met vragen over geld en lenen, nu of later.'}
      </p>

      <ol className="sw-next-list">
        <li className={band === 'hoog' ? 'sw-next-first' : ''}>
          <h2>Praat gratis met een schuldhulpverlener</h2>
          <p>
            Bij Geldfit doe je een korte test en word je, als dat nodig is, doorverwezen naar gratis hulp bij jou in
            de buurt. Anoniem, zonder verplichtingen. Ook je gemeente biedt gratis schuldhulp.
          </p>
          <a className="sw-btn sw-btn-primary" href="https://www.geldfit.nl" target="_blank" rel="noreferrer">
            Naar Geldfit.nl
          </a>
        </li>
        <li>
          <h2>Maak eerst een begroting</h2>
          <p>Zet je inkomsten en vaste lasten op een rij, zodat je weet hoeveel er elke maand echt over is.</p>
          <a className="sw-text-link" href="https://www.nibud.nl" target="_blank" rel="noreferrer">
            Begroting maken bij het Nibud
          </a>
        </li>
        <li>
          <h2>Leen je toch? Let hier op</h2>
          <ul className="sw-checklist">
            <li>Vergelijk het jaarlijks kostenpercentage, niet alleen het maandbedrag.</li>
            <li>Wantrouw aanbieders die haast maken of “iedereen goedkeuren”.</li>
            <li>Check of de aanbieder een vergunning van de AFM heeft.</li>
            <li>Leen nooit om een andere lening af te lossen.</li>
          </ul>
        </li>
      </ol>

      <Note
        kind="ux"
        title="Data control: wissen"
        text="De gebruiker kan altijd en op één plek alles wissen, met een bevestiging van wat er gebeurd is. Er staat niets op de server."
      >
        <section className="sw-wipe">
          <h2>Klaar? Wis je gegevens</h2>
          {state.cleared ? (
            <p role="status">
              <strong>Je antwoorden en de inschatting zijn gewist.</strong> Op onze server stonden je antwoorden nooit.
            </p>
          ) : (
            <>
              <p>Je antwoorden staan alleen in dit tabblad. Met deze knop zijn ze direct weg.</p>
              <button
                type="button"
                className="sw-btn sw-btn-secondary"
                onClick={state.clearAll}
                disabled={!state.values}
              >
                {state.values ? 'Wis mijn gegevens' : 'Er zijn geen gegevens om te wissen'}
              </button>
            </>
          )}
        </section>
      </Note>

      {state.prediction && (
        <p className="sw-back">
          <Link to="/schuldwijzer/uitkomst">Terug naar je inschatting</Link>
        </p>
      )}
    </div>
  )
}
