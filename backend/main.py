#pulled 1
import os
import base64
import logging
import asyncio
import time
import json
from functools import partial
from uuid import uuid4
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from models import (
    StartSessionRequest,
    StartSessionResponse,
    IntakeRequest,
    IntakeResponse,
    CanvasSnapshotRequest,
    CanvasSnapshotResponse,
    SessionEndRequest,
    SessionEndResponse,
    SessionCompleteRequest,
    SessionCompleteResponse,
    UserMessageRequest,
    UserMessageResponse,
    WsTokenRequest,
    WsTokenResponse,
    SessionListResponse,
    SessionSummary,
)
from canvas_processor import CanvasEventProcessor
from claude_calls import (
    call_intake,
    call_user_message,
    call_trigger_response,
    call_vision_description,
    call_reflection_questions,
    call_session_letter,
)
from supabase_client import create_session, get_sessions, complete_session, upload_drawing
from hume_client import HumeClient
from input_security import detect_suspicious_prompt_input, normalize_user_text
from rate_limits import SlidingWindowRateLimiter
from session_cleanup import get_stale_session_ids
from security import (
    SecurityError,
    mint_signed_token,
    parse_bearer_token,
    validate_required_env,
    verify_signed_token,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Arverié Backend")

REQUIRED_ENV_KEYS = [
    "ANTHROPIC_API_KEY",
    "HUME_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "SESSION_TOKEN_SECRET",
]

validate_required_env(REQUIRED_ENV_KEYS)

AUTH_ENFORCEMENT_MODE = os.getenv("AUTH_ENFORCEMENT_MODE", "compat").strip().lower()
WS_AUTH_ENFORCEMENT_MODE = os.getenv("WS_AUTH_ENFORCEMENT_MODE", "compat").strip().lower()
SESSION_TOKEN_TTL_SECONDS = int(os.getenv("SESSION_TOKEN_TTL_SECONDS", "21600"))
USER_TOKEN_TTL_SECONDS = int(os.getenv("USER_TOKEN_TTL_SECONDS", "2592000"))
WS_TOKEN_TTL_SECONDS = int(os.getenv("WS_TOKEN_TTL_SECONDS", "300"))
SESSION_TOKEN_SECRET = os.getenv("SESSION_TOKEN_SECRET", "")
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(4 * 1024 * 1024)))

LIMIT_INTAKE_PER_MINUTE = int(os.getenv("LIMIT_INTAKE_PER_MINUTE", "12"))
LIMIT_MESSAGE_PER_MINUTE = int(os.getenv("LIMIT_MESSAGE_PER_MINUTE", "30"))
LIMIT_SNAPSHOT_PER_MINUTE = int(os.getenv("LIMIT_SNAPSHOT_PER_MINUTE", "120"))
LIMIT_END_PER_MINUTE = int(os.getenv("LIMIT_END_PER_MINUTE", "6"))
LIMIT_COMPLETE_PER_MINUTE = int(os.getenv("LIMIT_COMPLETE_PER_MINUTE", "6"))
LIMIT_SESSIONS_READ_PER_MINUTE = int(os.getenv("LIMIT_SESSIONS_READ_PER_MINUTE", "20"))
LIMIT_WS_CONNECT_PER_MINUTE = int(os.getenv("LIMIT_WS_CONNECT_PER_MINUTE", "12"))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "7200"))
CLEANUP_INTERVAL_SECONDS = int(os.getenv("CLEANUP_INTERVAL_SECONDS", "60"))
ENABLE_SESSION_CLEANUP = os.getenv("ENABLE_SESSION_CLEANUP", "1") == "1"

MESSAGE_POLICY_MODE = os.getenv("MESSAGE_POLICY_MODE", "enforce").strip().lower()


def _auth_is_strict() -> bool:
    return AUTH_ENFORCEMENT_MODE == "strict"


def _ws_auth_is_strict() -> bool:
    return WS_AUTH_ENFORCEMENT_MODE == "strict"


