import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from "react-router-dom";
import App from "./App";
import Landingpage from "./pages/public/Landingpage";
import Login from "./pages/public/Authentication/Login";
import SignIn from "./pages/public/Authentication/SignIn";
import AuthenticationLayout from "./pages/public/Authentication/AuthenticationLayout";
import AutomateLayout from "./pages/private/automate/AutomateLayout";

import SettingLayout from "./pages/private/setting/SettingLayout";
import IntegrationPage from "./pages/private/setting/IntegrationsPage";
import GeneralSettings from "./pages/private/setting/GeneralSettings";
import New from "./pages/private/automate/New";
import SessionChat from "./pages/private/automate/SessionChat";
import WorkFlow from "./pages/private/automate/WorkFlow";
import Flow from "./pages/private/automate/Flow";
import { HubPage } from "./pages/private/automate/Hub";
import HubWorkflowDetail from "./pages/private/automate/HubWorkflowDetail";
import NotFound from "./pages/public/NotFound";
import { useAppSelector } from "./store/hooks";

/** "/" opens the app for signed-in people and the landing page for everyone else. */
function Home() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/new" : "/landing"} replace />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<App />}>
        <Route index element={<Home />} />
        <Route path="/landing" element={<Landingpage />} />
        <Route element={<AuthenticationLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignIn />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
        </Route>
        <Route element={<AutomateLayout />}>
          <Route path="new" element={<New />} />
          <Route path="/task/:sessionId" element={<SessionChat />} />
          <Route path="/settings" element={<SettingLayout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="integrations" element={<IntegrationPage />} />
          </Route>
          <Route path="/workflow" element={<WorkFlow />} />
          <Route path="/workflow/:id" element={<Flow />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/hub/:id" element={<HubWorkflowDetail />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

export default router;
