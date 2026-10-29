import { useNavigate } from 'react-router-dom'
import { Note } from '../shared/annotate'
import { euro } from '../shared/format'
import type { SwState } from './Schuldwijzer'

export default function Privacy({ state }: { state: SwState }) {
  const navigate = useNavigate()
  const { values, meta } = state

  return (
    <div className="sw-info">
      <button type="button" className="sw-link-btn sw-back-btn" onClick={() => navigate(-1)}>
        Terug
      </button>
      <h1>Jouw gegevens</h1>
      <p className="sw-lede">Wat we van je weten, waar het staat, en hoe je het wist.</p>

      <Note
        kind="ux"
        title="Data privacy & control"
        text="Zien wat er over je bekend is, op één plek, met een wisknop. Geen verborgen verzameling."
      >
        <section className="sw-info-section">
          <h2>Wat er nu over je bekend is</h2>
          {values ? (
            <dl className="sw-kv">
              {meta.features.map((f) => {
                const v = values[f.name]
                const label =
                  f.options?.find((o) => String(o.value) === String(v))?.label ??
                  (f.unit === 'eur' ? euro(Number(v)) : `${v} ${f.unit ?? ''}`)
                return (
                  <div key={f.name}>
                    <dt>{f.short}</dt>
                    <dd>{label}</dd>
                  </div>
                )
              })}
            </dl>
          ) : (
            <p>{state.cleared ? 'Niets. Je gegevens zijn gewist.' : 'Niets. Je hebt nog geen antwoorden ingevuld.'}</p>
          )}
          {values && (
            <button type="button" className="sw-btn sw-btn-secondary" onClick={state.clearAll}>
              Wis mijn gegevens
            </button>
          )}
        </section>

        <section className="sw-info-section">
          <h2>Waar je gegevens blijven</h2>
          <ul>
            <li>Je antwoorden staan alleen in dit tabblad (sessionStorage), zodat verversen niets wist. Sluit je het tabblad of klik je op wissen, dan zijn ze weg.</li>
            <li>Voor de berekening gaan ze naar onze server. Die rekent en vergeet ze direct; je antwoorden worden niet opgeslagen of gelogd.</li>
            <li>Geef je feedback, dan bewaren we “klopt wel/niet”, de risicogroep en je toelichting als je die invult. Nooit je antwoorden.</li>
            <li>Geen cookies, geen account, geen tracking, geen doorverkoop.</li>
          </ul>
        </section>
      </Note>
    </div>
  )
}
