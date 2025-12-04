import {
  createBrowserRouter,
  createRoutesFromElements,
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
import New from "./pages/private/automate/New";
import SessionChat from "./pages/private/automate/SessionChat";
import WorkFlow from "./pages/private/automate/WorkFlow";
import Flow from "./pages/private/automate/Flow";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<App />}>
        <Route path="/landing" element={<Landingpage />} />
        <Route element={<AuthenticationLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignIn />} />
        </Route>
        <Route path="/" element={<AutomateLayout />}>
          <Route path="new" element={<New />} />
          <Route path="/task/:sessionId" element={<SessionChat />} />
          <Route path="/settings" element={<SettingLayout />}>
            <Route path="integrations" element={<IntegrationPage />} />
          </Route>
          <Route path="/workflow" element={<WorkFlow />} />
          <Route path="/workflow/:id" element={<Flow />} />
        </Route>
      </Route>
    </>
  )
);

export default router;
