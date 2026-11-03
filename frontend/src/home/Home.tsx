import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './home.css'

export default function Home() {
  useEffect(() => {
    document.title = 'Kredietrisico: Schuldwijzer en SnelGeld'
  }, [])

  return (
    <div className="home">
      <header className="home-bar">
        <span className="home-logo">HCAID · Kredietrisico</span>
        <span className="home-sub">Avans Minor AI · 2026</span>
      </header>

      <main className="home-main">
        <p className="home-eyebrow">Ontwerpstudie Human Centered AI Design</p>
        <h1>Eén voorspelling, twee moralen</h1>
        <p className="home-lede">
          Twee apps gebruiken hetzelfde soort neurale netwerk, getraind op dezelfde 1000 leningen, om dezelfde
          vraag te beantwoorden: hoe groot is de kans dat iemand een lening niet kan terugbetalen? De ene app
          gebruikt dat antwoord om mensen te beschermen. De andere om aan ze te verdienen.
        </p>

        <div className="home-apps">
          <section className="home-app home-good">
            <p className="home-tag">Goedaardig</p>
            <h2>Schuldwijzer</h2>
            <p>
              Laat vooraf zien of een lening te dragen is, legt uit waarom, en wijst de weg naar gratis hulp.
              Vraagt zo min mogelijk gegevens en gebruikt geen geslacht, leeftijd of nationaliteit.
            </p>
            <Link className="home-btn home-btn-good" to="/schuldwijzer">
              Open Schuldwijzer
            </Link>
          </section>
          <section className="home-app home-bad">
            <p className="home-tag">Kwaadaardig</p>
            <h2>SnelGeld</h2>
            <p>
              Gebruikt dezelfde risicovoorspelling om juist kwetsbare mensen een dure lening te verkopen. Vraagt
              alles, legt niets uit, en zet druk met tijd, framing en vooraf aangevinkte keuzes.
            </p>
            <Link className="home-btn home-btn-bad" to="/snelgeld">
              Open SnelGeld
            </Link>
          </section>
        </div>

        <section className="home-how">
          <h2>Voor beoordelaars</h2>
          <ol>
            <li>
              Vul in beide apps je eigen gegevens in, of start met persona <strong>Damian</strong> (24, automonteur,
              wil een auto kopen). Elke invoer gaat live naar het model.
            </li>
            <li>
              Zet rechtsonder <strong>Ontwerpkeuzes tonen</strong> aan. Elke AI-UX-richtlijn, elk ethisch risico en
              elk dark pattern wordt dan op het scherm gemarkeerd en uitgelegd.
            </li>
            <li>
              De onderbouwing staat op de <a href="/poster.pdf">poster (PDF)</a> en in de repository: het
              notebook met data-analyse, training en bias-audit.
            </li>
          </ol>
        </section>

        <p className="home-disclaimer">
          SnelGeld is een fictieve, bewust schadelijke ontwerpstudie. Er worden geen leningen verstrekt en geen
          gegevens bewaard. Hulp nodig bij geldzorgen? Kijk op <a href="https://www.geldfit.nl">geldfit.nl</a>.{' '}
          <a href="/logout">Uitloggen</a>
        </p>
      </main>
    </div>
  )
}
