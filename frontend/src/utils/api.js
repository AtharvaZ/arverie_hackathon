const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${path}: ${body}`)
  }
  return res.json()
}

export const api = {
  // POST /session/start — creates session row, returns { session_id }
  startSession: (userId) =>
    request('/session/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  // POST /session/intake — extracts themes from text, returns { themes, drawing_prompt, opening_response }
  sendIntake: (sessionId, transcript, moodCheckin) =>
    request('/session/intake', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        transcript,
        mood_checkin: moodCheckin,
      }),
    }),

  // POST /session/canvas-snapshot — processes behavioral metrics, may return trigger
  sendSnapshot: (sessionId, snapshot, dialogueHistory, intakeThemes) =>
    request('/session/canvas-snapshot', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        snapshot,
        dialogue_history: dialogueHistory,
        intake_themes: intakeThemes,
      }),
    }),

  // POST /session/end — uploads drawing, runs vision, generates questions
  endSession: (sessionId, imageBase64, canvasSummary, dialogueHistory) =>
    request('/session/end', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        image_base64: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        canvas_summary: canvasSummary,
        dialogue_history: dialogueHistory,
      }),
    }),

  // POST /session/complete — generates letter, saves to Supabase
  completeSession: (sessionId, userId, { moodCheckout, userAnswers, durationSeconds, fullSessionData }) =>
    request('/session/complete', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        mood_checkout: moodCheckout,
        user_answers: userAnswers,
        duration_seconds: durationSeconds,
        full_session_data: fullSessionData,
      }),
    }),

  // GET /sessions/{user_id} — returns last 7 sessions
  getSessions: (userId) => request(`/sessions/${userId}`),
}