def _mint_session_token(session_id: str, user_id: str) -> str:
    return mint_signed_token(
        {
            "scope": "session",
            "session_id": session_id,
            "user_id": user_id,
        },
        SESSION_TOKEN_SECRET,
        ttl_seconds=SESSION_TOKEN_TTL_SECONDS,
    )


def _mint_user_token(user_id: str) -> str:
    return mint_signed_token(
        {
            "scope": "user",
            "user_id": user_id,
        },
        SESSION_TOKEN_SECRET,
        ttl_seconds=USER_TOKEN_TTL_SECONDS,
    )


def _mint_ws_token(session_id: str, user_id: str) -> str:
    return mint_signed_token(
        {
            "scope": "ws",
            "session_id": session_id,
            "user_id": user_id,
        },
        SESSION_TOKEN_SECRET,
        ttl_seconds=WS_TOKEN_TTL_SECONDS,
    )


def _verify_auth_token(authorization: str | None, allowed_scopes: set[str]) -> dict | None:
    token = parse_bearer_token(authorization)
    if not token:
        _security_event("auth_missing_token")
        if _auth_is_strict():
            raise HTTPException(status_code=401, detail="Missing bearer token")
        return None
    try:
        return verify_signed_token(token, SESSION_TOKEN_SECRET, allowed_scopes)
    except SecurityError as exc:
        _security_event("auth_invalid_token", reason=str(exc))
        if _auth_is_strict():
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        logger.warning(f"Auth token rejected in compat mode: {exc}")
        return None


def _authorize_session_access(
    session_id: str,
    authorization: str | None,
    user_id: str | None = None,
) -> dict | None:
    claims = _verify_auth_token(authorization, {"session"})
    if not claims:
        return None
    if claims.get("session_id") != session_id:
        _security_event("auth_session_mismatch", session_id=session_id, token_session=claims.get("session_id"))
        if _auth_is_strict():
            raise HTTPException(status_code=403, detail="Session token mismatch")
        logger.warning(
            f"Session mismatch in compat mode: token={claims.get('session_id')} request={session_id}"
        )
        return None
    if user_id and claims.get("user_id") != user_id:
        _security_event("auth_user_mismatch", user_id=user_id, token_user=claims.get("user_id"))
        if _auth_is_strict():
            raise HTTPException(status_code=403, detail="User token mismatch")
        logger.warning(
            f"User mismatch in compat mode: token={claims.get('user_id')} request={user_id}"
        )
        return None
    return claims


def _authorize_user_access(user_id: str, authorization: str | None) -> dict | None:
    claims = _verify_auth_token(authorization, {"user", "session"})
    if not claims:
        return None
    if claims.get("user_id") != user_id:
        _security_event("auth_user_scope_mismatch", user_id=user_id, token_user=claims.get("user_id"))
        if _auth_is_strict():
            raise HTTPException(status_code=403, detail="User token mismatch")
        logger.warning(
            f"User mismatch in compat mode: token={claims.get('user_id')} request={user_id}"
        )
        return None
    return claims

_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session state — keyed by session_id
active_sessions: dict[str, CanvasEventProcessor] = {}
active_hume_sessions: dict[str, HumeClient] = {}
session_intake_data: dict[str, dict] = {}  # themes, transcript, mood per session
session_owners: dict[str, str] = {}  # session_id -> user_id
session_last_seen: dict[str, float] = {}  # session_id -> unix timestamp
used_ws_nonces: dict[str, int] = {}  # nonce -> exp timestamp
rate_limiter = SlidingWindowRateLimiter()
security_counters: dict[str, int] = {}
cleanup_task: asyncio.Task | None = None


def _security_event(event: str, **metadata: object) -> None:
    security_counters[event] = security_counters.get(event, 0) + 1
    payload = {"event": event, "count": security_counters[event], **metadata}
    logger.warning(f"SECURITY_EVENT {json.dumps(payload, ensure_ascii=True, sort_keys=True)}")


