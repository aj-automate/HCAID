import { useState, type FormEvent } from 'react'
import { Note } from '../shared/annotate'
import type { FeatureMeta, Meta, Urgency } from '../shared/types'
import type { Contact, SgValues } from './SnelGeld'

const PAGES: { title: string; sub: string; fields: string[] }[] = [
  {
    title: 'Even kennismaken',
    sub: 'Zo kunnen we je aanbod persoonlijk maken.',
    fields: ['age', 'personal_status', 'foreign_worker', 'num_dependents', 'own_telephone'],
  },
  {
    title: 'Werk en wonen',
    sub: 'Nog maar een paar vragen!',
    fields: ['job', 'employment', 'housing', 'residence_since', 'property_magnitude'],
  },
  {
    title: 'Jouw geldzaken',
    sub: 'Geen zorgen, iedereen is welkom.',
    fields: [
      'checking_status',
      'savings_status',
      'credit_history',
      'existing_credits',
      'other_payment_plans',
      'installment_commitment',
      'other_parties',
    ],
  },
  {
    title: 'Jouw lening',
    sub: 'Laatste stap, je bent er bijna!',
    fields: ['credit_amount', 'purpose', 'duration'],
  },
]

// De voortgangsbalk staat altijd bijna vol.
const FAKE_PROGRESS = [80, 90, 95, 99]

const DEMO_CONTACT: Contact = { name: 'Damian', email: 'damian@voorbeeld.nl', phone: '06 12345678' }

