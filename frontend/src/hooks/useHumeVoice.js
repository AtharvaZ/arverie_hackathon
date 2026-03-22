import { useRef, useState, useCallback, useEffect } from 'react'

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws')

const SAMPLE_RATE = 16000
const BUFFER_SIZE = 4096

function floatTo16BitPCM(floatSamples) {
  const buffer = new Int16Array(floatSamples.length)
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]))
    buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return buffer
}

function int16ToBase64(int16Array) {
  return btoa(String.fromCharCode(...new Uint8Array(int16Array.buffer)))
}

function base64ToFloat32(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const int16 = new Int16Array(bytes.buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}

/**
 * Manages Hume EVI voice connection through the backend WebSocket proxy.
 * The backend at /hume/session proxies to Hume's EVI API.
 *
 * Exposes:
 *   isConnected — WS is open
 *   isSpeaking  — AI is currently speaking (audio playing)
 *   connect(sessionId) — open WS + start mic
 *   disconnect() — close WS + stop mic
 */
export function useHumeVoice({ onTranscript, onAIMessage } = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const handleMessageRef = useRef(null)
  const micStreamRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const playQueueRef = useRef([])
  const isPlayingRef = useRef(false)

  // Play the next chunk from the queue
  const playNext = useCallback(() => {
    if (playQueueRef.current.length === 0) {
      setIsSpeaking(false)
      isPlayingRef.current = false
      return
    }
    const ctx = audioCtxRef.current
    if (!ctx) {
      playQueueRef.current = []
      isPlayingRef.current = false
      setIsSpeaking(false)
      return
    }

    const float32 = playQueueRef.current.shift()
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = playNext
    source.start()
    setIsSpeaking(true)
    isPlayingRef.current = true
  }, [])

  const handleMessage = useCallback((event) => {
    let data
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }

    const type = data.type || ''

    if (type === 'audio_output') {
      // Queue audio chunk for sequential playback
      const float32 = base64ToFloat32(data.data)
      playQueueRef.current.push(float32)
      if (!isPlayingRef.current) playNext()
    } else if (type === 'user_message') {
      const text = data.message?.content ?? ''
      if (text && onTranscript) onTranscript(text)
    } else if (type === 'assistant_message') {
      const text = data.message?.content ?? ''
      if (text && onAIMessage) onAIMessage(text)
    } else if (type === 'user_interruption') {
      // User started speaking — clear play queue
      playQueueRef.current = []
      isPlayingRef.current = false
      setIsSpeaking(false)
    }
  }, [onTranscript, onAIMessage, playNext])

  // Keep handleMessageRef current so the WebSocket always calls the latest handler
  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  const connect = useCallback(async (sessionId) => {
    if (wsRef.current) return // already connected

    // Start AudioContext (resume immediately — Safari starts in suspended state)
    // Safari fallback — webkitAudioContext is the prefixed version
    // @ts-ignore
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx({ sampleRate: SAMPLE_RATE })
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    audioCtxRef.current = ctx

    // Open WebSocket to backend proxy
    const ws = new WebSocket(`${WS_BASE}/hume/session?session_id=${sessionId}`)
    wsRef.current = ws

    handleMessageRef.current = handleMessage
    ws.onopen = () => {
      setIsConnected(true)
    }
    ws.onmessage = (event) => handleMessageRef.current(event)
    ws.onclose = () => {
      setIsConnected(false)
      setIsSpeaking(false)
    }
    ws.onerror = (err) => {
      console.error('[HumeVoice] WebSocket error', err)
    }

    // Request microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      micStreamRef.current = stream

      // Resample to 16kHz if needed (most browsers use 44.1kHz or 48kHz)
      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      // ScriptProcessorNode: captures PCM, encodes to linear16, sends over WS
      // (deprecated but widely supported; AudioWorklet would be the modern approach)
      const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return
        const floatData = e.inputBuffer.getChannelData(0)
        const int16 = floatTo16BitPCM(floatData)
        const b64 = int16ToBase64(int16)
        ws.send(JSON.stringify({ type: 'audio_input', data: b64 }))
      }

      source.connect(processor)
      processor.connect(ctx.destination)
    } catch (err) {
      console.error('[HumeVoice] Microphone access denied:', err)
      // Continue without mic — Hume can still speak trigger injections
    }
  }, [handleMessage])

  const disconnect = useCallback(() => {
    // Stop mic
    if (processorRef.current) {
      try { processorRef.current.disconnect() } catch {}
      processorRef.current = null
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch {}
      sourceRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }

    // Close WS
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    playQueueRef.current = []
    isPlayingRef.current = false
    setIsConnected(false)
    setIsSpeaking(false)
  }, [])

  return { isConnected, isSpeaking, connect, disconnect }
}