def _touch_session(session_id: str) -> None:
    session_last_seen[session_id] = time.time()


async def _cleanup_stale_sessions_once() -> int:
    stale_ids = get_stale_session_ids(
        session_last_seen,
        now_ts=time.time(),
        ttl_seconds=SESSION_TTL_SECONDS,
    )
    for session_id in stale_ids:
        active_sessions.pop(session_id, None)
        session_intake_data.pop(session_id, None)
        session_owners.pop(session_id, None)
        session_last_seen.pop(session_id, None)
        hume = active_hume_sessions.pop(session_id, None)
        if hume:
            await hume.close()
        _security_event("session_ttl_cleanup", session_id=session_id)
    return len(stale_ids)


async def _cleanup_loop() -> None:
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        try:
            await _cleanup_stale_sessions_once()
        except Exception as exc:
            logger.error(f"Session cleanup loop error: {exc}")


@app.on_event("startup")
async def _on_startup() -> None:
    global cleanup_task
    if ENABLE_SESSION_CLEANUP and cleanup_task is None:
        cleanup_task = asyncio.create_task(_cleanup_loop())


@app.on_event("shutdown")
async def _on_shutdown() -> None:
    global cleanup_task
    if cleanup_task:
        cleanup_task.cancel()
        cleanup_task = None


def _client_ip(value: str | None) -> str:
    if not value:
        return "unknown"
    return value.split(":")[0].strip() or "unknown"


def _enforce_rate_limit(rule: str, key: str, limit: int, window_seconds: float = 60.0) -> None:
    allowed, retry_after = rate_limiter.check(f"{rule}:{key}", limit=limit, window_seconds=window_seconds)
    if not allowed:
        _security_event("rate_limited", rule=rule, key=key, retry_after=round(retry_after, 3))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "rule": rule,
                "retry_after_seconds": max(1, int(retry_after) + 1),
            },
        )


def _prune_used_ws_nonces() -> None:
    now = int(time.time())
    expired = [nonce for nonce, exp in used_ws_nonces.items() if exp <= now]
    for nonce in expired:
        used_ws_nonces.pop(nonce, None)


async def _inject_opening_after_delay(hume: HumeClient, text: str) -> None:
    """Wait briefly, then inject the intake opening response through Hume EVI.

    wait_until_ready() internally ensures the Hume connection exists and that
    session settings are applied before speaking.
    """
    await asyncio.sleep(1.5)
    if not await hume.wait_until_ready(timeout_seconds=4.0):
        logger.warning(
            f"Hume not ready for opening_response injection in session {hume.session_id}"
        )
        return
    try:
        await hume.inject_trigger(text)
        logger.info(f"Injected intake opening_response via scheduled task: {text[:60]}")
    except Exception as e:
        logger.error(f"Scheduled intake injection failed: {e}")


@app.post("/session/start", response_model=StartSessionResponse)
async def start_session(body: StartSessionRequest) -> StartSessionResponse:
    try:
        user_id = str(body.user_id)
        session_id = create_session(user_id)
        active_sessions[session_id] = CanvasEventProcessor()
        session_intake_data[session_id] = {}
        session_owners[session_id] = user_id
        _touch_session(session_id)
        session_token = _mint_session_token(session_id, user_id)
        user_token = _mint_user_token(user_id)
        logger.info(f"Session started: {session_id}")
        return StartSessionResponse(
            session_id=session_id,
            session_token=session_token,
            user_token=user_token,
            auth_mode=AUTH_ENFORCEMENT_MODE,
            ws_auth_mode=WS_AUTH_ENFORCEMENT_MODE,
        )
    except Exception as e:
        logger.error(f"Failed to start session: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to start session"})


