import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Session {
  _id: string;
  sessionId: string;
  title?: string;
  createdAt?: string;
}

export interface SessionState {
  sessions: Session[] | null;
}

/*
  The session list endpoint returns ids only. Titles learned while chatting are remembered in this
  browser so the sidebar can show them next time. A per-viewer convenience; safe to lose.
*/
const TITLE_KEY = "gopilot.sessionTitles";

function readTitles(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TITLE_KEY) || "{}");
  } catch {
    return {};
  }
}

function rememberTitle(sessionId: string, title: string) {
  try {
    const all = readTitles();
    all[sessionId] = title;
    localStorage.setItem(TITLE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

const initialState: SessionState = {
  sessions: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<Session[]>) => {
      const titles = readTitles();
      state.sessions = (action.payload ?? []).map((s) => ({
        ...s,
        title: s.title || titles[s.sessionId],
      }));
    },
    addSession: (state, action: PayloadAction<Session>) => {
      if (action.payload.title) rememberTitle(action.payload.sessionId, action.payload.title);
      if (!state.sessions) state.sessions = [action.payload];
      else state.sessions.unshift(action.payload);
    },
    setSessionTitle: (state, action: PayloadAction<{ sessionId: string; title: string }>) => {
      const { sessionId, title } = action.payload;
      rememberTitle(sessionId, title);
      const s = state.sessions?.find((x) => x.sessionId === sessionId);
      if (s && s.title !== title) s.title = title;
    },
    clearSessions: (state) => {
      state.sessions = null;
    },
  },
});

export const { setSessions, addSession, setSessionTitle, clearSessions } = sessionSlice.actions;

export default sessionSlice.reducer;
