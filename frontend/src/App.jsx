import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import SessionPage from './pages/SessionPage'
import CanvasPage from './pages/CanvasPage'
import SummaryPage from './pages/SummaryPage'
import JournalPage from './pages/JournalPage'
import CustomCursor from './components/CustomCursor'

export default function App() {
  return (
    <AppProvider>
      <CustomCursor />
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
