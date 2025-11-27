import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Session {
  _id: string;
  sessionId: string;
}

export interface SessionState {
  sessions: Session[] | null;
}

const initialState: SessionState = {
  sessions: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<Session[]>) => {
      state.sessions = action.payload;
    },
    addSession: (state, action: PayloadAction<Session>) => {
      if (!state.sessions) state.sessions = [action.payload];
      else state.sessions.unshift(action.payload);
    },
    clearSessions: (state) => {
      state.sessions = null;
    },
  },
});

export const { setSessions, addSession, clearSessions } = sessionSlice.actions;

export default sessionSlice.reducer;
