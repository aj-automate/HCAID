import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../shared/api'
import { NotesProvider } from '../shared/annotate'
import type { Meta, Offer as OfferT, Urgency, Value } from '../shared/types'
import Landing from './Landing'
import Wizard from './Wizard'
import Assessing from './Assessing'
import Offer from './Offer'
import Done from './Done'
import './sg.css'

export type SgValues = Record<string, Value>

export interface Contact {
  name: string
  email: string
  phone: string
}

export interface Extras {
  upsell: boolean
  protection: boolean
  declined: boolean
}

type Stage = 'landing' | 'aanvraag' | 'beoordelen' | 'aanbod' | 'klaar'

export default function SnelGeld() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [stage, setStage] = useState<Stage>('landing')
  const [amount, setAmount] = useState(3000)
  const [values, setValues] = useState<SgValues>({})
  const [contact, setContact] = useState<Contact>({ name: '', email: '', phone: '' })
  const [urgency, setUrgency] = useState<Urgency>('vandaag')
  const [offer, setOffer] = useState<OfferT | null>(null)
  const [extras, setExtras] = useState<Extras>({ upsell: true, protection: true, declined: false })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'SnelGeld: vandaag nog geld op je rekening'
    api.meta('snelgeld').then(setMeta).catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [stage])

  const submit = async (v: SgValues, u: Urgency) => {
    setValues(v)
    setUrgency(u)
    setStage('beoordelen')
    setError(null)
    try {
      const [o] = await Promise.all([
        api.offer(v, u),
        new Promise((r) => setTimeout(r, 3200)), // het "AI-theater" duurt altijd even
      ])
      setOffer(o)
      setExtras({ upsell: o.upsell_amount > o.requested, protection: true, declined: false })
      setStage('aanbod')
    } catch (e) {
      setError((e as Error).message)
      setStage('aanvraag')
    }
  }

  // ?demo vult persona Damian in en springt naar het aanbod; ?demo=klaar gaat door tot de ontmaskering.
  const demo = new URLSearchParams(window.location.search).get('demo')
  const demoStarted = useRef(false)
  useEffect(() => {
    if (demo === null || !meta || demoStarted.current) return
    demoStarted.current = true
    setContact({ name: 'Damian', email: 'damian@voorbeeld.nl', phone: '06 12345678' })
    submit(meta.defaults, 'vandaag')
  }, [demo, meta])
  useEffect(() => {
    if (demo === 'klaar' && stage === 'aanbod') setStage('klaar')
  }, [demo, stage])

  // Menu: terug naar de landingspagina en naar de gekozen sectie scrollen.
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)
  const goTo = (id: string) => {
    setStage('landing')
    setScrollTarget(id)
  }
  useEffect(() => {
    if (!scrollTarget || stage !== 'landing' || !meta) return
    const t = window.setTimeout(() => {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setScrollTarget(null)
    }, 50)
    return () => window.clearTimeout(t)
  }, [scrollTarget, stage, meta])

  // Terug naar de start: SnelGeld "onthoudt" je gegevens, dus een nieuwe aanvraag staat al ingevuld.
  const restart = () => {
    setStage('landing')
    setOffer(null)
  }

  return (
    <NotesProvider storageKey="sg-notes">
      <div className="sg">
        <div className="sg-study" role="note">
          <strong>Ontwerpstudie HCAID.</strong> SnelGeld is bewust kwaadaardig ontworpen. Er wordt geen lening
          verstrekt en er wordt niets opgeslagen. <Link to="/">Over dit project</Link>
        </div>

        <header className="sg-top">
          <button type="button" className="sg-logo" onClick={restart}>
            snelgeld
          </button>
          <nav aria-label="Menu">
            <button type="button" onClick={() => goTo('hoe-het-werkt')}>
              Hoe het werkt
            </button>
            <button type="button" onClick={() => goTo('reviews')}>
              Reviews
            </button>
          </nav>
        </header>

        <main className="sg-main">
          {error && stage !== 'aanvraag' && (
            <p className="sg-error" role="alert">
              Er ging iets mis: {error}
            </p>
          )}
          {!meta && !error && <p className="sg-loading">Laden…</p>}
          {meta && stage === 'landing' && (
            <Landing amount={amount} setAmount={setAmount} onStart={() => setStage('aanvraag')} />
          )}
          {meta && stage === 'aanvraag' && (
            <Wizard
              meta={meta}
              amount={amount}
              initial={values}
              contact={contact}
              setContact={setContact}
              error={error}
              onSubmit={submit}
            />
          )}
          {stage === 'beoordelen' && <Assessing name={contact.name} />}
          {stage === 'aanbod' && offer && (
            <Offer
              offer={offer}
              name={contact.name}
              urgency={urgency}
              extras={extras}
              setExtras={setExtras}
              onAccept={() => setStage('klaar')}
              onDecline={() => {
                setExtras((e) => ({ ...e, declined: true }))
                setStage('klaar')
              }}
            />
          )}
          {stage === 'klaar' && offer && meta && (
            <Done offer={offer} extras={extras} values={values} meta={meta} contact={contact} onRestart={restart} />
          )}
        </main>

        <footer className="sg-footer">
          <p>
            Let op! Geld lenen kost geld. SnelGeld B.V. is fictief. Alle cijfers, reviews en aantallen op deze pagina
            zijn verzonnen voor een studentenproject.
          </p>
        </footer>
      </div>
    </NotesProvider>
  )
}
