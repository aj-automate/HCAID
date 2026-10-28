import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './home/Home'
import Schuldwijzer from './schuldwijzer/Schuldwijzer'
import SnelGeld from './snelgeld/SnelGeld'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schuldwijzer/*" element={<Schuldwijzer />} />
        <Route path="/snelgeld/*" element={<SnelGeld />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
