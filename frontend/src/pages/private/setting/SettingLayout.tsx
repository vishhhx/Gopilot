import { Outlet } from "react-router-dom";
import { SettingSidebar } from "@/components/nav/SettingSidebar";

export default function SettingLayout() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-5 pt-10 pb-16 sm:px-8 sm:pt-14 md:flex-row md:gap-12">
        <SettingSidebar />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
