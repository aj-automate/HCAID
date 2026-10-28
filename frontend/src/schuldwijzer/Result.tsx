import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../shared/api'
import { Note } from '../shared/annotate'
import { euro, pct } from '../shared/format'
import type { Band, Contribution, Prediction } from '../shared/types'
import type { SwState } from './Schuldwijzer'

const HEADLINE: Record<Band['band'], string> = {
  hoog: 'Deze lening wordt waarschijnlijk lastig om terug te betalen',
  gemiddeld: 'Deze lening is te doen, maar er is weinig ruimte voor tegenvallers',
  laag: 'Deze lening lijkt goed te dragen',
}

const BAND_LABEL: Record<Band['band'], string> = { laag: 'Laag', gemiddeld: 'Gemiddeld', hoog: 'Hoog' }

const points = (d: number) => `${Math.round(Math.abs(d) * 100)} procentpunt`

export default function Result({ state }: { state: SwState }) {
  const navigate = useNavigate()
  const { prediction: p, values, firstPrediction } = state
  if (!p || !values) return <p className="sw-loading">Inschatting maken…</p>

  const band = p.band.band
  const changed = firstPrediction && Math.abs(firstPrediction.probability - p.probability) > 0.0005

  return (
    <div className="sw-result" aria-busy={state.loading}>
      <p className="sw-eyebrow">
        Inschatting voor jouw lening van {euro(Number(values.credit_amount))} in {values.duration} maanden
      </p>
      <h1>{HEADLINE[band]}</h1>
      <p className="sw-lede">
        Het model schat de kans op betalingsproblemen op <strong>{pct(p.probability)}</strong>. Dit is een
        inschatting, geen besluit. Jij beslist.
      </p>

      <div className="sw-result-grid">
        <Note
          kind="ux"
          title="Uitkomst in drie groepen"
          text="Een kans van 84% zegt weinig zonder referentie. De drie groepen (laag, gemiddeld, hoog) maken de uitkomst leesbaar; het exacte percentage staat erbij."
        >
          <p className="sw-lab">Risico op betalingsproblemen</p>
          <Meter p={p} />
        </Note>
        <Note
          kind="ux"
          title="Confidence"
          text="Zekerheid in woorden én cijfers: hoe dicht de inschatting bij een groepsgrens ligt, en hoe vaak mensen in deze groep echt in de problemen kwamen. Zo weet je hoeveel vertrouwen de uitkomst verdient."
        >
          <p className="sw-lab">Hoe zeker is het model?</p>
          <Confidence p={p} />
        </Note>
      </div>

      {state.error && (
        <p className="sw-error" role="alert">
          {state.error}
        </p>
      )}

      {band !== 'laag' && (
        <Note
          kind="ux"
          title="Alerting"
          text="Bij een verhoogd risico wijzen we actief op gratis hulp, op het moment dat het ertoe doet. Dit is de gedragsverandering waar de app voor ontworpen is."
        >
          <div className={`sw-alert sw-alert-${band}`} role="note">
            <h2>{band === 'hoog' ? 'Twijfel je? Praat er eerst gratis over.' : 'Bereid je voor op tegenvallers.'}</h2>
            <p>
              {band === 'hoog'
                ? 'Een schuldhulpverlener kijkt met je mee naar wat wel past. Gratis, anoniem en zonder dat iemand het hoeft te weten.'
                : 'Zorg dat je een buffer hebt voor onverwachte kosten voordat je tekent, en vergelijk het jaarlijks kostenpercentage.'}
            </p>
            <Link to="/schuldwijzer/volgende-stap">Bekijk waar je terecht kunt</Link>
          </div>
        </Note>
      )}

      <Note
        kind="ux"
        title="Explainability"
        text="Waarom deze uitkomst? Per antwoord zie je hoeveel procentpunt het de kans verhoogt of verlaagt (exacte Shapley-waarden). Don't say what without saying why."
      >
        <Factors p={p} />
      </Note>

      <Note
        kind="ux"
        title="Control"
        text="De gebruiker houdt de regie: haalbare alternatieven en direct zelf schuiven met bedrag en looptijd. Het model is een hulpmiddel bij de beslissing, geen beslisser."
      >
        <Options state={state} />
      </Note>

      {changed && firstPrediction && (
        <p className="sw-changed">
          Je hebt je antwoorden aangepast. Eerste inschatting: {pct(firstPrediction.probability)}, nu{' '}
          {pct(p.probability)}.
        </p>
      )}

      <Note
        kind="ux"
        title="Limitations"
        text="Eerlijk over waar het model tekortschiet: oude Duitse data, geen zicht op inkomen of BKR, en een foutmarge. Dit voorkomt blind vertrouwen."
      >
        <Limitations />
      </Note>

      <Note
        kind="ux"
        title="Feedback"
        text="Expliciete feedback met duidelijke erkenning: we vertellen wat we met de feedback doen (controleren of het model groepen structureel verkeerd inschat) en slaan alleen het oordeel op."
      >
        <Feedback band={band} />
      </Note>

      <div className="sw-actions sw-actions-end">
        <button type="button" className="sw-btn sw-btn-primary" onClick={() => navigate('/schuldwijzer/volgende-stap')}>
          Naar de volgende stap
        </button>
        <button type="button" className="sw-btn sw-btn-secondary" onClick={() => navigate('/schuldwijzer/gegevens')}>
          Antwoorden aanpassen
        </button>
      </div>
    </div>
  )
}

