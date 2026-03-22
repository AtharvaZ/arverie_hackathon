import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

function getOrCreateUserId() {
  const key = 'arverie_user_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

const defaultSession = {
  // Identification
  sessionId: null,
  userId: getOrCreateUserId(),

  // Pre-session intake
  mood: null,
  moodColor: null,
  guided: null,
  intakeText: '',       // "what's on your mind?" optional text
  guideTheme: null,     // guided mode: 'emotion-anchored' | 'body-based' | 'narrative'

  // From /session/intake response
  themes: [],
  drawingPrompt: null,
  openingResponse: null,

  // Session runtime
  startTime: null,

  // Canvas behavioral data (accumulated during session)
  paintColors: [],
  erasureCount: 0,
  idleTime: 0,

  // Dialogue (Hume transcripts + trigger responses)
  dialogueHistory: [],

  // From /session/end response
  drawingDataURL: null,
  drawingUrl: null,
  visionDescription: null,
  reflectionQuestions: [],
  canvasSummary: null,
}

export function AppProvider({ children }) {
  const [soundOn, setSoundOn] = useState(true)
  const [session, setSession] = useState(defaultSession)

  const resetSession = useCallback(() => {
    setSession((s) => ({
      ...defaultSession,
      userId: s.userId, // preserve userId across resets
    }))
  }, [])

  // Append a message to dialogueHistory
  const appendDialogue = useCallback((entry) => {
    setSession((s) => ({
      ...s,
      dialogueHistory: [...s.dialogueHistory, entry],
    }))
  }, [])

  return (
    <AppContext.Provider
      value={{
        soundOn, setSoundOn,
        session, setSession,
        resetSession,
        appendDialogue,
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
