import type { AuthState, User } from "@/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const initialState: AuthState = {
  isAuthenticated: false,
  authData: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.authData = action.payload;
    },
    removeUser: (state) => {
      state.isAuthenticated = false;
      state.authData = null;
    },
  },
});

export const { addUser,removeUser } = authSlice.actions;

export default authSlice.reducer;
