import re


MAX_SAFE_MESSAGE_CHARS = 1200

CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")
PROMPT_INJECTION_RE = re.compile(
    r"(" 
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions|"
    r"reveal\s+(your\s+)?(system\s+prompt|hidden\s+prompt)|"
    r"developer\s+message|system\s+message|"
    r"jailbreak|do\s+anything\s+now|"
    r"act\s+as\s+.*(system|developer|admin)|"
    r"bypass\s+safety|"
    r"<\/?script|javascript:"
    r")",
    re.IGNORECASE,
)


def normalize_user_text(text: str) -> str:
    cleaned = CONTROL_CHARS_RE.sub("", (text or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > MAX_SAFE_MESSAGE_CHARS:
        cleaned = cleaned[:MAX_SAFE_MESSAGE_CHARS]
    return cleaned


def detect_suspicious_prompt_input(text: str) -> bool:
    return bool(PROMPT_INJECTION_RE.search(text or ""))