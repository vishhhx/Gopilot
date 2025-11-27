import { Outlet } from "react-router-dom";
import { useTheme } from "./components/Other/theme/use-theme";
import type { Theme } from "./components/Other/theme/theme-provider";
import { useEffect, useState } from "react";
import { useAppDispatch } from "./store/hooks";
import { AuthServices } from "./services";
import { addUser } from "./store/slices/authSlice";
import { LoaderOne } from "./components/ui/loader";
import { axiosInstance } from "./utils";
import { setSessions } from "./store/slices/sessionSlice";

function App() {
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const switchTheme = (ev: KeyboardEvent) => {
    if (ev.ctrlKey && (ev.key === "m" || ev.key === "M")) {
      const themes: Theme[] = ["dark", "light", "system"];
      const currentIndex = themes.indexOf(theme as Theme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setTheme(themes[nextIndex]);
    }
  };
  useEffect(() => {
    window.addEventListener("keydown", switchTheme);
    return () => window.removeEventListener("keydown", switchTheme);
  }, [theme]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await AuthServices.getCurrentUser();
        const { data } = await axiosInstance.get("/session/get-all-sessions");
        console.log(data);
        dispatch(setSessions(data.data));
        dispatch(addUser(response));
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
      <div className="flex h-screen w-screen items-center justify-center">
        <LoaderOne />;
      </div>
    );
  }

  return (
    <>
      <Outlet />
    </>
  );
}

export default App;
