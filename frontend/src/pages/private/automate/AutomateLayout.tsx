import SideNavbar from "@/components/nav/SideNavbar";
import { Outlet } from "react-router-dom";

function SecureLayout() {
  return (
    <div className="max-w-screen max-h-screen w-screen h-screen overflow-hidden flex">
      <SideNavbar />
      <div className="flex-grow p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default SecureLayout;
