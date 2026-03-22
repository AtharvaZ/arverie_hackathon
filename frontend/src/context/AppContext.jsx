import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { api } from "../utils/api";
import music1Src from "../assets/Music1.mp3";
import music2Src from "../assets/Music2.mp3";
import music3Src from "../assets/Music3.mp3";

const AppContext = createContext(null);
const TRACKS = [music1Src, music2Src, music3Src];

function getOrCreateUserId() {
  const key = "arverie_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const defaultSession = {
  // Identification
  sessionId: null,
  userId: getOrCreateUserId(),

  // Pre-session intake
  mood: null,
  moodColor: null,
  guided: null,
  intakeText: "", // "what's on your mind?" optional text
  guideTheme: null, // guided mode: 'emotion-anchored' | 'body-based' | 'narrative'

  // From /session/intake response
  themes: [],
  drawingPrompt: null,
  openingResponse: null,

  // Session runtime
  startTime: null,

  // Canvas behavioral data (accumulated during session)
  paintColors: [],
  erasureCount: 0,
  idleTime: 0,

  // Dialogue (Hume transcripts + trigger responses)
  dialogueHistory: [],

  // From /session/end response
  drawingDataURL: null,
  drawingUrl: null,
  visionDescription: null,
  reflectionQuestions: [],
  canvasSummary: null,
};

export function AppProvider({ children }) {
  const [soundOn, setSoundOn] = useState(true);
  const [session, setSession] = useState(defaultSession);
  const [pastSessions, setPastSessions] = useState([]);
  const audioRef = useRef(null);
  const trackIdx = useRef(0);
  const hasStarted = useRef(false);
  const soundOnRef = useRef(true);

  useEffect(() => {
    const userId = defaultSession.userId;
    if (!userId) return;
    api
      .getSessions(userId)
      .then((data) => {
        if (data?.sessions?.length) setPastSessions(data.sessions);
      })
      .catch(() => {});
  }, []);

  // Initialize looping ambient music playlist once.
  useEffect(() => {
    const audio = new Audio(TRACKS[0]);
    audio.preload = "auto";
    audio.volume = 0.35;
    audioRef.current = audio;

    function advanceTrack() {
      trackIdx.current = (trackIdx.current + 1) % TRACKS.length;
      audio.src = TRACKS[trackIdx.current];
      audio.load();
      if (soundOnRef.current) {
        audio.play().catch(() => {});
      }
    }

    audio.addEventListener("ended", advanceTrack);

    const timer = setTimeout(() => {
      if (!hasStarted.current && soundOnRef.current) {
        audio
          .play()
          .then(() => {
            hasStarted.current = true;
          })
          .catch(() => {});
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener("ended", advanceTrack);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    soundOnRef.current = soundOn;
    const audio = audioRef.current;
    if (!audio) return;

    if (soundOn) {
      if (hasStarted.current) {
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }
  }, [soundOn]);

  const resetSession = useCallback(() => {
    setSession((s) => ({
      ...defaultSession,
      userId: s.userId, // preserve userId across resets
    }));
  }, []);

  // Append a message to dialogueHistory
  const appendDialogue = useCallback((entry) => {
    setSession((s) => ({
      ...s,
      dialogueHistory: [...s.dialogueHistory, entry],
    }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        soundOn,
        setSoundOn,
        session,
        setSession,
        resetSession,
        appendDialogue,
        pastSessions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
