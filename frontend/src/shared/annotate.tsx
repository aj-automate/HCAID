/**
 * "Toon ontwerpkeuzes": een laag over de app die per element laat zien welke
 * AI-UX-richtlijn, welk ethisch risico of welk dark pattern er bewust is ingezet.
 * Bedoeld voor beoordelaars en de peer review, niet voor de eindgebruiker.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import './annotate.css'

export type NoteKind = 'ux' | 'ethiek' | 'dark'

interface NoteItem {
  id: string
  kind: NoteKind
  title: string
  text: string
  misuses?: string
}

interface Ctx {
  on: boolean
  items: NoteItem[]
  register: (item: NoteItem) => void
  unregister: (id: string) => void
}

const NoteContext = createContext<Ctx | null>(null)

const KIND_LABEL: Record<NoteKind, string> = {
  ux: 'AI-UX',
  ethiek: 'Ethiek',
  dark: 'Dark pattern',
}

export function NotesProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const [on, setOn] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('ontwerp') || localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })
  const [items, setItems] = useState<NoteItem[]>([])
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    document.body.classList.toggle('notes-shift', on && panelOpen)
    return () => document.body.classList.remove('notes-shift')
  }, [on, panelOpen])

  const register = useCallback((item: NoteItem) => {
    setItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item]))
  }, [])
  const unregister = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const toggle = () => {
    setOn((v) => {
      try {
        localStorage.setItem(storageKey, v ? '0' : '1')
      } catch {
        /* opslag niet beschikbaar */
      }
      return !v
    })
    setPanelOpen(true)
  }

  // Sorteer op positie in het document, zodat de nummering de leesvolgorde volgt.
  const ordered = useMemo(() => {
    return [...items].sort((a, b) => {
      const ea = document.getElementById(a.id)
      const eb = document.getElementById(b.id)
      if (!ea || !eb) return 0
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
  }, [items])

  const value = useMemo(() => ({ on, items: ordered, register, unregister }), [on, ordered, register, unregister])

  return (
    <NoteContext.Provider value={value}>
      {children}
      <div className="notes-toolbar" role="region" aria-label="Ontwerpkeuzes">
        <button type="button" className="notes-switch" aria-pressed={on} onClick={toggle}>
          <span className="notes-switch-track" aria-hidden="true">
            <span className="notes-switch-thumb" />
          </span>
          Ontwerpkeuzes tonen
        </button>
      </div>
      {on && panelOpen && (
        <aside className="notes-panel" aria-label="Lijst met ontwerpkeuzes">
          <div className="notes-panel-head">
            <strong>Ontwerpkeuzes op dit scherm</strong>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Lijst sluiten">
              Sluiten
            </button>
          </div>
          {ordered.length === 0 && <p className="notes-empty">Op dit scherm zijn geen ontwerpkeuzes gemarkeerd.</p>}
          <ol>
            {ordered.map((n, i) => (
              <li key={n.id} className={`notes-item notes-${n.kind}`}>
                <button
                  type="button"
                  onClick={() => document.getElementById(n.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  <span className="notes-num">{i + 1}</span>
                  <span>
                    <span className="notes-kind">{KIND_LABEL[n.kind]}</span>
                    <span className="notes-title">{n.title}</span>
                    {n.misuses && <span className="notes-misuse">Misbruik van: {n.misuses}</span>}
                    <span className="notes-text">{n.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      )}
      {on && !panelOpen && (
        <button type="button" className="notes-reopen" onClick={() => setPanelOpen(true)}>
          Lijst met ontwerpkeuzes ({ordered.length})
        </button>
      )}
    </NoteContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotesOn() {
  return useContext(NoteContext)?.on ?? false
}

export function Note({
  kind,
  title,
  text,
  misuses,
  children,
  inline = false,
}: {
  kind: NoteKind
  title: string
  text: string
  /** Bij een dark pattern: welke AI-UX-richtlijn hier wordt misbruikt. */
  misuses?: string
  children: ReactNode
  inline?: boolean
}) {
  const ctx = useContext(NoteContext)
  const id = `note-${useId().replace(/:/g, '')}`
  const register = ctx?.register
  const unregister = ctx?.unregister

  useEffect(() => {
    if (!register || !unregister) return
    register({ id, kind, title, text, misuses })
    return () => unregister(id)
  }, [id, kind, title, text, misuses, register, unregister])

  const index = ctx ? ctx.items.findIndex((n) => n.id === id) : -1
  const Tag = inline ? 'span' : 'div'
  return (
    <Tag id={id} className={`note ${ctx?.on ? `note-on note-${kind}` : ''}`}>
      {ctx?.on && (
        <span className="note-chip" title={text}>
          <span className="notes-num">{index + 1}</span>
          {KIND_LABEL[kind]}: {title}
          {misuses ? ` (misbruik van ${misuses})` : ''}
        </span>
      )}
      {children}
    </Tag>
  )
}
