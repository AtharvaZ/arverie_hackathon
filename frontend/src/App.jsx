import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import SessionPage from './pages/SessionPage'
import CanvasPage from './pages/CanvasPage'
import SummaryPage from './pages/SummaryPage'
import JournalPage from './pages/JournalPage'

export default function App() {
  return (
    <AppProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingPage />} />
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
