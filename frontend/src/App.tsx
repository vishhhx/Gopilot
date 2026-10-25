import { Outlet } from "react-router-dom";
import { useTheme } from "./components/Other/theme/use-theme";
import type { Theme } from "./components/Other/theme/theme-provider";
import { useEffect, useState } from "react";
import { useAppDispatch } from "./store/hooks";
import { AuthServices } from "./services";
import { addUser } from "./store/slices/authSlice";
import { axiosInstance } from "./utils";
import { setSessions } from "./store/slices/sessionSlice";
import { Blossom } from "./components/bloom/Blossom";

function App() {
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);

  // Ctrl+M cycles dark → light → system
  useEffect(() => {
    const switchTheme = (ev: KeyboardEvent) => {
      if (ev.ctrlKey && (ev.key === "m" || ev.key === "M")) {
        const themes: Theme[] = ["dark", "light", "system"];
        const nextIndex = (themes.indexOf(theme as Theme) + 1) % themes.length;
        setTheme(themes[nextIndex]);
      }
    };
    window.addEventListener("keydown", switchTheme);
    return () => window.removeEventListener("keydown", switchTheme);
  }, [theme, setTheme]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await AuthServices.getCurrentUser();
        dispatch(addUser(response));
        const { data } = await axiosInstance.get("/session/get-all-sessions");
        dispatch(setSessions(data.data));
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-5 bg-paper">
        <Blossom size={64} motion="loading" label="Loading GoPilot" />
        <p className="font-serif text-lg text-ink-soft">GoPilot</p>
      </div>
    );
  }

  return <Outlet />;
}

export default App;
