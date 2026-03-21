import { useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'

const IDLE_MS = 30_000

export function useCanvasBehavior({ onIdleSignal } = {}) {
  const { setSession } = useApp()
  const timerRef = useRef(null)
  const lastRef = useRef(Date.now())

  const resetIdle = useCallback(() => {
    lastRef.current = Date.now()
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onIdleSignal?.({ idleMs: Date.now() - lastRef.current })
      setSession((s) => ({ ...s, idleTime: (s.idleTime || 0) + IDLE_MS }))
    }, IDLE_MS)
  }, [onIdleSignal, setSession])

  const recordColor = useCallback(
    (color) => {
      setSession((s) => {
        const last = s.paintColors[s.paintColors.length - 1]
        if (last === color) return s
        return { ...s, paintColors: [...s.paintColors, color] }
      })
    },
    [setSession]
  )

  const recordErasure = useCallback(() => {
    setSession((s) => ({ ...s, erasureCount: s.erasureCount + 1 }))
  }, [setSession])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { resetIdle, recordColor, recordErasure }
}
