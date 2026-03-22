import os
import json
import logging
import re
from typing import Any, Optional
from anthropic import Anthropic
from dotenv import load_dotenv
from models import IntakeResponse

load_dotenv()
logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"

MAX_DIALOGUE_TURNS = 12
MAX_DIALOGUE_CHARS = 240
MAX_TRIGGER_DETAIL_CHARS = 600
MAX_CANVAS_SUMMARY_CHARS = 1000
MAX_RESPONSE_CHARS = 220


def get_claude_client() -> Anthropic:
    return Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _extract_text(result: Any) -> str:
    """Extract first text block from Anthropic response safely."""
    blocks = getattr(result, "content", None)
    if not blocks:
        return ""
    for block in blocks:
        block_type = getattr(block, "type", None)
        if block_type == "text":
            return (getattr(block, "text", "") or "").strip()
    return ""


def _truncate(text: str, limit: int) -> str:
    clean = (text or "").strip()
    if len(clean) <= limit:
        return clean
    return clean[: limit - 3].rstrip() + "..."


def _normalize_dialogue_history(dialogue_history: list[dict]) -> list[dict]:
    """Keep only recent, relevant fields so prompts stay grounded and bounded."""
    normalized: list[dict] = []
    for turn in dialogue_history[-MAX_DIALOGUE_TURNS:]:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role", "")).strip().lower()
        if role not in {"assistant", "user", "memory"}:
            continue
        content = _truncate(str(turn.get("content", "")), MAX_DIALOGUE_CHARS)
        if not content:
            continue
        normalized_turn = {"role": role, "content": content}
        timestamp = turn.get("timestamp")
        trigger = turn.get("trigger")
        if timestamp is not None:
            normalized_turn["timestamp"] = _truncate(str(timestamp), 16)
        if trigger is not None:
            normalized_turn["trigger"] = _truncate(str(trigger), 48)
        normalized.append(normalized_turn)
    return normalized


def _sanitize_trigger_response(text: str) -> str:
    """Normalize model output to simple spoken text suitable for Hume TTS."""
    cleaned = (text or "").strip()
    cleaned = re.sub(r"\[(.*?)\]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    cleaned = " ".join([s for s in sentences if s][:2]).strip()
    cleaned = _truncate(cleaned, MAX_RESPONSE_CHARS)
    return cleaned or "something about what you're doing right now..."


def call_intake(transcript: str, mood: str) -> IntakeResponse:
    """
    Call 1 — Extract emotional themes, optional drawing prompt, and
    an opening response from the user's intake transcript.
    """
    system = """You are Arverié, a gentle reflective companion for expressive art therapy.
Extract 2-3 emotional themes from what the user shared.
Keep them simple and human — "feeling unseen", "uncertainty about the future".
Never use clinical terms.
Optionally suggest one drawing prompt grounded in their words.
Write a brief opening response (1-2 sentences) to transition them into drawing.

Respond ONLY in JSON. No preamble. No markdown.
{
  "themes": ["theme1", "theme2"],
  "drawing_prompt": "string or null",
  "opening_response": "string"
}"""

    fallback = IntakeResponse(
        themes=["present moment"],
        drawing_prompt=None,
        opening_response="Take your time. The canvas is ready when you are.",
    )

    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": f"Mood: {mood}\n\nWhat they shared: {transcript}",
                }
            ],
        )
        text = result.content[0].text
        parsed = json.loads(text)
        return IntakeResponse(
            themes=parsed.get("themes", ["present moment"]),
            drawing_prompt=parsed.get("drawing_prompt"),
            opening_response=parsed.get(
                "opening_response",
                "Take your time. The canvas is ready when you are.",
            ),
        )
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Claude intake response parsing failed: {e}")
        return fallback
    except Exception as e:
        logger.error(f"Claude intake call failed: {e}")
        return fallback


def call_trigger_response(
    trigger_type: str,
    trigger_detail: dict,
    themes: list[str],
    canvas_summary: dict,
    dialogue_history: list[dict],
) -> str:
    """
    Call 2 — Generate a single gentle spoken response when a canvas signal fires.
    """
    normalized_history = _normalize_dialogue_history(dialogue_history)
    safe_trigger_detail = _truncate(json.dumps(trigger_detail, ensure_ascii=True), MAX_TRIGGER_DETAIL_CHARS)
    safe_canvas_summary = _truncate(json.dumps(canvas_summary, ensure_ascii=True), MAX_CANVAS_SUMMARY_CHARS)

    system = f"""You are Arverie, a warm reflective companion sitting alongside someone while they draw.

SESSION CONTEXT:
- Emotional themes from intake: {themes}
- Canvas summary so far: {safe_canvas_summary}
- Conversation so far: {json.dumps(normalized_history, ensure_ascii=True)}

CURRENT TRIGGER:
- Type: {trigger_type}
- Detail: {safe_trigger_detail}

Generate ONE gentle response (1 sentence preferred, max 2).

Rules:
- Ground every response in either CURRENT TRIGGER detail or exact user words from conversation.
- Never introduce new facts, symbols, colors, events, or emotions that are not present in context.
- If context is thin, use a neutral observational line and stop.
- Keep language plain and spoken, with no analysis.
- Mirror the user's own words when possible.
- Never interpret or explain meaning. Never say "this means...".
- Do NOT use stage directions, brackets, quotation marks, emojis, or delivery cues.
- Avoid reflexive fillers like "hmm" unless the user just used a filler word.
- Output only the words to be spoken. Nothing else.

Good examples:
"you've come back to that area a few times..."
"there's a pause there..."
"you stayed with that part..." """

    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=128,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a response for trigger: {trigger_type}",
                }
            ],
        )
        return _sanitize_trigger_response(_extract_text(result))
    except Exception as e:
        logger.error(f"Claude trigger response call failed: {e}")
        return "something about what you're doing right now..."


