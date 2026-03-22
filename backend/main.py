import os
import base64
import logging
import asyncio
from functools import partial
from uuid import uuid4
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Arverié Backend")

_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
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


async def _inject_opening_after_delay(hume: HumeClient, text: str) -> None:
    """Wait briefly for the Hume WS to establish, then inject the intake opening response.

    After the initial 1.5 s sleep, retries for up to 5 more seconds in 0.5 s increments
    if the Hume connection is not yet open. Then waits briefly for readiness so
    session settings (including KORA voice) are applied before speaking.
    Skips with a warning if still not open/ready.
    """
    await asyncio.sleep(1.5)
    if not hume._hume_is_open():
        waited = 0.0
        max_wait = 5.0
        step = 0.5
        while waited < max_wait and not hume._hume_is_open():
            await asyncio.sleep(step)
            waited += step
        if not hume._hume_is_open():
            logger.warning(
                f"Hume WS still not open after {1.5 + max_wait:.1f}s — "
                f"skipping opening_response injection for session {hume.session_id}"
            )
            return
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
        session_id = create_session(str(body.user_id))
        active_sessions[session_id] = CanvasEventProcessor()
        session_intake_data[session_id] = {}
        logger.info(f"Session started: {session_id}")
        return StartSessionResponse(session_id=session_id)
    except Exception as e:
        logger.error(f"Failed to start session: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to start session"})


@app.post("/session/intake", response_model=IntakeResponse)
async def session_intake(body: IntakeRequest) -> IntakeResponse:
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, partial(call_intake, body.transcript, body.mood_checkin))
        session_intake_data[body.session_id] = {
            "themes": result.themes,
            "transcript": body.transcript,
            "mood_checkin": body.mood_checkin,
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
    except Exception as e:
        logger.error(f"Intake failed for session {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/message", response_model=UserMessageResponse)
async def session_message(body: UserMessageRequest) -> UserMessageResponse:
    try:
        intake = session_intake_data.get(body.session_id, {})
        themes = intake.get("themes", [])
        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(
            None,
            partial(
                call_user_message,
                message=body.message,
                themes=themes,
                dialogue_history=body.dialogue_history if isinstance(body.dialogue_history, list) else [],
            ),
        )
        logger.info(f"User message handled for session {body.session_id}")
        return UserMessageResponse(response=response_text)
    except Exception as e:
        logger.error(f"Session message failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/canvas-snapshot", response_model=CanvasSnapshotResponse)
async def canvas_snapshot(body: CanvasSnapshotRequest) -> CanvasSnapshotResponse:
    try:
        processor = active_sessions.get(body.session_id)
        if not processor:
            # Auto-recover instead of 404 — session state may have been lost on backend restart
            logger.warning(f"Session {body.session_id} not in active_sessions, auto-recovering")
            processor = CanvasEventProcessor()
            active_sessions[body.session_id] = processor
            session_intake_data[body.session_id] = {}

        snapshot_dict = {
            "strokes_per_second": body.snapshot.strokes_per_second,
            "current_color": body.snapshot.current_color,
            "colors_used_this_window": body.snapshot.colors_used_this_window,
            "erase_events": [e.dict() for e in body.snapshot.erase_events],
            "quadrant_distribution": body.snapshot.quadrant_distribution.dict(),
            "last_stroke_timestamp": body.snapshot.last_stroke_timestamp,
            "elapsed_seconds": body.snapshot.elapsed_seconds,
        }

        trigger_result = processor.update(snapshot_dict)

        if trigger_result.should_fire:
            intake = session_intake_data.get(body.session_id, {})
            themes = body.intake_themes or intake.get("themes", [])
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
                )
            )
            processor.reset_after_trigger()

            # Inject into active Hume session if one exists — isolated so errors don't fail the response
            hume = active_hume_sessions.get(body.session_id)
            if hume:
                try:
                    await hume.inject_trigger(response_text)
                except Exception as inject_err:
                    logger.error(f"Hume injection failed (non-fatal): {inject_err}")

            logger.info(f"Trigger fired for session {body.session_id}: {trigger_result.dominant_signal}")
            return CanvasSnapshotResponse(
                triggered=True,
                response=response_text,
                trigger_type=trigger_result.dominant_signal,
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
async def session_end(body: SessionEndRequest) -> SessionEndResponse:
    try:
        image_bytes = base64.b64decode(body.image_base64)
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
    except Exception as e:
        logger.error(f"Session end failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.post("/session/complete", response_model=SessionCompleteResponse)
async def session_complete(body: SessionCompleteRequest) -> SessionCompleteResponse:
    try:
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
        hume = active_hume_sessions.pop(body.session_id, None)
        if hume:
            await hume.close()

        logger.info(f"Session completed and saved: {body.session_id}")
        return SessionCompleteResponse(letter=letter, color_palette=color_palette)
    except Exception as e:
        logger.error(f"Session complete failed for {body.session_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.get("/sessions/{user_id}", response_model=SessionListResponse)
async def list_sessions(user_id: str) -> SessionListResponse:
    try:
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
    except Exception as e:
        logger.error(f"List sessions failed for user {user_id}: {e}")
        return JSONResponse(status_code=500, content={"error": "Something went wrong"})


@app.websocket("/hume/session")
async def hume_session(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id = websocket.query_params.get("session_id", str(uuid4()))

    # Auto-recover: if backend restarted, session_id may not be in active_sessions
    if session_id not in active_sessions:
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
        await hume_client.close()
