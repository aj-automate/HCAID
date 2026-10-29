import { useRef, useState, type FormEvent } from 'react'
import { Note } from '../shared/annotate'
import { euro } from '../shared/format'
import type { FeatureMeta, Value } from '../shared/types'
import type { SwState, Values } from './Schuldwijzer'

const GROUPS: { title: string; intro: string; fields: string[] }[] = [
  {
    title: 'De lening',
    intro: 'Waar gaat het om?',
    fields: ['credit_amount', 'duration', 'purpose'],
  },
  {
    title: 'Je geld',
    intro: 'Hoeveel ruimte heb je nu?',
    fields: ['checking_status', 'savings_status', 'installment_commitment', 'other_payment_plans'],
  },
  {
    title: 'Je situatie',
    intro: 'Hoe stabiel is je inkomen en wonen?',
    fields: ['employment', 'housing', 'property_magnitude'],
  },
]

export default function Form({ state, onDone }: { state: SwState; onDone: () => void }) {
  const { meta } = state
  const byName = Object.fromEntries(meta.features.map((f) => [f.name, f]))
  const [draft, setDraft] = useState<Partial<Values>>(() => state.values ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const order = GROUPS.flatMap((g) => g.fields)

  const set = (name: string, v: Value) => {
    setDraft((d) => ({ ...d, [name]: v }))
    setErrors((errs) => {
      const rest = { ...errs }
      delete rest[name]
      return rest
    })
  }

  const check = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    for (const name of order) {
      const f = byName[name]
      const v = draft[name]
      if (v === undefined || v === '') {
        errs[name] = f.options ? 'Kies een antwoord.' : 'Vul een getal in.'
      } else if (!f.options) {
        const n = Number(v)
        const unit = f.unit === 'eur' ? '' : ` ${f.unit}`
        const fmt = (x: number) => (f.unit === 'eur' ? euro(x) : `${x}${unit}`)
        if (Number.isNaN(n) || n < f.min! || n > f.max!) errs[name] = `Kies een waarde tussen ${fmt(f.min!)} en ${fmt(f.max!)}.`
      }
    }
    return errs
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = check()
    setErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSubmitting(true)
    const ok = await state.submit(draft as Values)
    setSubmitting(false)
    if (ok) onDone()
  }

  return (
    <div className="sw-form-layout">
      <form className="sw-form" onSubmit={onSubmit} noValidate>
        <p className="sw-eyebrow">Stap 1 van 3</p>
        <h1>Vertel iets over de lening en je situatie</h1>
        <p className="sw-lede">Alle vragen zijn nodig voor de inschatting. Twijfel je? Kies wat het dichtst in de buurt komt.</p>

        {Object.keys(errors).length > 0 && (
          <div className="sw-error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
            <h2>
              {Object.keys(errors).length === 1
                ? 'Er klopt nog 1 antwoord niet'
                : `Er kloppen nog ${Object.keys(errors).length} antwoorden niet`}
            </h2>
            <ul>
              {order
                .filter((n) => errors[n])
                .map((n) => (
                  <li key={n}>
                    <a href={`#f-${n}`}>
                      {byName[n].question} {errors[n]}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {GROUPS.map((g) => (
          <fieldset key={g.title} className="sw-group">
            <legend>
              <span className="sw-group-title">{g.title}</span>
              <span className="sw-group-intro">{g.intro}</span>
            </legend>
            {g.fields.map((name) => (
              <Field
                key={name}
                f={byName[name]}
                value={draft[name]}
                error={errors[name]}
                onChange={(v) => set(name, v)}
              />
            ))}
          </fieldset>
        ))}

        <div className="sw-actions">
          <button type="submit" className="sw-btn sw-btn-primary" disabled={submitting}>
            {submitting ? 'Inschatting maken…' : 'Bekijk de inschatting'}
          </button>
        </div>
        {state.error && (
          <p className="sw-error" role="alert">
            {state.error}
          </p>
        )}
      </form>

      <aside className="sw-aside">
        <Note
          kind="ux"
          title="Data privacy & control"
          text="In context uitgelegd welke gegevens we wel en niet vragen, waar ze blijven en hoe je ze wist. Dataminimalisatie: alleen wat de voorspelling echt nodig heeft."
        >
          <h2>Jouw gegevens</h2>
          <p>Je antwoorden worden alleen gebruikt voor deze berekening. Ze blijven in dit tabblad staan zolang het open is, en worden nergens op een server opgeslagen.</p>
          <h3>Wat we niet vragen</h3>
          <ul>
            <li>Naam, adres of BSN</li>
            {meta.not_used.map((n) => (
              <li key={n.name}>{n.short}</li>
            ))}
          </ul>
        </Note>
        <Note
          kind="ethiek"
          title="Bias: geen beschermde kenmerken"
          text="Geslacht, leeftijd en nationaliteit zitten in de dataset, maar het model van Schuldwijzer is bewust zonder deze kenmerken getraind. Het presteert vrijwel even goed als een model met alle 20 kenmerken (cross-validation AUC 0,78 tegen 0,80, binnen de foutmarge)."
        >
          <p className="sw-note">
            Deze kenmerken zitten wel in de oorspronkelijke data. We hebben het model bewust zonder ze getraind,
            zodat het je niet anders inschat om wie je bent.
          </p>
        </Note>
        {Object.keys(draft).length > 0 && (
          <button type="button" className="sw-link-btn" onClick={() => { setDraft({}); setErrors({}) }}>
            Wis mijn antwoorden
          </button>
        )}
      </aside>
    </div>
  )
}

function Field({
  f,
  value,
  error,
  onChange,
}: {
  f: FeatureMeta
  value: Value | undefined
  error?: string
  onChange: (v: Value) => void
}) {
  const id = `f-${f.name}`
  const why = f.why && (
    <details className="sw-why">
      <summary>Waarom vragen we dit?</summary>
      <p>{f.why}</p>
    </details>
  )

  if (f.options && f.options.length > 6) {
    return (
      <div className={`sw-field ${error ? 'has-error' : ''}`}>
        <label htmlFor={id} className="sw-label">
          {f.question}
        </label>
        {why}
        {error && <p className="sw-field-error">{error}</p>}
        <select
          id={id}
          className="sw-select"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Maak een keuze
          </option>
          {f.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (f.options) {
    return (
      <fieldset id={id} className={`sw-field sw-radios ${error ? 'has-error' : ''}`} tabIndex={-1}>
        <legend className="sw-label">{f.question}</legend>
        {why}
        {error && <p className="sw-field-error">{error}</p>}
        {f.options.map((o) => (
          <label key={String(o.value)} className={`sw-radio ${String(value) === String(o.value) ? 'checked' : ''}`}>
            <input
              type="radio"
              name={f.name}
              checked={String(value) === String(o.value)}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  const num = value === undefined || value === '' ? undefined : Number(value)
  return (
    <div className={`sw-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="sw-label">
        {f.question}
      </label>
      {why}
      {error && <p className="sw-field-error">{error}</p>}
      <div className="sw-number">
        <span className="sw-number-input">
          {f.unit === 'eur' && <span aria-hidden="true">€</span>}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={f.min}
            max={f.max}
            step={f.step}
            value={num ?? ''}
            placeholder={f.unit === 'eur' ? 'bijv. 3000' : 'bijv. 24'}
            aria-describedby={`${id}-hint`}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {f.unit === 'maanden' && <span>maanden</span>}
        </span>
        <input
          type="range"
          className={num === undefined ? 'is-empty' : ''}
          aria-label={`${f.short}, schuifregelaar`}
          min={f.min}
          max={f.max}
          step={f.step}
          value={num ?? Math.round((f.min! + f.max!) / 2 / f.step!) * f.step!}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <p className="sw-range-hint" id={`${id}-hint`}>
        Tussen {f.unit === 'eur' ? euro(f.min!) : `${f.min} maanden`} en{' '}
        {f.unit === 'eur' ? euro(f.max!) : `${f.max} maanden`}
      </p>
    </div>
  )
}