def call_vision_description(image_base64: str) -> str:
    """
    Call Vision — Describe the drawing observationally (not interpretively).
    """
    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Describe this drawing in 2-3 sentences. "
                                "Focus on what you see — shapes, colors, areas of density, empty space. "
                                "Be observational, not interpretive. Plain text only."
                            ),
                        },
                    ],
                }
            ],
        )
        return result.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude vision call failed: {e}")
        return "A drawing with various marks and colors on the canvas."


def call_reflection_questions(
    mood_checkin: str,
    intake_transcript: str,
    themes: list[str],
    canvas_summary: dict,
    vision_description: str,
    dialogue_history: list[dict],
) -> list[str]:
    """
    Call 3 — Generate 3-5 reflective questions grounded in the full session.
    """
    system = f"""You are Arverié. Generate 3-5 reflective questions for the user about their session.

WHAT THEY BROUGHT IN:
Mood: {mood_checkin}
What they shared: {intake_transcript}
Themes: {themes}

WHAT HAPPENED ON CANVAS:
{canvas_summary}

WHAT CLAUDE SEES IN THE IMAGE:
{vision_description}

WHAT WAS SAID DURING SESSION:
{dialogue_history}

Rules:
- Each question weaves together what they said, drew, and how they drew it
- Surface connections they might not have noticed
- Never ask more than one thing per question
- Use "you" language, not "the drawing"
- No preamble. Return ONLY a JSON array.
["question 1", "question 2", "question 3"]"""

    fallback = [
        "What stayed with you from this session?",
        "What surprised you as you drew?",
    ]

    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system=system,
            messages=[{"role": "user", "content": "Generate reflection questions."}],
        )
        text = result.content[0].text.strip()
        questions = json.loads(text)
        if isinstance(questions, list):
            return questions
        logger.error("Claude reflection questions returned non-list JSON")
        return fallback
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Claude reflection questions parsing failed: {e}")
        return fallback
    except Exception as e:
        logger.error(f"Claude reflection questions call failed: {e}")
        return fallback


def call_user_message(
    message: str,
    themes: list[str],
    dialogue_history: list[dict],
) -> str:
    """
    Call 5 — Respond to a direct text message from the user during the drawing session.
    Returns a warm 1-2 sentence Arverié response grounded in the user's message and themes.
    """
    normalized_history = _normalize_dialogue_history(dialogue_history)

    system = f"""You are Arverié, a warm reflective companion sitting alongside someone while they draw.

SESSION THEMES: {themes}
CONVERSATION SO FAR: {json.dumps(normalized_history, ensure_ascii=True)}

The user has just typed a message to you. Respond with warmth in 1-2 sentences.

Rules:
- Stay grounded in what the user actually said and the session themes.
- Keep language plain and spoken — not clinical, not poetic to excess.
- Mirror the user's own words when natural.
- Never interpret or explain meaning. Never say "this means...".
- No stage directions, brackets, quotation marks, or emojis.
- Output only the words of your response. Nothing else."""

    fallback = "I hear you. Take your time with whatever is coming up."

    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=128,
            system=system,
            messages=[{"role": "user", "content": message}],
        )
        response = _sanitize_trigger_response(_extract_text(result))
        return response or fallback
    except Exception as e:
        logger.error(f"Claude user message call failed: {e}")
        return fallback


def call_session_letter(
    intake_transcript: str,
    themes: list[str],
    canvas_summary: dict,
    vision_description: str,
    dialogue_history: list[dict],
    qa_pairs: list[dict],
) -> str:
    """
    Call 4 — Write a short, warm session letter to the user.
    """
    system = f"""You are Arverié. Write a short, warm, personal letter to the user about their session.

WHAT THEY BROUGHT IN:
{intake_transcript}
Themes: {themes}

WHAT HAPPENED ON CANVAS:
{canvas_summary}

WHAT CLAUDE SEES IN THE IMAGE:
{vision_description}

WHAT WAS SAID DURING SESSION:
{dialogue_history}

THEIR REFLECTIONS:
{qa_pairs}

Rules:
- 3-5 sentences maximum
- Warm, personal, not clinical
- Weave together what they said, drew, and reflected on
- Notice something they might not have named themselves
- End pointing forward, not backward
- Write as a letter — start with "You..."
- Plain text only. No markdown. No subject. No signature."""

    try:
        client = get_claude_client()
        result = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system=system,
            messages=[{"role": "user", "content": "Write the session letter."}],
        )
        return result.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude session letter call failed: {e}")
        return (
            "You showed up today, and that matters. "
            "Whatever you carried into this session, you met it in your own way."
        )
