from dataclasses import dataclass, field
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


@dataclass
class TriggerResult:
    should_fire: bool
    dominant_signal: Optional[str] = None
    signal_context: Optional[dict] = None
    flow_intensity: str = "medium"


class StartSessionRequest(BaseModel):
    user_id: UUID


class StartSessionResponse(BaseModel):
    session_id: str
    session_token: str
    user_token: str
    auth_mode: str


class IntakeRequest(BaseModel):
    session_id: str
    transcript: str = Field(min_length=1, max_length=6000)
    mood_checkin: str = Field(min_length=1, max_length=120)


class IntakeResponse(BaseModel):
    themes: list[str]
    drawing_prompt: Optional[str]
    opening_response: str


class EraseEvent(BaseModel):
    timestamp: float
    x: float
    y: float
    radius: float


class QuadrantDistribution(BaseModel):
    top_left: float = 0.0
    top_right: float = 0.0
    bottom_left: float = 0.0
    bottom_right: float = 0.0


class CanvasSnapshot(BaseModel):
    strokes_per_second: float = 0.0
    stroke_count_window: int = 0
    current_color: str = "#000000"
    current_brush: Optional[str] = None
    brush_usage_window: dict[str, int] = Field(default_factory=dict)
    avg_stroke_speed_window: float = 0.0
    stroke_samples_window: list[dict] = Field(default_factory=list)
    colors_used_this_window: list[str] = Field(default_factory=list)
    erase_events: list[EraseEvent] = Field(default_factory=list)
    erase_count_window: int = 0
    quadrant_distribution: QuadrantDistribution = Field(default_factory=QuadrantDistribution)
    last_stroke_timestamp: float = 0.0
    elapsed_seconds: float = 0.0


class CanvasSnapshotRequest(BaseModel):
    session_id: str
    snapshot: CanvasSnapshot
    dialogue_history: list[dict] = Field(default_factory=list)
    intake_themes: list[str] = Field(default_factory=list)


class CanvasSnapshotResponse(BaseModel):
    triggered: bool
    response: Optional[str]
    trigger_type: Optional[str] = None
    flow_intensity: str = "medium"


class SessionEndRequest(BaseModel):
    session_id: str
    image_base64: str = Field(min_length=32, max_length=12_000_000)
    canvas_summary: dict
    dialogue_history: list[dict] = Field(default_factory=list)


class SessionEndResponse(BaseModel):
    drawing_url: str
    vision_description: str
    reflection_questions: list[str]


class SessionCompleteRequest(BaseModel):
    session_id: str
    user_id: str
    mood_checkout: Optional[str] = None
    user_answers: list[str]
    duration_seconds: int
    full_session_data: dict


class SessionCompleteResponse(BaseModel):
    letter: str
    color_palette: list[str]


class UserMessageRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=1200)
    dialogue_history: list[dict] = Field(default_factory=list)


class UserMessageResponse(BaseModel):
    response: str


class WsTokenRequest(BaseModel):
    session_id: str


class WsTokenResponse(BaseModel):
    ws_token: str


class SessionSummary(BaseModel):
    id: str
    created_at: str
    mood_checkin: Optional[str]
    mood_checkout: Optional[str]
    drawing_url: Optional[str]
    data: Optional[dict]


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]