function Meter({ p }: { p: Prediction }) {
  const bands: Band['band'][] = ['laag', 'gemiddeld', 'hoog']
  const idx = bands.indexOf(p.band.band)
  const within = (p.probability - p.band.van) / Math.max(0.0001, p.band.tot - p.band.van)
  const left = ((idx + Math.min(1, Math.max(0, within))) / 3) * 100
  return (
    <div className="sw-meter" role="img" aria-label={`Risico ${p.band.band}, ${pct(p.probability)}`}>
      <div className="sw-meter-track">
        {bands.map((b, i) => (
          <span key={b} className={i === idx ? `on on-${b}` : ''} />
        ))}
        <span className="sw-meter-marker" style={{ left: `${left}%` }} aria-hidden="true">
          <span>{pct(p.probability)}</span>
        </span>
      </div>
      <div className="sw-meter-labels" aria-hidden="true">
        {bands.map((b) => (
          <span key={b} className={b === p.band.band ? 'on' : ''}>
            {BAND_LABEL[b]}
          </span>
        ))}
      </div>
    </div>
  )
}

function Confidence({ p }: { p: Prediction }) {
  const sentence = {
    zeker: <><strong>Zeker:</strong> je valt duidelijk in de groep “{p.band.band}”</>,
    'redelijk zeker': <><strong>Redelijk zeker:</strong> je valt in de groep “{p.band.band}”</>,
    twijfelgeval: <><strong>Twijfelgeval:</strong> je zit op de rand van de groep “{p.band.band}”</>,
  }[p.confidence.label]
  return (
    <div className="sw-confidence">
      <p className="sw-confidence-value">{sentence}</p>
      <p>
        Van eerdere aanvragers in deze groep kreeg <strong>{pct(p.band.werkelijk_bad)}</strong> echt
        betalingsproblemen.{' '}
        {p.band.band === 'hoog'
          ? 'Dat betekent ook dat een flink deel het wél redde.'
          : p.band.band === 'laag'
            ? 'Laag is dus niet hetzelfde als geen risico.'
            : 'De uitkomst kan beide kanten op.'}
      </p>
      {p.confidence.label === 'twijfelgeval' && (
        <p className="sw-confidence-warn">
          Je zit dicht bij de grens met een andere groep. Een klein verschil in je antwoorden kan de uitkomst
          veranderen.
        </p>
      )}
    </div>
  )
}

function Factors({ p }: { p: Prediction }) {
  const [all, setAll] = useState(false)
  const sum = p.explanation.reduce((s, c) => s + c.contribution, 0)
  const base = p.probability - sum
  const max = Math.max(...p.explanation.map((c) => Math.abs(c.contribution)), 0.01)
  const shown = all ? p.explanation : p.explanation.slice(0, 5)

  return (
    <section className="sw-factors" aria-labelledby="factors-h">
      <h2 id="factors-h">Wat telt het zwaarst mee</h2>
      <p className="sw-factors-intro">
        Voor een gemiddelde aanvrager schat het model {pct(base)}. Jouw antwoorden brengen dat naar{' '}
        <strong>{pct(p.probability)}</strong>. Zo telt elk antwoord mee:
      </p>
      <ul>
        {shown.map((c) => (
          <FactorRow key={c.feature} c={c} max={max} />
        ))}
      </ul>
      {p.explanation.length > 5 && (
        <button type="button" className="sw-link-btn" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? 'Toon minder' : `Toon alle ${p.explanation.length} antwoorden`}
        </button>
      )}
    </section>
  )
}

