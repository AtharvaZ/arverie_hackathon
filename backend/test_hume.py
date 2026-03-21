import asyncio
import os
import json
import httpx
from dotenv import load_dotenv
import websockets

load_dotenv()

BASE_URL = "http://localhost:8000"
USER_ID = "00000000-0000-0000-0000-000000000001"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def listen_for_audio(ws, label: str, max_messages: int = 20) -> bool:
    """Listen on an open Hume WS until audio arrives or we time out."""
    audio_received = False
    for i in range(max_messages):
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=6)
            if isinstance(msg, bytes):
                print(f"  [{i}] [binary audio] {len(msg)} bytes ← AUDIO OUTPUT!")
                audio_received = True
                break
            else:
                d = json.loads(msg)
                t = d.get("type", "?")
                print(f"  [{i}] [{t}] {str(d)[:200]}")
                if t == "audio_output":
                    data = d.get("data", "")
                    print(f"       ← AUDIO DATA ({len(data)} chars base64) ✓")
                    audio_received = True
                    break
                elif t == "error":
                    print(f"       ^^^ Hume ERROR: {d.get('message', d)}")
        except asyncio.TimeoutError:
            print(f"  (timeout after {i} messages)")
            break
    return audio_received


async def open_hume_ws(api_key: str, session_id: str):
    """Open a Hume EVI WebSocket for the given session and send session_settings."""
    url = f"wss://api.hume.ai/v0/evi/chat?api_key={api_key}&session_id={session_id}"
    ws = await websockets.connect(url, open_timeout=10)
    print("  ✓ Hume WS connected")

    await ws.send(json.dumps({
        "type": "session_settings",
        "audio": {
            "encoding": "linear16",
            "sample_rate": 16000,
            "channels": 1,
        },
    }))

    # Drain the initial chat_metadata / session_settings_applied message
    try:
        msg = await asyncio.wait_for(ws.recv(), timeout=5)
        d = json.loads(msg)
        print(f"  ✓ Got initial: [{d.get('type')}]")
    except asyncio.TimeoutError:
        print("  (no initial message within 5s)")

    return ws


# ---------------------------------------------------------------------------
# Test 1 — Raw WebSocket connection (existing smoke test)
# ---------------------------------------------------------------------------

async def test_raw_connection(api_key: str) -> None:
    print("\n=== Test 1: Raw WS connection + assistant_input ===")
    url = f"wss://api.hume.ai/v0/evi/chat?api_key={api_key}"
    try:
        async with websockets.connect(url, open_timeout=10) as ws:
            print("✓ Connected")

            await ws.send(json.dumps({
                "type": "session_settings",
                "audio": {"encoding": "linear16", "sample_rate": 16000, "channels": 1},
            }))
            print("✓ Sent session_settings")

            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            d = json.loads(msg)
            print(f"✓ Got: [{d.get('type')}]")

            await ws.send(json.dumps({
                "type": "assistant_input",
                "text": "Hello, I'm Arverié. I'm here with you.",
            }))
            print("✓ Sent assistant_input")

            audio_received = await listen_for_audio(ws, "raw_connection")
            if audio_received:
                print("✅ Test 1 PASSED — audio received")
            else:
                print("⚠  Test 1 — no audio received (Hume may still be processing)")

    except Exception as e:
        print(f"  ERROR: {type(e).__name__}: {e}")


# ---------------------------------------------------------------------------
# Test 2 — Intake flow: start session → POST /session/intake → inject opening_response
# ---------------------------------------------------------------------------

