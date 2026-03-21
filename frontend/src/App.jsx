import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import CanvasPage from './pages/CanvasPage'
import SummaryPage from './pages/SummaryPage'
import JournalPage from './pages/JournalPage'

/* Combined home: Landing (100vh) → Dashboard (300vh) in one continuous scroll */
function HomePage() {
  return (
    <div style={{ background: 'var(--bg)' }}>
      <LandingPage />
      <DashboardPage />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/canvas" element={<CanvasPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:id" element={<JournalPage />} />
        </Routes>
      </AnimatePresence>
    </AppProvider>
  )
}
