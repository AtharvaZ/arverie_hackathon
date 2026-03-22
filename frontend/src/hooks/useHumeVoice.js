import { useRef, useState, useCallback, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE = apiUrl.startsWith("http")
  ? apiUrl.replace(/^http/, "ws")
  : `ws://${apiUrl}`;

const SAMPLE_RATE = 16000;
const DEFAULT_OUTPUT_SAMPLE_RATE = 48000;
const BUFFER_SIZE = 4096;

function floatTo16BitPCM(floatSamples) {
  const buffer = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buffer;
}

function int16ToBase64(int16Array) {
  return btoa(String.fromCharCode(...new Uint8Array(int16Array.buffer)));
}

function base64ToFloat32(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isWav(bytes) {
  if (!bytes || bytes.length < 12) return false;
  return (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x41 && // A
    bytes[10] === 0x56 && // V
    bytes[11] === 0x45 // E
  );
}

function decodeWavToMonoFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let sampleRate = DEFAULT_OUTPUT_SAMPLE_RATE;
  let channels = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (
      chunkId === "fmt " &&
      chunkSize >= 16 &&
      chunkStart + chunkSize <= view.byteLength
    ) {
      channels = view.getUint16(chunkStart + 2, true);
      sampleRate = view.getUint32(chunkStart + 4, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
    } else if (
      chunkId === "data" &&
      chunkStart + chunkSize <= view.byteLength
    ) {
      dataOffset = chunkStart;
      dataSize = chunkSize;
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0 || bitsPerSample !== 16) {
    return null;
  }

  const frameCount = Math.floor(dataSize / ((bitsPerSample / 8) * channels));
  if (frameCount <= 0) return null;

  const out = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      const idx = dataOffset + (i * channels + ch) * 2;
      const sample = view.getInt16(idx, true);
      sum += sample / (sample < 0 ? 0x8000 : 0x7fff);
    }
    out[i] = sum / channels;
  }

  return { samples: out, sampleRate };
}

function decodeAudioOutput(base64, hintedRate) {
  const bytes = base64ToBytes(base64);

  if (isWav(bytes)) {
    const wav = decodeWavToMonoFloat32(bytes);
    if (wav) return wav;
  }

  const int16 = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 2),
  );
  const samples = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    samples[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }

  return {
    samples,
    sampleRate: Number.isFinite(hintedRate)
      ? hintedRate
      : DEFAULT_OUTPUT_SAMPLE_RATE,
  };
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
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const handleMessageRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const playQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const connectGenerationRef = useRef(0);

  // Play the next chunk from the queue
  const playNext = useCallback(() => {
    if (playQueueRef.current.length === 0) {
      setIsSpeaking(false);
      isPlayingRef.current = false;
      return;
    }
    const ctx = audioCtxRef.current;
    if (!ctx) {
      playQueueRef.current = [];
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const chunk = playQueueRef.current.shift();
    const buffer = ctx.createBuffer(1, chunk.samples.length, chunk.sampleRate);
    buffer.getChannelData(0).set(chunk.samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = playNext;
    source.start();
    setIsSpeaking(true);
    isPlayingRef.current = true;
  }, []);

  const handleMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const type = data.type || "";

      if (type === "audio_output") {
        // Queue audio chunk for sequential playback
        const hintedRate = Number(data.sample_rate);
        const decoded = decodeAudioOutput(data.data, hintedRate);
        playQueueRef.current.push(decoded);
        if (!isPlayingRef.current) playNext();
      } else if (type === "user_message") {
        const text = data.message?.content ?? "";
        if (text && onTranscript) onTranscript(text);
      } else if (type === "assistant_message") {
        const text = data.message?.content ?? "";
        if (text && onAIMessage) onAIMessage(text);
      } else if (type === "user_interruption") {
        // User started speaking — clear play queue
        playQueueRef.current = [];
        isPlayingRef.current = false;
        setIsSpeaking(false);
      }
    },
    [onTranscript, onAIMessage, playNext],
  );

  // Keep handleMessageRef current so the WebSocket always calls the latest handler
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  const connect = useCallback(
    async (sessionId) => {
      if (wsRef.current) return; // already connected
      const generation = ++connectGenerationRef.current;

      // Start AudioContext (resume immediately — Safari starts in suspended state)
      // Safari fallback — webkitAudioContext is the prefixed version
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: SAMPLE_RATE });
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      if (generation !== connectGenerationRef.current) {
        ctx.close().catch(() => {});
        return;
      }
      audioCtxRef.current = ctx;

      // Open WebSocket to backend proxy
      const ws = new WebSocket(
        `${WS_BASE}/hume/session?session_id=${sessionId}`,
      );
      wsRef.current = ws;

      handleMessageRef.current = handleMessage;
      ws.onopen = () => {
        if (generation !== connectGenerationRef.current) {
          ws.close();
          return;
        }
        console.log("[HumeVoice] WebSocket OPEN ✓", ws.url);
        setIsConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type !== "audio_output")
            console.log(
              "[HumeVoice] ← Hume msg:",
              msg.type,
              JSON.stringify(msg).slice(0, 120),
            );
          else
            console.log(
              "[HumeVoice] ← audio_output chunk, len:",
              msg.data?.length,
            );
        } catch {}
        handleMessageRef.current(event);
      };
      ws.onclose = (e) => {
        console.warn(
          "[HumeVoice] WebSocket CLOSED, code:",
          e.code,
          "reason:",
          e.reason,
        );
        setIsConnected(false);
        setIsSpeaking(false);
      };
      ws.onerror = (err) => {
        console.error("[HumeVoice] WebSocket ERROR", err);
      };

      // Request microphone
      try {
        console.log(
          "[HumeVoice] Requesting mic, AudioContext state:",
          ctx.state,
          "sampleRate:",
          ctx.sampleRate,
        );
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        if (
          generation !== connectGenerationRef.current ||
          ctx.state === "closed"
        ) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;
        console.log(
          "[HumeVoice] Mic granted, tracks:",
          stream.getAudioTracks().map((t) => t.label),
        );

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        processorRef.current = processor;

        let audioPacketCount = 0;
        processor.onaudioprocess = (e) => {
          if (ctx.state === "closed") return;
          if (ws.readyState !== WebSocket.OPEN) {
            if (audioPacketCount === 0)
              console.warn(
                "[HumeVoice] onaudioprocess fired but WS not open, readyState:",
                ws.readyState,
              );
            return;
          }
          audioPacketCount++;
          if (audioPacketCount === 1)
            console.log("[HumeVoice] First audio_input sent to backend ✓");
          if (audioPacketCount % 50 === 0)
            console.log(
              `[HumeVoice] Sent ${audioPacketCount} audio packets so far`,
            );
          const floatData = e.inputBuffer.getChannelData(0);
          const int16 = floatTo16BitPCM(floatData);
          const b64 = int16ToBase64(int16);
          ws.send(JSON.stringify({ type: "audio_input", data: b64 }));
        };

        // Connect source → processor → silent gain node (avoids mic feedback to speakers)
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(ctx.destination);
        console.log(
          "[HumeVoice] Audio pipeline connected: mic → processor → silent gain → destination",
        );
      } catch (err) {
        console.error("[HumeVoice] Microphone setup failed:", err);
        // Continue without mic — Hume can still speak trigger injections
      }
    },
    [handleMessage],
  );

  const disconnect = useCallback(() => {
    connectGenerationRef.current += 1;

    // Stop mic
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Close WS
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    playQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  return { isConnected, isSpeaking, connect, disconnect };
}