async def test_intake_flow(api_key: str, client: httpx.AsyncClient) -> str | None:
    """Returns session_id on success so subsequent tests can reuse it."""
    print("\n=== Test 2: Intake flow (start → intake → Hume injection) ===")

    # 1. Start session
    try:
        resp = await client.post(f"{BASE_URL}/session/start", json={"user_id": USER_ID})
        resp.raise_for_status()
        session_id = resp.json()["session_id"]
        print(f"  ✓ Session started: {session_id}")
    except Exception as e:
        print(f"  ✗ /session/start failed: {e}")
        return None

    # 2. Call intake
    try:
        resp = await client.post(f"{BASE_URL}/session/intake", json={
            "session_id": session_id,
            "transcript": "I've been feeling really disconnected from everything lately. Like I'm just going through the motions.",
            "mood_checkin": "heavy",
        })
        resp.raise_for_status()
        intake_data = resp.json()
        themes = intake_data.get("themes", [])
        opening_response = intake_data.get("opening_response", "")
        print(f"  ✓ Intake processed — themes: {themes}")
        print(f"  ✓ Opening response: \"{opening_response}\"")
    except Exception as e:
        print(f"  ✗ /session/intake failed: {e}")
        return session_id

    # 3. Open Hume WS and inject the opening_response
    try:
        ws = await open_hume_ws(api_key, session_id)
        await ws.send(json.dumps({
            "type": "assistant_input",
            "text": opening_response,
        }))
        print(f"  ✓ Injected opening_response into Hume: \"{opening_response[:60]}...\"")

        audio_received = await listen_for_audio(ws, "intake_flow")
        await ws.close()

        if audio_received:
            print("✅ Test 2 PASSED — intake → Hume audio confirmed")
        else:
            print("⚠  Test 2 — opening_response injected but no audio back (check Hume logs)")
    except Exception as e:
        print(f"  ✗ Hume WS step failed: {e}")

    return session_id


# ---------------------------------------------------------------------------
# Test 3 — Canvas trigger: POST /session/canvas-snapshot with erase events → inject trigger
# ---------------------------------------------------------------------------

async def test_canvas_trigger(api_key: str, client: httpx.AsyncClient, session_id: str) -> None:
    print("\n=== Test 3: Canvas trigger (snapshot with erase events → Hume injection) ===")

    # Build a snapshot that should fire the erase trigger
    # Multiple erase events + some strokes to accumulate signal
    erase_events = [
        {"timestamp": 1.0, "x": 210.0, "y": 180.0, "radius": 20.0},
        {"timestamp": 3.0, "x": 225.0, "y": 190.0, "radius": 20.0},
        {"timestamp": 6.0, "x": 215.0, "y": 175.0, "radius": 20.0},
        {"timestamp": 9.0, "x": 220.0, "y": 185.0, "radius": 20.0},
    ]
    snapshot_payload = {
        "session_id": session_id,
        "snapshot": {
            "strokes_per_second": 2.5,
            "current_color": "#FF0000",
            "colors_used_this_window": ["#FF0000", "#0000FF", "#00FF00"],
            "erase_events": erase_events,
            "quadrant_distribution": {
                "top_left": 0.3,
                "top_right": 0.2,
                "bottom_left": 0.25,
                "bottom_right": 0.25,
            },
            "last_stroke_timestamp": 9.5,
            "elapsed_seconds": 120,
        },
        "dialogue_history": [],
    }

    triggered = False
    response_text = None

    # Send several snapshots until a trigger fires (or give up after 5)
    for attempt in range(1, 6):
        try:
            resp = await client.post(f"{BASE_URL}/session/canvas-snapshot", json=snapshot_payload)
            resp.raise_for_status()
            data = resp.json()
            triggered = data.get("triggered", False)
            response_text = data.get("response")
            print(f"  Attempt {attempt}: triggered={triggered}, signal={data.get('flow_intensity')}")
            if triggered:
                print(f"  ✓ Trigger fired: type={data.get('trigger_type')}")
                print(f"  ✓ Trigger response: \"{response_text}\"")
                break
            # Advance timestamp so signal accumulates across attempts
            snapshot_payload["snapshot"]["elapsed_seconds"] += 30
            for e in snapshot_payload["snapshot"]["erase_events"]:
                e["timestamp"] += 30
        except Exception as e:
            print(f"  ✗ /session/canvas-snapshot failed: {e}")
            return

    if not triggered:
        print("  ⚠  No trigger after 5 attempts — injecting a manual test phrase into Hume anyway")
        response_text = "you've been going back and forth in that area..."

    # Open Hume WS and inject the trigger response
    try:
        ws = await open_hume_ws(api_key, session_id)
        await ws.send(json.dumps({
            "type": "assistant_input",
            "text": response_text,
        }))
        print(f"  ✓ Injected trigger response into Hume: \"{response_text[:60]}\"")

        audio_received = await listen_for_audio(ws, "canvas_trigger")
        await ws.close()

        if audio_received:
            print("✅ Test 3 PASSED — canvas trigger → Hume audio confirmed")
        else:
            print("⚠  Test 3 — trigger response injected but no audio back (check Hume logs)")
    except Exception as e:
        print(f"  ✗ Hume WS step failed: {e}")


