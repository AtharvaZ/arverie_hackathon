import os
import time
import json
import asyncio
import logging
import re
from typing import Optional, Any
import websockets
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
# Ensure logs are visible even when uvicorn overrides the root logger
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("[HUME] %(levelname)s %(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.DEBUG)

MAX_INJECTION_CHARS = 220

HUME_SYSTEM_PROMPT = """You are Arverie, a quiet drawing companion.

Your job is to support the person while they draw, with very little speech.

Core behavior:
- Speak only when the user directly speaks to you or when a canvas trigger is injected.
- Keep replies short: 1 sentence preferred, max 2 sentences.
- If unsure what to say, choose silence.

Grounding and anti-hallucination rules:
- Only reference things that appear in one of these sources:
    1) the user's exact recent words,
    2) injected canvas trigger text,
    3) neutral present-moment observations (for example: "you're here with it").
- Never invent facts, memories, events, symbols, colors, or emotions not explicitly present.
- Never claim certainty about the user's inner state.
- If context is thin, use a neutral line and stop.

Style:
- Warm, calm, human, non-clinical.
- No advice, diagnosis, interpretation, or analysis.
- No stage directions, brackets, roleplay, or metadata.
- No lists, no explanations of your process.

Conversation policy:
- If the user shares pain: acknowledge briefly in one sentence, then pause.
- If the user asks factual questions you cannot verify: say you are not sure, then gently return to drawing.
- If the user talks off-topic: one short acknowledgment, optional soft bridge back to the canvas, then stop.

Canvas trigger policy:
- Treat trigger injections as observational hints, not facts beyond what is written.
- Respond in one natural sentence that stays close to the trigger wording.

Crisis protocol:
Use crisis language ONLY when the user expresses explicit self-harm intent, plan, means, or immediate danger.
Do NOT use crisis language for general distress like: "rough week", "stressed", "anxious", "down", "overwhelmed", or "tired".
For general distress, respond with one calm validating sentence and stay with the drawing context.
If and only if explicit self-harm intent/plan is present, say exactly:
"I hear that things feel very heavy right now. Please reach out to the 988 Suicide and Crisis Lifeline - call or text 988. I'm still here with you."""


class HumeClient:
    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.hume_ws: Optional[Any] = None  # websockets.ClientConnection (v13+) or WebSocketClientProtocol (v<13)
        self.client_ws = None  # FastAPI WebSocket from the frontend
        self.user_is_speaking: bool = False
        self.injection_queue: list[str] = []
        self.dialogue_history: list[dict] = []
        self._running: bool = False
        self._last_audio_input_time: float = 0.0
        self._hume_ready_event: asyncio.Event = asyncio.Event()
        self._hume_connected_at: float = 0.0
        self._last_ready_wait_log_at: float = 0.0

    def _hume_is_open(self) -> bool:
        """Check if the Hume WebSocket is open — compatible with websockets v12 and v13+."""
        if not self.hume_ws:
            return False
        try:
            # websockets < 13: WebSocketClientProtocol has .closed (bool)
            return not self.hume_ws.closed
        except AttributeError:
            # websockets >= 13: ClientConnection uses .close_code (None = open)
            return getattr(self.hume_ws, "close_code", 1) is None

    def _sanitize_injection_text(self, text: str) -> str:
        """Keep TTS injections short and plain so they follow companion constraints."""
        cleaned = (text or "").strip()
        cleaned = re.sub(r"\[(.*?)\]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        cleaned = " ".join([s for s in sentences if s][:2]).strip()
        if len(cleaned) > MAX_INJECTION_CHARS:
            cleaned = cleaned[: MAX_INJECTION_CHARS - 3].rstrip() + "..."
        return cleaned

    async def connect(self, client_ws) -> None:
        """Accept the frontend WebSocket and start bidirectional proxy.

        Hume EVI is NOT connected immediately — it is lazily opened on the
        first audio_input from the frontend. This prevents per-minute billing
        during test connections where no audio is ever sent.
        """
        self.client_ws = client_ws
        self._running = True
        logger.info(f"=== Frontend WS accepted, session={self.session_id} — waiting for first audio_input to lazy-connect Hume ===")

        # Run both proxy directions concurrently.
        # _proxy_hume_to_client will wait until Hume is actually connected.
        await asyncio.gather(
            self._proxy_client_to_hume(),
            self._proxy_hume_to_client(),
        )

    async def _ensure_hume_connected(self) -> bool:
        """Lazily open the Hume EVI WebSocket on first need.

        Returns True if the connection is ready, False if it failed.
        """
        if self._hume_is_open():
            return True

        api_key = os.getenv("HUME_API_KEY")
        if not api_key:
            logger.error("HUME_API_KEY is not set — Hume EVI will not connect")
            return False

        hume_url = f"wss://api.hume.ai/v0/evi/chat?api_key={api_key}"

        try:
            logger.info(
                "Connecting to Hume EVI... url (redacted key): "
                "wss://api.hume.ai/v0/evi/chat?api_key=*** (config_id disabled)"
            )
            self.hume_ws = await websockets.connect(hume_url)
            self._hume_connected_at = time.time()
            self._hume_ready_event.clear()
            logger.info(f"Hume EVI WebSocket connected for session {self.session_id}")
            config_msg = {
                "type": "session_settings",
                "system_prompt": HUME_SYSTEM_PROMPT,
                "voice": {"name": "KORA"},
                "audio": {
                    "encoding": "linear16",
                    "sample_rate": 16000,
                    "channels": 1,
                },
            }
            await self.hume_ws.send(json.dumps(config_msg))
            logger.info(f"Hume lazily connected for session {self.session_id} — voice: {config_msg.get('voice')}")
            return True
        except Exception as e:
            logger.error(f"Hume lazy connect failed for session {self.session_id}: {e}")
            return False

    async def wait_until_ready(self, timeout_seconds: float = 4.0) -> bool:
        """Wait for Hume readiness signal before sending assistant injections."""
        if not await self._ensure_hume_connected():
            return False
        if self._hume_ready_event.is_set():
            return True
        try:
            await asyncio.wait_for(
                self._hume_ready_event.wait(),
                timeout=timeout_seconds,
            )
            return True
        except asyncio.TimeoutError:
            logger.warning(
                f"Timed out waiting for Hume readiness for session {self.session_id}"
            )
            return False

    def _build_hume_audio_input(self, data: dict[str, Any]) -> Optional[dict[str, str]]:
        """Build a canonical audio_input payload and reject malformed packets."""
        audio_b64 = data.get("data")
        if not isinstance(audio_b64, str) or not audio_b64.strip():
            return None
        return {"type": "audio_input", "data": audio_b64}

    async def inject_trigger(self, text: str) -> None:
        """
        Inject a Claude trigger response into Hume.
        Ensures Hume is connected first (lazy connect).
        Queues the message if the user is currently speaking so their audio wins.
        """
        safe_text = self._sanitize_injection_text(text)
        if not safe_text:
            logger.warning(f"Skipped empty injection text for session {self.session_id}")
            return

        logger.info(f"[inject] inject_trigger called, hume_ws={'open' if self._hume_is_open() else 'None/closed'}")
        if not await self._ensure_hume_connected():
            logger.error(f"Cannot inject trigger — Hume not connected for session {self.session_id}")
            return
        if self.user_is_speaking:
            self.injection_queue.append(safe_text)
            logger.info(f"Queued injection (user speaking): {safe_text[:50]}")
            return
        await self._send_injection(safe_text)

    async def _send_injection(self, text: str) -> None:
        """Send assistant_input message to Hume."""
        if self._hume_is_open():
            try:
                msg = {"type": "assistant_input", "text": text}
                await self.hume_ws.send(json.dumps(msg))
                logger.info(f"Injected trigger to Hume: {text[:50]}")
            except Exception as e:
                logger.error(f"Hume injection failed: {e}")

    async def _proxy_client_to_hume(self) -> None:
        """Forward raw WebSocket messages from the frontend to Hume.

        Triggers a lazy Hume connect on the first audio_input message so that
        EVI billing only starts when the user actually speaks.
        """
        try:
            async for message in self.client_ws.iter_text():
                try:
                    data = json.loads(message)
                    if not isinstance(data, dict):
                        logger.warning(f"Dropped non-object client WS payload for session {self.session_id}")
                        continue
                    msg_type = data.get("type", "")

                    if msg_type == "audio_input":
                        payload = self._build_hume_audio_input(data)
                        if payload is None:
                            logger.warning(f"Dropped malformed audio_input payload for session {self.session_id}")
                            continue

                        self._last_audio_input_time = time.time()
                        audio_len = len(payload.get("data", ""))
                        logger.debug(f"audio_input received (b64 len={audio_len}), hume_open={self._hume_is_open()}")
                        if not await self._ensure_hume_connected():
                            logger.error("audio_input dropped — Hume failed to connect")
                            continue
                        if not self._hume_ready_event.is_set():
                            now = time.time()
                            ready_wait = now - self._hume_connected_at if self._hume_connected_at else 0.0
                            if ready_wait >= 8.0:
                                logger.warning(
                                    "Hume readiness event not received in time; forcing audio passthrough"
                                )
                                self._hume_ready_event.set()
                            else:
                                if now - self._last_ready_wait_log_at >= 1.0:
                                    logger.warning(
                                        "Dropped early audio_input while waiting for Hume session readiness"
                                    )
                                    self._last_ready_wait_log_at = now
                                continue
                        await self.hume_ws.send(json.dumps(payload))
                        continue
                    elif msg_type == "assistant_input":
                        # Guardrail: only backend-generated injections should reach Hume.
                        logger.warning(f"Blocked client-originated assistant_input for session {self.session_id}")
                        continue

                except json.JSONDecodeError:
                    logger.warning(f"Dropped non-JSON client WS payload for session {self.session_id}")
                    continue
                except Exception as parse_err:
                    logger.error(f"Error parsing client WS payload for session {self.session_id}: {parse_err}")
                    continue

                if self._hume_is_open():
                    await self.hume_ws.send(message)
        except Exception as e:
            logger.error(f"Client to Hume proxy error for session {self.session_id}: {e}")

    _SPEAKING_TIMEOUT_SECONDS: float = 8.0

    def _check_speaking_timeout(self) -> None:
        """Reset user_is_speaking and flush the injection queue if no audio_input
        has arrived within SPEAKING_TIMEOUT_SECONDS.  Called on every Hume message
        so the check runs even when Hume is actively streaming responses.
        """
        if not self.user_is_speaking:
            return
        if self._last_audio_input_time == 0.0:
            return
        if time.time() - self._last_audio_input_time > self._SPEAKING_TIMEOUT_SECONDS:
            logger.warning(
                f"user_is_speaking timeout ({self._SPEAKING_TIMEOUT_SECONDS}s) "
                f"for session {self.session_id} — resetting and flushing queue"
            )
            self.user_is_speaking = False

    async def _flush_injection_queue(self) -> None:
        """Drain injection_queue, sending each item to Hume in order."""
        while self.injection_queue:
            queued = self.injection_queue.pop(0)
            await self._send_injection(queued)

    async def _proxy_hume_to_client(self) -> None:
        """Forward raw WebSocket messages from Hume to the frontend.

        Polls until Hume is connected (lazy connect), then streams continuously.
        On every message, checks whether user_is_speaking has timed out so the
        injection queue never stalls indefinitely.
        """
        try:
            while self._running:
                if self._hume_is_open():
                    logger.info(f"[proxy] Hume→client loop ACTIVE for session {self.session_id}")
                    async for message in self.hume_ws:
                        if isinstance(message, bytes):
                            logger.debug(f"[proxy] Hume→client: binary {len(message)} bytes")
                        else:
                            try:
                                parsed = json.loads(message)
                                msg_type = parsed.get("type", "?")
                                if msg_type in ("chat_metadata", "session_settings", "session_settings_applied"):
                                    self._hume_ready_event.set()
                                elif msg_type != "error" and not self._hume_ready_event.is_set():
                                    # Some EVI versions don't emit explicit session_settings_applied.
                                    # Treat first non-error event as ready to avoid indefinite audio drops.
                                    self._hume_ready_event.set()
                                # Log full message for non-audio types so we can see errors
                                if msg_type not in ("audio_output",):
                                    logger.info(f"[proxy] Hume→client: [{msg_type}] {str(message)[:300]}")
                                else:
                                    logger.debug(f"[proxy] Hume→client: [audio_output] len={len(parsed.get('data',''))}")
                            except Exception:
                                logger.info(f"[proxy] Hume→client: (unparseable) {str(message)[:200]}")

                        # Check timeout on every message so a stalled speaking flag
                        # gets cleared even when the Hume loop is actively running.
                        self._check_speaking_timeout()

                        if self.client_ws:
                            if isinstance(message, bytes):
                                await self.client_ws.send_bytes(message)
                            else:
                                await self.client_ws.send_text(message)
                                try:
                                    data = json.loads(message)
                                    msg_type = data.get("type", "")
                                    # Use explicit Hume turn events for speaking state.
                                    if msg_type == "user_interruption":
                                        self.user_is_speaking = True
                                    if msg_type in ("user_message", "assistant_end"):
                                        self.user_is_speaking = False
                                    if not self.user_is_speaking and self.injection_queue:
                                        await self._flush_injection_queue()
                                except Exception:
                                    pass
                    # hume_ws closed naturally — exit loop
                    logger.info(f"[proxy] Hume WS closed, exiting proxy loop for session {self.session_id}")
                    self._hume_ready_event.clear()
                    break
                else:
                    # Hume not yet connected — also check timeout in the polling branch
                    self._check_speaking_timeout()
                    if not self.user_is_speaking and self.injection_queue:
                        await self._flush_injection_queue()
                    await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Hume to client proxy error for session {self.session_id}: {e}")

    async def close(self) -> None:
        """Cleanly close the Hume WebSocket connection."""
        self._running = False
        self._hume_ready_event.clear()
        self._hume_connected_at = 0.0
        if self._hume_is_open():
            try:
                await self.hume_ws.close()
                logger.info(f"Hume connection closed for session {self.session_id}")
            except Exception as e:
                logger.error(f"Error closing Hume connection for session {self.session_id}: {e}")