@app.post("/session/intake", response_model=IntakeResponse)
async def session_intake(
    body: IntakeRequest,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> IntakeResponse:
    try:
        _authorize_session_access(body.session_id, authorization)
        _touch_session(body.session_id)
        _enforce_rate_limit("intake:session", body.session_id, LIMIT_INTAKE_PER_MINUTE)
        _enforce_rate_limit("intake:ip", _client_ip(x_forwarded_for), LIMIT_INTAKE_PER_MINUTE)

        safe_transcript = normalize_user_text(body.transcript)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, partial(call_intake, safe_transcript, body.mood_checkin))
        session_intake_data[body.session_id] = {
            "themes": result.themes,
            "transcript": safe_transcript,
            "mood_checkin": body.mood_checkin,
            "guided": bool(body.guided),
            "guide_theme": body.guide_theme,
            "drawing_prompt": result.drawing_prompt,
            "opening_response": result.opening_response,
            "opening_injected": False,
        }
        logger.info(
            f"Intake processed for session {body.session_id}: themes={result.themes}"
        )
        # If Hume WS is already connected, inject immediately
        hume = active_hume_sessions.get(body.session_id)
        if hume and not session_intake_data[body.session_id].get("opening_injected"):
            try:
                if await hume.wait_until_ready(timeout_seconds=4.0):
                    await hume.inject_trigger(result.opening_response)
                    session_intake_data[body.session_id]["opening_injected"] = True
                else:
                    logger.warning(
                        f"Skipping immediate opening_response injection until Hume is ready: session {body.session_id}"
                    )
            except Exception as inject_err:
                logger.error(f"Hume intake injection failed (non-fatal): {inject_err}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intake failed for session {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/message", response_model=UserMessageResponse)
