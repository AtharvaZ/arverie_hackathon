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
const USER_NAME_KEY = "arverie_user_name";
const SOUND_ON_KEY = "arverie_sound_on";

function getOrCreateUserId() {
  const key = "arverie_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getStoredUserName() {
  return localStorage.getItem(USER_NAME_KEY) || "";
}

function getStoredSoundOn() {
  const stored = localStorage.getItem(SOUND_ON_KEY);
  if (stored == null) return true;
  return stored === "1";
}

const defaultSession = {
  // Identification
  sessionId: null,
  userId: getOrCreateUserId(),

  // Pre-session intake
  mood: null,
  moodColor: null,
  interactionMode: "voice", // 'voice' | 'text'
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
  const [soundOn, setSoundOn] = useState(getStoredSoundOn);
  const [session, setSession] = useState(defaultSession);
  const [pastSessions, setPastSessions] = useState([]);
  const [user, setUser] = useState(() => ({
    id: defaultSession.userId,
    name: getStoredUserName(),
  }));
  const audioRef = useRef(null);
  const trackIdx = useRef(0);
  const hasStarted = useRef(false);
  const soundOnRef = useRef(true);

  const refreshPastSessions = useCallback(
    async (userIdArg) => {
      const userId = userIdArg || user.id;
      if (!userId) return;
      try {
        const data = await api.getSessions(userId);
        setPastSessions(data?.sessions || []);
      } catch {
        setPastSessions([]);
      }
    },
    [user.id],
  );

  useEffect(() => {
    refreshPastSessions(defaultSession.userId);
  }, [refreshPastSessions]);

  const setUserName = useCallback((name) => {
    const nextName = (name || "").trim();
    localStorage.setItem(USER_NAME_KEY, nextName);
    setUser((prev) => ({ ...prev, name: nextName }));
  }, []);

  // Initialize looping ambient music playlist once.
  useEffect(() => {
    const audio = new Audio(TRACKS[0]);
    audio.preload = "auto";
    audio.volume = 0.35;
    audioRef.current = audio;

    const attemptStart = () => {
      if (!soundOnRef.current) return;
      audio
        .play()
        .then(() => {
          hasStarted.current = true;
        })
        .catch(() => {});
    };

    function advanceTrack() {
      trackIdx.current = (trackIdx.current + 1) % TRACKS.length;
      audio.src = TRACKS[trackIdx.current];
      audio.load();
      if (soundOnRef.current) {
        attemptStart();
      }
    }

    audio.addEventListener("ended", advanceTrack);
    audio.addEventListener("canplay", attemptStart);

    const unlockEvents = ["pointerdown", "touchstart", "keydown"];
    const unlockPlayback = () => {
      if (hasStarted.current) return;
      attemptStart();
    };
    unlockEvents.forEach((eventName) => {
      window.addEventListener(eventName, unlockPlayback, { passive: true });
    });

    const timer = setTimeout(() => {
      if (!hasStarted.current && soundOnRef.current) {
        attemptStart();
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener("ended", advanceTrack);
      audio.removeEventListener("canplay", attemptStart);
      unlockEvents.forEach((eventName) => {
        window.removeEventListener(eventName, unlockPlayback);
      });
      audio.pause();
    };
  }, []);

  useEffect(() => {
    soundOnRef.current = soundOn;
    localStorage.setItem(SOUND_ON_KEY, soundOn ? "1" : "0");
    const audio = audioRef.current;
    if (!audio) return;

    if (soundOn) {
      audio
        .play()
        .then(() => {
          hasStarted.current = true;
        })
        .catch(() => {});
    } else {
      audio.pause();
    }
  }, [soundOn]);

  const resetSession = useCallback(() => {
    api.setAuthTokens({ sessionToken: null });
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
        user,
        setUserName,
        soundOn,
        setSoundOn,
        session,
        setSession,
        resetSession,
        appendDialogue,
        pastSessions,
        refreshPastSessions,
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
