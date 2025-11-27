import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import sessionReducer from "./slices/sessionSlice";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    session: sessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
