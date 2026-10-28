import { useNavigate } from 'react-router-dom'
import { Note } from '../shared/annotate'
import { decimal, pct } from '../shared/format'
import type { Meta } from '../shared/types'

export default function ModelInfo({ meta }: { meta: Meta }) {
  const navigate = useNavigate()
  const m = meta.model
  const maxImp = Math.max(...m.importance.map((i) => i.mean), 0.001)
  const age = m.fairness['leeftijd']
  const sex = m.fairness['geslacht']

  return (
    <div className="sw-info">
      <button type="button" className="sw-link-btn sw-back-btn" onClick={() => navigate(-1)}>
        Terug
      </button>
      <h1>Hoe Schuldwijzer werkt</h1>
      <p className="sw-lede">
        Achter Schuldwijzer zit een klein neuraal netwerk dat geleerd heeft van eerdere leningen. Hier lees je wat
        het weet, wat het niet weet, en hoe goed het is.
      </p>

      <Note
        kind="ux"
        title="Transparency"
        text="Globale uitleg: welk model, welke data, hoe goed het presteert en welke antwoorden in het algemeen het zwaarst wegen."
      >
        <section className="sw-info-section">
          <h2>Het model in het kort</h2>
          <dl className="sw-kv">
            <div>
              <dt>Soort model</dt>
              <dd>
                {m.type}, met {m.hidden_layers.join(' en ')} verborgen neuronen
              </dd>
            </div>
            <div>
              <dt>Geleerd van</dt>
              <dd>{m.dataset}. Bij {pct(m.base_rate)} ging het mis.</dd>
            </div>
            <div>
              <dt>Getest op</dt>
              <dd>{m.n_test} leningen die het model tijdens het leren niet heeft gezien</dd>
            </div>
            <div>
              <dt>Hoe goed</dt>
              <dd>
                {pct(m.test_accuracy)} goed bij een simpele ja/nee-grens. AUC {decimal(m.test_auc, 2)} (0,5 is gokken,
                1 is perfect).
              </dd>
            </div>
          </dl>
        </section>

        <section className="sw-info-section">
          <h2>De drie groepen</h2>
          <table className="sw-table">
            <thead>
              <tr>
                <th scope="col">Groep</th>
                <th scope="col">Kans volgens model</th>
                <th scope="col">Aandeel aanvragers</th>
                <th scope="col">Kreeg echt problemen</th>
              </tr>
            </thead>
            <tbody>
              {m.bands.map((b) => (
                <tr key={b.band}>
                  <th scope="row">{b.band}</th>
                  <td>
                    {pct(b.van)} tot {pct(b.tot)}
                  </td>
                  <td>{pct(b.aandeel)}</td>
                  <td>{pct(b.werkelijk_bad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sw-muted sw-small">
            De grens voor “hoog” is zo gekozen dat 60% van de mensen die echt in de problemen kwamen daar terechtkomt,
            en 90% in “gemiddeld” of “hoog”. Liever een keer te vaak gewaarschuwd dan iemand gemist.
          </p>
        </section>

        <section className="sw-info-section">
          <h2>Wat in het algemeen het zwaarst weegt</h2>
          <p className="sw-muted">Hoeveel slechter het model wordt als we een antwoord door elkaar husselen (permutation importance).</p>
          <ul className="sw-importance">
            {m.importance.map((i) => (
              <li key={i.feature}>
                <span>{i.label}</span>
                <span className="sw-importance-bar">
                  <i style={{ width: `${(Math.max(0, i.mean) / maxImp) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </Note>

      <Note
        kind="ethiek"
        title="Bias: wat we bewust weglaten en wat er overblijft"
        text="We laten beschermde kenmerken weg en meten daarna of groepen alsnog anders behandeld worden. Eerlijk over proxy-bias: dienstverband en woonsituatie hangen samen met leeftijd."
      >
        <section className="sw-info-section">
          <h2>Wat we bewust niet gebruiken</h2>
          <ul>
            {meta.not_used.map((n) => (
              <li key={n.name}>
                <strong>{n.short}</strong>: een beschermd kenmerk. Hierop mag een lening niet beoordeeld worden.
              </li>
            ))}
            <li>
              <strong>Kredietverleden</strong>: in deze data werkt het omgekeerd. Mensen met een “kritieke” rekening
              hadden juist het minste risico, waarschijnlijk omdat zij alleen na strenge controle een lening kregen
              (selectiebias). Een model dat dit leert, geeft onlogisch advies.
            </li>
          </ul>
          {age && sex && (
            <>
              <h3>Behandelt het model groepen gelijk?</h3>
              <p>
                Ook zonder leeftijd komt het model bij jongeren (25 of jonger) vaker uit op “hoog”:{' '}
                {pct(age['25 of jonger'].geflagd)} tegen {pct(age['ouder dan 25'].geflagd)} bij ouderen. Dat komt
                doordat antwoorden als dienstverband en woonsituatie samenhangen met leeftijd. Jongeren kwamen in de
                data ook echt vaker in de problemen ({pct(age['25 of jonger'].werkelijk_bad)} tegen{' '}
                {pct(age['ouder dan 25'].werkelijk_bad)}). Het aandeel vals alarm is vergelijkbaar:{' '}
                {pct(age['25 of jonger'].fpr)} tegen {pct(age['ouder dan 25'].fpr)}.
              </p>
              <p>
                Tussen mannen en vrouwen is het verschil klein: {pct(sex['vrouw'].geflagd)} van de vrouwen en{' '}
                {pct(sex['man'].geflagd)} van de mannen valt in “hoog”.
              </p>
              <p className="sw-muted sw-small">Gemeten op {m.n_test} testaanvragen. Kleine groepen, dus met een slag om de arm.</p>
            </>
          )}
        </section>
      </Note>
    </div>
  )
}
