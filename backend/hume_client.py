import os
import json
import asyncio
import logging
import re
from typing import Optional, Any
import websockets
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

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
If the user expresses self-harm intent, say exactly:
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
        logger.info(f"Frontend WebSocket accepted for session {self.session_id} (Hume lazy)")

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
        hume_url = f"wss://api.hume.ai/v0/evi/chat?api_key={api_key}"

        try:
            self.hume_ws = await websockets.connect(hume_url)
            config_msg = {
                "type": "session_settings",
                "system_prompt": HUME_SYSTEM_PROMPT,
                "voice": {"name": "KORA"},  # Options: ITO (measured), KORA (warm), DACHER (gentle), AURA (ethereal)
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
                    msg_type = data.get("type", "")

                    if msg_type == "audio_input":
                        self.user_is_speaking = True
                        if not await self._ensure_hume_connected():
                            continue
                    elif msg_type == "assistant_input":
                        # Guardrail: only backend-generated injections should reach Hume.
                        logger.warning(f"Blocked client-originated assistant_input for session {self.session_id}")
                        continue
                except Exception:
                    pass

                if self._hume_is_open():
                    await self.hume_ws.send(message)
        except Exception as e:
            logger.error(f"Client to Hume proxy error for session {self.session_id}: {e}")

    async def _proxy_hume_to_client(self) -> None:
        """Forward raw WebSocket messages from Hume to the frontend.

        Polls until Hume is connected (lazy connect), then streams continuously.
        """
        try:
            while self._running:
                if self._hume_is_open():
                    logger.info(f"[proxy] Hume→client loop ACTIVE for session {self.session_id}")
                    async for message in self.hume_ws:
                        if isinstance(message, bytes):
                            logger.info(f"[proxy] Hume→client: binary {len(message)} bytes")
                        else:
                            try:
                                msg_type = json.loads(message).get("type", "?")
                            except Exception:
                                msg_type = "?"
                            logger.info(f"[proxy] Hume→client: [{msg_type}] {str(message)[:200]}")

                        if self.client_ws:
                            if isinstance(message, bytes):
                                await self.client_ws.send_bytes(message)
                            else:
                                await self.client_ws.send_text(message)
                                try:
                                    data = json.loads(message)
                                    msg_type = data.get("type", "")
                                    # User finished speaking — flush any queued injections
                                    if msg_type in ("user_interruption", "user_message", "assistant_end"):
                                        self.user_is_speaking = False
                                        while self.injection_queue:
                                            queued = self.injection_queue.pop(0)
                                            await self._send_injection(queued)
                                except Exception:
                                    pass
                    # hume_ws closed naturally — exit loop
                    logger.info(f"[proxy] Hume WS closed, exiting proxy loop for session {self.session_id}")
                    break
                else:
                    # Hume not yet connected — wait for lazy connect
                    await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Hume to client proxy error for session {self.session_id}: {e}")

    async def close(self) -> None:
        """Cleanly close the Hume WebSocket connection."""
        self._running = False
        if self._hume_is_open():
            try:
                await self.hume_ws.close()
                logger.info(f"Hume connection closed for session {self.session_id}")
            except Exception as e:
                logger.error(f"Error closing Hume connection for session {self.session_id}: {e}")