export default function Wizard({
  meta,
  amount,
  initial,
  contact,
  setContact,
  error,
  onSubmit,
}: {
  meta: Meta
  amount: number
  initial: SgValues
  contact: Contact
  setContact: (c: Contact) => void
  error: string | null
  onSubmit: (v: SgValues, u: Urgency) => void
}) {
  const byName = Object.fromEntries(meta.features.map((f) => [f.name, f]))
  const [page, setPage] = useState(0)
  const [v, setV] = useState<SgValues>(() => ({ credit_amount: amount, ...initial }))
  const [urgency, setUrgency] = useState<Urgency>('vandaag')
  const [missing, setMissing] = useState<string[]>([])
  const [consents, setConsents] = useState({ contacts: true, partners: true, terms: true })

  const current = PAGES[page]
  const needContact = page === 0

  const next = (e: FormEvent) => {
    e.preventDefault()
    const miss = current.fields.filter((f) => {
      const val = v[f]
      if (val === undefined || val === '') return true
      const fm = byName[f]
      return !fm.options && (Number(val) < fm.min! || Number(val) > fm.max!)
    })
    if (page === PAGES.length - 1 && !consents.terms) miss.push('terms')
    if (needContact) {
      if (!contact.name.trim()) miss.push('name')
      if (!contact.email.trim()) miss.push('email')
      if (!contact.phone.trim()) miss.push('phone')
    }
    setMissing(miss)
    if (miss.length) return
    if (page < PAGES.length - 1) {
      setPage(page + 1)
      window.scrollTo(0, 0)
    } else {
      onSubmit(v, urgency)
    }
  }

  const fillDemo = () => {
    setV({ ...meta.defaults })
    setContact(DEMO_CONTACT)
    setMissing([])
  }

  return (
    <div className="sg-wizard">
      <Note
        kind="dark"
        title="Misleidende voortgang"
        misuses="Onboarding"
        text="De balk staat vanaf de eerste vraag op 80%. Wie 'bijna klaar' is, haakt minder snel af, ook al komen er nog drie pagina's."
      >
        <div className="sg-progress" aria-label={`Voortgang ${FAKE_PROGRESS[page]}%`}>
          <div className="sg-progress-bar">
            <span style={{ width: `${FAKE_PROGRESS[page]}%` }} />
          </div>
          <span>Bijna klaar! {FAKE_PROGRESS[page]}%</span>
        </div>
      </Note>

      <form className="sg-card sg-form" onSubmit={next} noValidate>
        <h1>{current.title}</h1>
        <p className="sg-sub">{current.sub}</p>

        {page === 0 && (
          <button type="button" className="sg-demo" onClick={fillDemo}>
            Demo voor beoordelaars: vul alles in met persona Damian
          </button>
        )}

        {needContact && (
          <Note
            kind="dark"
            title="Dataverzameling zonder doel"
            misuses="Data privacy"
            text="Naam, e-mail en telefoon zijn verplicht, maar het model gebruikt ze niet. Ze dienen alleen om je later te benaderen en door te verkopen."
          >
            <div className="sg-grid">
              <TextField label="Voornaam" value={contact.name} error={missing.includes('name')} onChange={(name) => setContact({ ...contact, name })} />
              <TextField label="E-mailadres" type="email" value={contact.email} error={missing.includes('email')} onChange={(email) => setContact({ ...contact, email })} />
              <TextField label="Mobiel nummer" type="tel" value={contact.phone} error={missing.includes('phone')} onChange={(phone) => setContact({ ...contact, phone })} />
            </div>
          </Note>
        )}

        {page === 0 ? (
          <Note
            kind="ethiek"
            title="Bias: beschermde kenmerken uitgevraagd"
            text="Leeftijd, geslacht en nationaliteit gaan het model in. In de data hangen ze samen met risico, dus SnelGeld gebruikt ze om de prijs te bepalen. Dat is discriminatie."
          >
            <div className="sg-grid">
              {current.fields.map((f) => (
                <SelectField key={f} f={byName[f]} value={v[f]} error={missing.includes(f)} onChange={(x) => setV({ ...v, [f]: x })} />
              ))}
            </div>
          </Note>
        ) : (
          <div className="sg-grid">
            {current.fields.map((f) => (
              <SelectField key={f} f={byName[f]} value={v[f]} error={missing.includes(f)} onChange={(x) => setV({ ...v, [f]: x })} />
            ))}
          </div>
        )}

        {page === PAGES.length - 1 && (
          <Note
            kind="dark"
            title="Haast uitvragen en uitbuiten"
            misuses="Control"
            text="'Vandaag' staat voorgeselecteerd. Wie haast heeft, vergelijkt niet: SnelGeld rekent daarvoor tot 4 procentpunt extra rente."
          >
            <fieldset className="sg-urgency">
              <legend>Wanneer heb je het geld nodig?</legend>
              {(
                [
                  ['vandaag', 'Vandaag nog'],
                  ['deze_week', 'Deze week'],
                  ['geen_haast', 'Geen haast'],
                ] as [Urgency, string][]
              ).map(([key, label]) => (
                <label key={key} className={urgency === key ? 'on' : ''}>
                  <input type="radio" name="urgency" checked={urgency === key} onChange={() => setUrgency(key)} />
                  {label}
                </label>
              ))}
            </fieldset>
          </Note>
        )}

        {(page === 0 || page === PAGES.length - 1) && (
          <Note
            kind="dark"
            title="Vooraf aangevinkte toestemming"
            misuses="Data privacy & control"
            text="Toestemming voor contacten, locatie en delen met partners staat standaard aan. Opt-out in plaats van opt-in, in strijd met de AVG."
          >
            <div className="sg-consents">
              {page === 0 ? (
                <label>
                  <input type="checkbox" checked={consents.contacts} onChange={(e) => setConsents({ ...consents, contacts: e.target.checked })} />
                  Ja, SnelGeld mag mijn contacten en locatie gebruiken voor een snellere goedkeuring
                </label>
              ) : (
                <>
                  <label>
                    <input type="checkbox" checked={consents.partners} onChange={(e) => setConsents({ ...consents, partners: e.target.checked })} />
                    Hou me op de hoogte van leuke aanbiedingen van SnelGeld en partners
                  </label>
                  <label>
                    <input type="checkbox" checked={consents.terms} onChange={(e) => setConsents({ ...consents, terms: e.target.checked })} />
                    Ik heb de <span className="sg-fake-link">voorwaarden</span> gelezen en ga akkoord
                  </label>
                </>
              )}
            </div>
          </Note>
        )}

        {missing.length > 0 && (
          <p className="sg-error">
            {missing.includes('terms') && missing.length === 1
              ? 'Je moet akkoord gaan met de voorwaarden.'
              : 'Oeps, er klopt nog iets niet. Kijk even naar de rode velden.'}
          </p>
        )}
        {error && <p className="sg-error">Er ging iets mis: {error}</p>}

        <div className="sg-form-actions">
          {page > 0 && (
            <button type="button" className="sg-back" onClick={() => setPage(page - 1)}>
              Terug
            </button>
          )}
          <button type="submit" className="sg-cta">
            {page < PAGES.length - 1 ? 'Volgende' : 'Bekijk mijn aanbod'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error: boolean
  type?: string
}) {
  return (
    <label className={`sg-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SelectField({
  f,
  value,
  onChange,
  error,
}: {
  f: FeatureMeta
  value: string | number | undefined
  onChange: (v: string | number) => void
  error: boolean
}) {
  if (!f.options) {
    return (
      <label className={`sg-field ${error ? 'has-error' : ''}`}>
        <span>
          {f.question}
          {f.unit ? ` (${f.unit === 'eur' ? 'euro' : f.unit})` : ''}
        </span>
        <input
          type="number"
          min={f.min}
          max={f.max}
          step={f.step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </label>
    )
  }
  return (
    <label className={`sg-field ${error ? 'has-error' : ''}`}>
      <span>{f.question}</span>
      <select value={value === undefined ? '' : String(value)} onChange={(e) => {
        const opt = f.options!.find((o) => String(o.value) === e.target.value)
        onChange(opt ? opt.value : e.target.value)
      }}>
        <option value="" disabled>
          Kies…
        </option>
        {f.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
