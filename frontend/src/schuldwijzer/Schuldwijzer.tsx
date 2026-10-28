import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../shared/api'
import { NotesProvider } from '../shared/annotate'
import type { Meta, Prediction, Value } from '../shared/types'
import Intro from './Intro'
import Form from './Form'
import Result from './Result'
import NextStep from './NextStep'
import ModelInfo from './ModelInfo'
import Privacy from './Privacy'
import './sw.css'

export type Values = Record<string, Value>

export interface SwState {
  meta: Meta
  values: Values | null
  firstPrediction: Prediction | null
  prediction: Prediction | null
  loading: boolean
  error: string | null
  setValues: (v: Values) => void
  submit: (v: Values) => Promise<void>
  update: (v: Values) => void
  clearAll: () => void
  cleared: boolean
}

const STEPS = [
  { path: 'gegevens', label: '1. Gegevens' },
  { path: 'uitkomst', label: '2. Uitkomst' },
  { path: 'volgende-stap', label: '3. Volgende stap' },
]

export default function Schuldwijzer() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Values | null>(null)
  const [firstPrediction, setFirstPrediction] = useState<Prediction | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const reqId = useRef(0)
  const location = useLocation()

  useEffect(() => {
    document.title = 'Schuldwijzer: weet of je een lening kunt dragen'
    api.meta('schuldwijzer').then(setMeta).catch((e: Error) => setLoadError(e.message))
  }, [])

  const run = useCallback(async (v: Values, first: boolean) => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const p = await api.predict(v)
      if (id !== reqId.current) return // een nieuwere aanvraag is onderweg
      setPrediction(p)
      if (first) setFirstPrediction(p)
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  const submit = useCallback(
    async (v: Values) => {
      setValues(v)
      setCleared(false)
      await run(v, true)
    },
    [run],
  )

  // Voor "probeer zelf": kleine wijzigingen live doorrekenen, zonder te flitsen.
  const debounce = useRef<number | undefined>(undefined)
  const update = useCallback(
    (v: Values) => {
      setValues(v)
      window.clearTimeout(debounce.current)
      debounce.current = window.setTimeout(() => run(v, false), 180)
    },
    [run],
  )

  const clearAll = useCallback(() => {
    setValues(null)
    setPrediction(null)
    setFirstPrediction(null)
    setCleared(true)
  }, [])

  const stepIndex = STEPS.findIndex((s) => location.pathname.endsWith(s.path))

  return (
    <NotesProvider storageKey="sw-notes">
      <div className="sw">
        <a className="sw-skip" href="#sw-main">
          Naar de inhoud
        </a>
        <header className="sw-bar">
          <Link to="/schuldwijzer" className="sw-logo">
            Schuldwijzer
          </Link>
          <nav aria-label="Hoofdmenu">
            <NavLink to="/schuldwijzer/hoe-het-werkt">Hoe het werkt</NavLink>
            <NavLink to="/schuldwijzer/jouw-gegevens">Jouw gegevens</NavLink>
            <NavLink to="/schuldwijzer/volgende-stap">Hulp</NavLink>
          </nav>
        </header>

        {stepIndex >= 0 && (
          <ol className="sw-steps" aria-label="Voortgang">
            {STEPS.map((s, i) => (
              <li key={s.path} className={i === stepIndex ? 'on' : i < stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
        )}

        <main id="sw-main" className="sw-main">
          {loadError && (
            <div className="sw-error" role="alert">
              <strong>Het model is nu niet bereikbaar.</strong> {loadError} Probeer het over een minuut opnieuw.
            </div>
          )}
          {!meta && !loadError && <p className="sw-loading">Even laden…</p>}
          {meta && (
            <SwRoutes
              state={{
                meta,
                values,
                firstPrediction,
                prediction,
                loading,
                error,
                setValues,
                submit,
                update,
                clearAll,
                cleared,
              }}
            />
          )}
        </main>

        <footer className="sw-footer">
          <p>
            Schuldwijzer is een studentenproject (HCAID, Avans Minor AI). Het geeft een inschatting, geen
            financieel advies en geen besluit over een lening. Geldzorgen? <a href="https://www.geldfit.nl">Geldfit</a>{' '}
            helpt gratis en anoniem.
          </p>
          <Link to="/">Over deze ontwerpstudie</Link>
        </footer>
      </div>
    </NotesProvider>
  )
}

function SwRoutes({ state }: { state: SwState }) {
  const navigate = useNavigate()
  return (
    <Routes>
      <Route
        index
        element={
          <Intro
            onStart={() => navigate('/schuldwijzer/gegevens')}
            onExample={async () => {
              await state.submit(state.meta.defaults)
              navigate('/schuldwijzer/uitkomst')
            }}
          />
        }
      />
      <Route path="gegevens" element={<Form state={state} onDone={() => navigate('/schuldwijzer/uitkomst')} />} />
      <Route
        path="uitkomst"
        element={state.values ? <Result state={state} /> : <Navigate to="/schuldwijzer/gegevens" replace />}
      />
      <Route path="volgende-stap" element={<NextStep state={state} />} />
      <Route path="hoe-het-werkt" element={<ModelInfo meta={state.meta} />} />
      <Route path="jouw-gegevens" element={<Privacy state={state} />} />
      <Route path="*" element={<Navigate to="/schuldwijzer" replace />} />
    </Routes>
  )
}
