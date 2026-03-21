import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

const defaultSession = {
  mood: null,
  moodColor: null,
  guided: null,
  startTime: null,
  drawingDataURL: null,
  paintColors: [],
  erasureCount: 0,
  idleTime: 0,
}

export function AppProvider({ children }) {
  const [soundOn, setSoundOn] = useState(true)
  const [user] = useState({ name: 'Priyanshi' })
  const [session, setSession] = useState(defaultSession)
  const [reflection, setReflection] = useState(null)

  const resetSession = useCallback(() => {
    setSession(defaultSession)
    setReflection(null)
  }, [])

  return (
    <AppContext.Provider
      value={{
        soundOn, setSoundOn,
        user,
        session, setSession,
        reflection, setReflection,
        resetSession,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
