const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

// Graceful fallback wrappers — UI never breaks on missing backend
export const api = {
  chat: (body) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify(body) }).catch(() => ({
      reply: 'What are you noticing in your painting right now?',
    })),

  reflection: (body) =>
    request('/api/reflection', { method: 'POST', body: JSON.stringify(body) }).catch(() => ({
      reflection:
        'You showed up today. You let something move through your hands and onto the canvas. That is not a small thing. Whatever you were carrying when you arrived — you set it down, even briefly, and made something. The colors you chose, the marks you left: they are honest. They belong to you.',
    })),

  saveJournal: (body) =>
    request('/api/journal/save', { method: 'POST', body: JSON.stringify(body) }).catch(() => ({
      ok: true,
    })),

  getJournal: () =>
    request('/api/journal').catch(() => ({ entries: [] })),
}