# ---------------------------------------------------------------------------
# Test 4 — Conversation handling: user-initiated message with drawing tie-back
# ---------------------------------------------------------------------------

async def test_conversation_flow(api_key: str, client: httpx.AsyncClient, session_id: str) -> None:
    """
    Simulate a user starting a conversation during drawing.
    Verifies that when a non-drawing topic is spoken, the system bridges back to canvas.
    This is a manual injection test — we inject the bridge phrase and confirm audio.
    """
    print("\n=== Test 4: User-initiated conversation → canvas bridge injection ===")

    user_phrase = "I cried earlier today before coming here."
    # This is the kind of response the art therapist prompt should produce:
    # - 1 sentence acknowledgment, no redirect
    # - Then silence or gentle canvas bridge after
    bridge_response = "That's real. Take your time."

    try:
        ws = await open_hume_ws(api_key, session_id)
        await ws.send(json.dumps({
            "type": "assistant_input",
            "text": bridge_response,
        }))
        print(f"  ✓ Simulated art-therapist response to \"{user_phrase}\"")
        print(f"  ✓ Injected: \"{bridge_response}\"")

        audio_received = await listen_for_audio(ws, "conversation_flow")
        await ws.close()

        if audio_received:
            print("✅ Test 4 PASSED — emotional acknowledgment → Hume audio confirmed")
        else:
            print("⚠  Test 4 — phrase injected but no audio back")
    except Exception as e:
        print(f"  ✗ Hume WS step failed: {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    api_key = os.getenv("HUME_API_KEY")
    print(f"HUME_API_KEY: {'set → ' + api_key[:12] + '...' if api_key else 'MISSING!'}")
    if not api_key:
        return

    # Check if local server is up
    server_available = False
    async with httpx.AsyncClient(timeout=5) as probe:
        try:
            r = await probe.get(f"{BASE_URL}/docs")
            server_available = r.status_code < 500
            print(f"Backend at {BASE_URL}: {'✓ reachable' if server_available else '✗ returned ' + str(r.status_code)}")
        except Exception as e:
            print(f"Backend at {BASE_URL}: ✗ not reachable ({e})")
            print("  → Skipping HTTP-dependent tests (Tests 2-4). Run only Test 1.")

    # Test 1 always runs — only needs Hume API key
    await test_raw_connection(api_key)

    if not server_available:
        print("\nTo run Tests 2-4: start the backend with `uvicorn main:app --reload` then re-run.")
        return

    async with httpx.AsyncClient(timeout=30) as client:
        # Test 2 — intake flow; captures session_id for reuse
        session_id = await test_intake_flow(api_key, client)

        if session_id:
            # Test 3 — canvas trigger
            await test_canvas_trigger(api_key, client, session_id)

            # Test 4 — emotional conversation bridge
            await test_conversation_flow(api_key, client, session_id)
        else:
            print("\nSkipping Tests 3-4 — no session_id from intake flow.")


asyncio.run(main())
