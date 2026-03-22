const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USER_TOKEN_KEY = "arverie_user_token";
const SESSION_TOKEN_KEY = "arverie_session_token";

let sessionToken = localStorage.getItem(SESSION_TOKEN_KEY) || null;
let userToken = localStorage.getItem(USER_TOKEN_KEY) || null;

function setSessionToken(nextToken) {
  sessionToken = nextToken || null;
  if (sessionToken) localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  else localStorage.removeItem(SESSION_TOKEN_KEY);
}

function setUserToken(nextToken) {
  userToken = nextToken || null;
  if (userToken) localStorage.setItem(USER_TOKEN_KEY, userToken);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

function getAuthHeader(authType) {
  if (authType === "session" && sessionToken) {
    return { Authorization: `Bearer ${sessionToken}` };
  }
  if (authType === "user" && userToken) {
    return { Authorization: `Bearer ${userToken}` };
  }
  return {};
}

async function request(path, options = {}, authType = null) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(authType),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json();
}

export const api = {
  setAuthTokens: (tokens = {}) => {
    const { sessionToken: nextSessionToken, userToken: nextUserToken } = tokens;
    if (Object.prototype.hasOwnProperty.call(tokens, "sessionToken")) {
      setSessionToken(nextSessionToken);
    }
    if (Object.prototype.hasOwnProperty.call(tokens, "userToken")) {
      setUserToken(nextUserToken);
    }
  },

  // POST /session/start — creates session row, returns { session_id }
  startSession: (userId) =>
    request("/session/start", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  // POST /session/intake — extracts themes from text, returns { themes, drawing_prompt, opening_response }
  sendIntake: (
    sessionId,
    transcript,
    moodCheckin,
    guided = null,
    guideTheme = null,
  ) =>
    request(
      "/session/intake",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          transcript,
          mood_checkin: moodCheckin,
          guided,
          guide_theme: guideTheme,
        }),
      },
      "session",
    ),

  // POST /session/ws-token — mints short-lived websocket token
  getWsToken: (sessionId) =>
    request(
      "/session/ws-token",
      {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      },
      "session",
    ),

  // POST /session/canvas-snapshot — processes behavioral metrics, may return trigger
  sendSnapshot: (sessionId, snapshot, dialogueHistory, intakeThemes) =>
    request(
      "/session/canvas-snapshot",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          snapshot,
          dialogue_history: dialogueHistory,
          intake_themes: intakeThemes,
        }),
      },
      "session",
    ),

  // POST /session/end — uploads drawing, runs vision, generates questions
  endSession: (sessionId, imageBase64, canvasSummary, dialogueHistory) =>
    request(
      "/session/end",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          image_base64: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          canvas_summary: canvasSummary,
          dialogue_history: dialogueHistory,
        }),
      },
      "session",
    ),

  // POST /session/complete — generates letter, saves to Supabase
  completeSession: (
    sessionId,
    userId,
    { moodCheckout, userAnswers, durationSeconds, fullSessionData },
  ) =>
    request(
      "/session/complete",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          mood_checkout: moodCheckout,
          user_answers: userAnswers,
          duration_seconds: durationSeconds,
          full_session_data: fullSessionData,
        }),
      },
      "session",
    ),

  // POST /session/message — direct text message to Arverie during canvas session
  sendMessage: (
    sessionId,
    message,
    dialogueHistory,
    guided = null,
    guideTheme = null,
  ) =>
    request(
      "/session/message",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          message,
          dialogue_history: dialogueHistory,
          guided,
          guide_theme: guideTheme,
        }),
      },
      "session",
    ),

  // GET /sessions/{user_id} — returns last 7 sessions
  getSessions: (userId) => request(`/sessions/${userId}`, {}, "user"),
};
