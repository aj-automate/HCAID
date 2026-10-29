import { useNavigate } from 'react-router-dom'
import { Note } from '../shared/annotate'
import { decimal, pct } from '../shared/format'
import type { Meta } from '../shared/types'

const COMPARE_LABEL: Record<string, string> = {
  baseline_altijd_good: 'Altijd "gaat goed" zeggen',
  logistische_regressie: 'Logistische regressie',
  gewoon_neuraal_netwerk: 'Gewoon neuraal netwerk',
  monotoon_neuraal_netwerk: 'Monotoon neuraal netwerk (Schuldwijzer)',
}

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
                {m.type}, met {m.hidden_units} verborgen neuronen. Het netwerk is zo gebouwd dat een gunstiger antwoord de
                kans nooit kan verhogen (zie hieronder).
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
                AUC {decimal(m.test_auc, 2)} op ongeziene aanvragen (0,5 is gokken, 1 is perfect). Bij een simpele
                ja/nee-grens van 50% zat het {pct(m.test_accuracy)} van de keren goed.
              </dd>
            </div>
          </dl>
        </section>

        <section className="sw-info-section">
          <h2>Waarom een monotoon netwerk?</h2>
          <p>
            Een gewoon neuraal netwerk volgt elke eigenaardigheid in de data. Dan kan “geen werk” ineens een lager
            risico geven dan “korter dan 1 jaar in dienst”, of een langere looptijd veiliger lijken. Wij hebben
            vastgelegd in welke richting tien antwoorden mogen werken: meer spaargeld, langer in dienst, een kortere
            looptijd of een lager bedrag kan je kans nooit verhogen. We testen dat op honderden echte profielen.
          </p>
          <table className="sw-table">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">AUC (test)</th>
                <th scope="col">Profielen met een onlogische sprong</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(m.comparison).map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{COMPARE_LABEL[k] ?? k}</th>
                  <td>{decimal(v.roc_auc, 2)}</td>
                  <td>{k.startsWith('baseline') ? 'n.v.t.' : pct(v.onlogisch_max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sw-muted sw-small">
            Een eenvoudige logistische regressie presteert bijna even goed. Die is volledig doorzichtig, maar ook die
            maakt onlogische sprongen bij categorieën als dienstverband. Het monotone netwerk combineert de prestaties
            met voorspellingen die je kunt uitleggen.
          </p>
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
                  <th scope="row">{b.band.charAt(0).toUpperCase() + b.band.slice(1)}</th>
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
                doordat antwoorden als dienstverband en woonsituatie samenhangen met leeftijd (proxy-bias). Jongeren
                kwamen in de data ook echt vaker in de problemen ({pct(age['25 of jonger'].werkelijk_bad)} tegen{' '}
                {pct(age['ouder dan 25'].werkelijk_bad)}).{' '}
                {Math.abs(age['25 of jonger'].fpr - age['ouder dan 25'].fpr) < 0.03 ? (
                  <>
                    Het aandeel vals alarm is vergelijkbaar: {pct(age['25 of jonger'].fpr)} tegen{' '}
                    {pct(age['ouder dan 25'].fpr)}.
                  </>
                ) : (
                  <>
                    Maar jongeren krijgen ook vaker <strong>onterecht</strong> een waarschuwing:{' '}
                    {pct(age['25 of jonger'].fpr)} van de jongeren die netjes afbetaalden, tegen{' '}
                    {pct(age['ouder dan 25'].fpr)} van de ouderen. Omdat Schuldwijzer alleen waarschuwt en niets
                    weigert, vinden we dat te verdedigen, maar het is een echt nadeel: een onnodige waarschuwing kan
                    ontmoedigen.
                  </>
                )}
              </p>
              <p>
                Tussen mannen en vrouwen is het verschil klein: {pct(sex['vrouw'].geflagd)} van de vrouwen en{' '}
                {pct(sex['man'].geflagd)} van de mannen valt in “hoog”, met vrijwel evenveel vals alarm (
                {pct(sex['vrouw'].fpr)} en {pct(sex['man'].fpr)}).
              </p>
              <p className="sw-muted sw-small">
                Gemeten op alle 1000 aanvragen, steeds voorspeld door een model dat die aanvraag niet had gezien
                (out-of-fold), bij de grens die de app gebruikt. Er waren {age['25 of jonger'].n} jongeren, van wie{' '}
                {age['25 of jonger'].n_good} de lening wél netjes afbetaalden: de cijfers over vals alarm zijn dus
                indicatief.
              </p>
            </>
          )}
        </section>
      </Note>
    </div>
  )
}
