import { Outlet } from "react-router-dom";
import SideBord from "../../../components/auth/SideBord";

function AuthenticationLayout() {
  return (
    <div className="flex min-h-screen w-screen bg-gray-100 dark:bg-black">
      {/* Left side: nested routes */}
      <div className="w-1/2">
        <Outlet />
      </div>

      {/* Right side: sidebar */}
      <SideBord />
    </div>
  );
}

export default AuthenticationLayout;
