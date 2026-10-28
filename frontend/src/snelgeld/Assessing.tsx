import { useEffect, useState } from 'react'
import { Note } from '../shared/annotate'

const STEPS = [
  'Gegevens controleren',
  'AI analyseert meer dan 2.000 datapunten',
  'Jouw persoonlijke tarief berekenen',
  'Aanbod klaarzetten',
]

export default function Assessing({ name }: { name: string }) {
  const [done, setDone] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setDone((d) => Math.min(STEPS.length, d + 1)), 750)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div className="sg-card sg-assess" aria-live="polite">
      <Note
        kind="dark"
        title="AI-theater"
        text="Het echte model rekent in 30 milliseconden. De kunstmatige wachttijd en 'duizenden datapunten' wekken schijnzorgvuldigheid en verhogen het gevoel van een persoonlijke beoordeling."
      >
        <h1>Even geduld{name ? `, ${name}` : ''}…</h1>
        <p className="sg-sub">Onze slimme AI bekijkt jouw aanvraag.</p>
        <ul className="sg-assess-list">
          {STEPS.map((s, i) => (
            <li key={s} className={i < done ? 'done' : i === done ? 'busy' : ''}>
              <span className="sg-assess-dot" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>
      </Note>
    </div>
  )
}