function FactorRow({ c, max }: { c: Contribution; max: number }) {
  const up = c.contribution > 0
  const tiny = Math.abs(c.contribution) < 0.005
  const width = `${(Math.abs(c.contribution) / max) * 100}%`
  return (
    <li className="sw-factor">
      <span className="sw-factor-name">
        <span>{c.label}</span>
        <span className="sw-factor-value">{c.value_label}</span>
      </span>
      <span className="sw-factor-bar" aria-hidden="true">
        <span className="sw-factor-half sw-factor-down">{!up && <i style={{ width }} />}</span>
        <span className="sw-factor-half sw-factor-up">{up && <i style={{ width }} />}</span>
      </span>
      <span className="sw-factor-effect">
        {tiny ? 'nauwelijks effect' : `${up ? '+' : '−'}${points(c.contribution)}`}
        <span className="visually-hidden">{tiny ? '' : up ? ' hoger risico' : ' lager risico'}</span>
      </span>
    </li>
  )
}

function Options({ state }: { state: SwState }) {
  const p = state.prediction!
  const values = state.values!
  const amountCfg = state.meta.features.find((f) => f.name === 'credit_amount')!
  const durCfg = state.meta.features.find((f) => f.name === 'duration')!
  const monthly = Number(values.credit_amount) / Number(values.duration)
  const helpsLittle = p.counterfactuals.every((c) => c.band === p.band.band) && p.levers.length > 0

  return (
    <section className="sw-options" aria-labelledby="options-h">
      <h2 id="options-h">Wat kun je doen</h2>
      <div className="sw-options-grid">
        <div>
          <h3>Aan de lening</h3>
          {p.counterfactuals.length === 0 && (
            <p className="sw-muted">
              {p.band.band === 'laag'
                ? 'Je risico is al laag. Aan de lening hoeft niets te veranderen.'
                : 'Met een kleiner bedrag of andere looptijd daalt het risico bij jou niet merkbaar.'}
            </p>
          )}
          <ul className="sw-option-list">
            {p.counterfactuals.map((c) => (
              <li key={`${c.credit_amount}-${c.duration}`}>
                <div>
                  <strong>
                    Leen {euro(c.credit_amount)} in {c.duration} maanden
                  </strong>
                  <span className="sw-muted">
                    {' '}
                    Maandbedrag {c.credit_amount / c.duration <= monthly - 1 ? 'lager' : 'gelijk'}. Kans{' '}
                    {pct(c.probability)} ({points(c.verschil)} lager), groep “{c.band}”.
                  </span>
                </div>
                <button
                  type="button"
                  className="sw-btn sw-btn-small"
                  onClick={() => state.update({ ...values, credit_amount: c.credit_amount, duration: c.duration })}
                >
                  Probeer dit
                </button>
              </li>
            ))}
          </ul>
          {helpsLittle && (
            <p className="sw-muted sw-small">
              Eerlijk gezegd: aan de lening schuiven helpt bij jou weinig. Je situatie weegt zwaarder.
            </p>
          )}
        </div>
        <div>
          <h3>Aan je situatie, op termijn</h3>
          {p.levers.length === 0 && <p className="sw-muted">Je situatie is op deze punten al zo gunstig als het model kent.</p>}
          <ul className="sw-option-list">
            {p.levers.map((l) => (
              <li key={l.feature}>
                <div>
                  <strong>
                    {l.label}: {l.to.charAt(0).toLowerCase() + l.to.slice(1)}
                  </strong>
                  <span className="sw-muted">
                    {' '}
                    In plaats van “{l.from.toLowerCase()}”. Kans {pct(l.probability)} ({points(l.verschil)} lager).
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="sw-whatif">
        <h3>Probeer zelf</h3>
        <p className="sw-muted">Schuif met bedrag en looptijd. De inschatting hierboven past zich direct aan.</p>
        <div className="sw-whatif-grid">
          <label>
            <span>
              Leenbedrag <strong>{euro(Number(values.credit_amount))}</strong>
            </span>
            <input
              type="range"
              min={amountCfg.min}
              max={amountCfg.max}
              step={amountCfg.step}
              value={Number(values.credit_amount)}
              onChange={(e) => state.update({ ...values, credit_amount: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>
              Looptijd <strong>{values.duration} maanden</strong>
            </span>
            <input
              type="range"
              min={durCfg.min}
              max={durCfg.max}
              step={durCfg.step}
              value={Number(values.duration)}
              onChange={(e) => state.update({ ...values, duration: Number(e.target.value) })}
            />
          </label>
        </div>
        <p className="sw-whatif-now" aria-live="polite">
          Nu: kans {pct(p.probability)}, groep “{p.band.band}”, ongeveer {euro(Number(values.credit_amount) / Number(values.duration))} per maand
          aan aflossing (zonder rente).
        </p>
      </div>
    </section>
  )
}

function Limitations() {
  return (
    <section className="sw-limits" aria-labelledby="limits-h">
      <h2 id="limits-h">Houd hier rekening mee</h2>
      <ul>
        <li>Het model kent je inkomen, vaste lasten en BKR-registratie niet. Het ziet alleen deze 10 antwoorden.</li>
        <li>
          Het is getraind op 1000 leningen uit Duitsland in de jaren ’70. Bedragen zijn omgerekend naar euro’s; de
          koopkracht van toen is anders.
        </li>
        <li>Op nieuwe aanvragen zat het model er ongeveer 1 op de 4 keer naast.</li>
        <li>Het is een studentenproject en niet getest op de Nederlandse situatie van nu.</li>
      </ul>
      <Link to="/schuldwijzer/hoe-het-werkt">Meer over hoe het model werkt</Link>
    </section>
  )
}

function Feedback({ band }: { band: Band['band'] }) {
  const [stage, setStage] = useState<'ask' | 'why' | 'sent'>('ask')
  const [reason, setReason] = useState('')
  const [counts, setCounts] = useState<{ total: number; disagree: number } | null>(null)
  const [agree, setAgree] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async (a: boolean, r?: string) => {
    setError(null)
    try {
      const c = await api.feedback(a, band, r)
      setCounts(c)
      setAgree(a)
      setStage('sent')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="sw-feedback" aria-labelledby="fb-h">
      <h2 id="fb-h">Herken je je in deze inschatting?</h2>
      {stage === 'ask' && (
        <div className="sw-actions">
          <button type="button" className="sw-btn sw-btn-secondary" onClick={() => send(true)}>
            Ja, dit klopt wel
          </button>
          <button type="button" className="sw-btn sw-btn-secondary" onClick={() => setStage('why')}>
            Nee, dit klopt niet
          </button>
        </div>
      )}
      {stage === 'why' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(false, reason)
          }}
        >
          <label htmlFor="fb-reason" className="sw-label">
            Wat klopt er niet? <span className="sw-muted">(niet verplicht, zet er geen persoonsgegevens in)</span>
          </label>
          <textarea
            id="fb-reason"
            className="sw-textarea"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="sw-actions">
            <button type="submit" className="sw-btn sw-btn-primary">
              Verstuur feedback
            </button>
            <button type="button" className="sw-link-btn" onClick={() => setStage('ask')}>
              Annuleren
            </button>
          </div>
        </form>
      )}
      {stage === 'sent' && counts && (
        <div className="sw-feedback-done" role="status">
          <p>
            <strong>Dank je.</strong>{' '}
            {agree
              ? 'Fijn om te weten dat de inschatting herkenbaar is.'
              : 'Juist deze reacties zijn waardevol.'}{' '}
            We bewaren alleen je oordeel en de risicogroep, niet je antwoorden. Zeggen veel mensen in één groep
            “klopt niet”, dan is dat voor ons het signaal om het model voor die groep opnieuw te testen.
          </p>
          <p className="sw-muted">
            Tot nu toe {counts.total} reacties, waarvan {counts.disagree} “klopt niet”.
          </p>
        </div>
      )}
      {error && (
        <p className="sw-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