async def session_message(
    body: UserMessageRequest,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> UserMessageResponse:
    try:
        _authorize_session_access(body.session_id, authorization)
        _touch_session(body.session_id)
        _enforce_rate_limit("message:session", body.session_id, LIMIT_MESSAGE_PER_MINUTE)
        _enforce_rate_limit("message:ip", _client_ip(x_forwarded_for), LIMIT_MESSAGE_PER_MINUTE)

        safe_message = normalize_user_text(body.message)
        suspicious = detect_suspicious_prompt_input(safe_message)
        if suspicious:
            _security_event(
                "message_suspicious",
                session_id=body.session_id,
                message_len=len(safe_message),
                policy_mode=MESSAGE_POLICY_MODE,
            )
            if MESSAGE_POLICY_MODE == "enforce":
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "unsafe_message",
                        "message": "Your message could not be processed safely. Please rephrase it.",
                    },
                )

        intake = session_intake_data.get(body.session_id, {})
        themes = intake.get("themes", [])
        guided_mode = bool(body.guided) if body.guided is not None else bool(intake.get("guided"))
        guide_theme = body.guide_theme or intake.get("guide_theme")
        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(
            None,
            partial(
                call_user_message,
                message=safe_message,
                themes=themes,
                dialogue_history=body.dialogue_history if isinstance(body.dialogue_history, list) else [],
                guided_mode=guided_mode,
                guide_theme=guide_theme,
            ),
        )
        logger.info(f"User message handled for session {body.session_id}")
        return UserMessageResponse(response=response_text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session message failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/ws-token", response_model=WsTokenResponse)
async def session_ws_token(
    body: WsTokenRequest,
    authorization: str | None = Header(default=None),
) -> WsTokenResponse:
    _touch_session(body.session_id)
    owner = session_owners.get(body.session_id)
    claims = _authorize_session_access(body.session_id, authorization, user_id=owner)
    if claims and claims.get("user_id"):
        owner = claims["user_id"]
    if not owner:
        if _auth_is_strict():
            raise HTTPException(status_code=404, detail="Unknown session")
        owner = "unknown"
    return WsTokenResponse(ws_token=_mint_ws_token(body.session_id, owner))


@app.post("/session/canvas-snapshot", response_model=CanvasSnapshotResponse)
async def canvas_snapshot(
    body: CanvasSnapshotRequest,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> CanvasSnapshotResponse:
    try:
        owner = session_owners.get(body.session_id)
        _authorize_session_access(body.session_id, authorization, user_id=owner)
        _touch_session(body.session_id)
        _enforce_rate_limit("snapshot:session", body.session_id, LIMIT_SNAPSHOT_PER_MINUTE)
        _enforce_rate_limit("snapshot:ip", _client_ip(x_forwarded_for), LIMIT_SNAPSHOT_PER_MINUTE)
        processor = active_sessions.get(body.session_id)
        if not processor:
            if _auth_is_strict():
                raise HTTPException(status_code=404, detail="Unknown active session")
            # Auto-recover instead of 404 in compatibility mode.
            logger.warning(f"Session {body.session_id} not in active_sessions, auto-recovering")
            processor = CanvasEventProcessor()
            active_sessions[body.session_id] = processor
            session_intake_data[body.session_id] = {}

        snapshot_dict = {
            "strokes_per_second": body.snapshot.strokes_per_second,
            "stroke_count_window": body.snapshot.stroke_count_window,
            "current_color": body.snapshot.current_color,
            "current_brush": body.snapshot.current_brush,
            "brush_usage_window": body.snapshot.brush_usage_window,
            "avg_stroke_speed_window": body.snapshot.avg_stroke_speed_window,
            "stroke_samples_window": body.snapshot.stroke_samples_window,
            "colors_used_this_window": body.snapshot.colors_used_this_window,
            "erase_events": [e.dict() for e in body.snapshot.erase_events],
            "erase_count_window": body.snapshot.erase_count_window,
            "quadrant_distribution": body.snapshot.quadrant_distribution.dict(),
            "last_stroke_timestamp": body.snapshot.last_stroke_timestamp,
            "elapsed_seconds": body.snapshot.elapsed_seconds,
        }

        trigger_result = processor.update(snapshot_dict)

        if trigger_result.should_fire:
            intake = session_intake_data.get(body.session_id, {})
            themes = body.intake_themes or intake.get("themes", [])
            guided_mode = bool(intake.get("guided"))
            guide_theme = intake.get("guide_theme")
            canvas_summary = {
                "colors_used": body.snapshot.colors_used_this_window,
                "elapsed_seconds": body.snapshot.elapsed_seconds,
                "signal_context": trigger_result.signal_context,
            }
            # Run sync Claude call in thread pool so it doesn't block the event loop
            loop = asyncio.get_event_loop()
            response_text = await loop.run_in_executor(
                None,
                partial(
                    call_trigger_response,
                    trigger_type=trigger_result.dominant_signal or "check_in",
                    trigger_detail=trigger_result.signal_context or {},
                    themes=themes,
                    canvas_summary=canvas_summary,
                    dialogue_history=body.dialogue_history if isinstance(body.dialogue_history, list) else [],
                    guided_mode=guided_mode,
                    guide_theme=guide_theme,
                )
            )
            processor.reset_after_trigger(trigger_result.dominant_signal)

            # Inject into active Hume session if one exists — isolated so errors don't fail the response
            hume = active_hume_sessions.get(body.session_id)
            injection_delivered = True
            if hume:
                try:
                    injection_delivered = await hume.inject_trigger(response_text)
                except Exception as inject_err:
                    logger.error(f"Hume injection failed (non-fatal): {inject_err}")
                    injection_delivered = False

            logger.info(f"Trigger fired for session {body.session_id}: {trigger_result.dominant_signal}")
            return CanvasSnapshotResponse(
                triggered=True,
                response=response_text,
                trigger_type=trigger_result.dominant_signal,
                injection_delivered=injection_delivered,
                flow_intensity=trigger_result.flow_intensity,
            )

        return CanvasSnapshotResponse(
            triggered=False,
            response=None,
            flow_intensity=trigger_result.flow_intensity,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Canvas snapshot failed for session {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/end", response_model=SessionEndResponse)
async def session_end(
    body: SessionEndRequest,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> SessionEndResponse:
    try:
        owner = session_owners.get(body.session_id)
        _authorize_session_access(body.session_id, authorization, user_id=owner)
        _touch_session(body.session_id)
        _enforce_rate_limit("end:session", body.session_id, LIMIT_END_PER_MINUTE)
        _enforce_rate_limit("end:ip", _client_ip(x_forwarded_for), LIMIT_END_PER_MINUTE)

        image_bytes = base64.b64decode(body.image_base64, validate=True)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            _security_event(
                "payload_rejected",
                field="image_base64",
                size_bytes=len(image_bytes),
                max_bytes=MAX_IMAGE_BYTES,
            )
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "payload_too_large",
                    "field": "image_base64",
                    "max_bytes": MAX_IMAGE_BYTES,
                },
            )
        drawing_url = upload_drawing(body.session_id, image_bytes)

        loop = asyncio.get_event_loop()
        vision_description = await loop.run_in_executor(
            None, partial(call_vision_description, body.image_base64)
        )

        intake = session_intake_data.get(body.session_id, {})
        questions = await loop.run_in_executor(
            None,
            partial(
                call_reflection_questions,
                mood_checkin=intake.get("mood_checkin", ""),
                intake_transcript=intake.get("transcript", ""),
                themes=intake.get("themes", []),
                canvas_summary=body.canvas_summary,
                vision_description=vision_description,
                dialogue_history=body.dialogue_history,
            ),
        )

        logger.info(
            f"Session end processed for {body.session_id}: {len(questions)} questions generated"
        )
        return SessionEndResponse(
            drawing_url=drawing_url,
            vision_description=vision_description,
            reflection_questions=questions,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session end failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/complete", response_model=SessionCompleteResponse)
async def session_complete(
    body: SessionCompleteRequest,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> SessionCompleteResponse:
    try:
        owner = session_owners.get(body.session_id)
        _authorize_session_access(body.session_id, authorization, user_id=owner or body.user_id)
        _touch_session(body.session_id)
        _enforce_rate_limit("complete:session", body.session_id, LIMIT_COMPLETE_PER_MINUTE)
        _enforce_rate_limit("complete:ip", _client_ip(x_forwarded_for), LIMIT_COMPLETE_PER_MINUTE)
        intake = session_intake_data.get(body.session_id, {})
        full_data = body.full_session_data

        qa_pairs = [
            {"question": q, "answer": a}
            for q, a in zip(
                full_data.get("reflection_questions", []),
                body.user_answers,
            )
        ]

        loop = asyncio.get_event_loop()
        letter = await loop.run_in_executor(
            None,
            partial(
                call_session_letter,
                intake_transcript=intake.get("transcript", ""),
                themes=intake.get("themes", []),
                canvas_summary=full_data.get("canvas_summary", {}),
                vision_description=full_data.get("vision_description", ""),
                dialogue_history=full_data.get("dialogue_history", []),
                qa_pairs=qa_pairs,
            ),
        )

        canvas_summary = full_data.get("canvas_summary", {})
        color_palette = canvas_summary.get("colors_used", [])[:5]

        # Single Supabase write — all session data at once
        session_row = {
            "mood_checkin": intake.get("mood_checkin"),
            "mood_checkout": body.mood_checkout,
            "duration_seconds": body.duration_seconds,
            "drawing_url": full_data.get("drawing_url", ""),
            "data": {
                **full_data,
                "intake_transcript": intake.get("transcript", ""),
                "intake_themes": intake.get("themes", []),
                "letter": letter,
                "user_answers": body.user_answers,
                "color_palette": color_palette,
            },
        }
        complete_session(body.session_id, session_row)

        # Clean up all in-memory state for this session
        active_sessions.pop(body.session_id, None)
        session_intake_data.pop(body.session_id, None)
        session_owners.pop(body.session_id, None)
        session_last_seen.pop(body.session_id, None)
        hume = active_hume_sessions.pop(body.session_id, None)
        if hume:
            await hume.close()

        logger.info(f"Session completed and saved: {body.session_id}")
        return SessionCompleteResponse(letter=letter, color_palette=color_palette)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session complete failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.get("/sessions/{user_id}", response_model=SessionListResponse)
async def list_sessions(
    user_id: str,
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
) -> SessionListResponse:
    try:
        _authorize_user_access(user_id, authorization)
        _enforce_rate_limit("sessions:read:user", user_id, LIMIT_SESSIONS_READ_PER_MINUTE)
        _enforce_rate_limit("sessions:read:ip", _client_ip(x_forwarded_for), LIMIT_SESSIONS_READ_PER_MINUTE)
        rows = get_sessions(user_id)
        sessions = [
            SessionSummary(
                id=str(r.get("id", "")),
                created_at=str(r.get("created_at", "")),
                mood_checkin=r.get("mood_checkin"),
                mood_checkout=r.get("mood_checkout"),
                drawing_url=r.get("drawing_url"),
                data=r.get("data"),
            )
            for r in rows
        ]
        return SessionListResponse(sessions=sessions)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List sessions failed for user {user_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.websocket("/hume/session")
async def hume_session(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id = websocket.query_params.get("session_id", str(uuid4()))
    ws_token = websocket.query_params.get("ws_token")
    ws_ip = _client_ip(websocket.client.host if websocket.client else None)
    try:
        _enforce_rate_limit("ws:connect:ip", ws_ip, LIMIT_WS_CONNECT_PER_MINUTE)
        _enforce_rate_limit("ws:connect:session", session_id, LIMIT_WS_CONNECT_PER_MINUTE)
    except HTTPException as exc:
        _security_event("ws_connect_rate_limited", session_id=session_id, ip=ws_ip)
        await websocket.close(code=1008, reason=str(exc.detail))
        return

    _touch_session(session_id)

    owner = session_owners.get(session_id)
    _prune_used_ws_nonces()
    if _ws_auth_is_strict():
        try:
            claims = verify_signed_token(ws_token or "", SESSION_TOKEN_SECRET, {"ws"})
            if claims.get("session_id") != session_id:
                raise SecurityError("WS token session mismatch")
            if owner and claims.get("user_id") != owner:
                raise SecurityError("WS token owner mismatch")
            nonce = str(claims.get("nonce", "")).strip()
            if not nonce:
                raise SecurityError("WS token missing nonce")
            if nonce in used_ws_nonces:
                raise SecurityError("WS token replay detected")
            used_ws_nonces[nonce] = int(claims.get("exp", 0))
        except SecurityError as exc:
            _security_event("ws_token_rejected", session_id=session_id, reason=str(exc))
            await websocket.close(code=1008, reason=str(exc))
            return

    # Auto-recover only in compatibility mode.
    if session_id not in active_sessions:
        if _ws_auth_is_strict():
            _security_event("ws_unknown_session", session_id=session_id)
            await websocket.close(code=1008, reason="Unknown session")
            return
        active_sessions[session_id] = CanvasEventProcessor()
        session_intake_data[session_id] = {}
        logger.info(f"Auto-recovered session state for {session_id}")

    existing_hume = active_hume_sessions.get(session_id)
    if existing_hume:
        logger.info(f"Closing previous Hume client for session {session_id} before replacing WebSocket")
        await existing_hume.close()

    hume_client = HumeClient(session_id)
    active_hume_sessions[session_id] = hume_client

    # Inject pending intake opening_response if intake already completed before WS connected
    intake = session_intake_data.get(session_id, {})
    opening_response = intake.get("opening_response")
    opening_injected = bool(intake.get("opening_injected"))
    if opening_response and not opening_injected:
        intake["opening_injected"] = True
        session_intake_data[session_id] = intake
        asyncio.create_task(_inject_opening_after_delay(hume_client, opening_response))

    try:
        await hume_client.connect(websocket)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Hume WebSocket error for session {session_id}: {e}")
    finally:
        active_hume_sessions.pop(session_id, None)
        session_last_seen.pop(session_id, None)
        await hume_client.close()
