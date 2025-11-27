"use client";

import { SettingSidebar } from "@/components/nav/SettingSidebar";
import { Outlet } from "react-router-dom";

export default function SettingLayout() {
  return (
    <div className="w-full h-full flex gap-5 ">
      <SettingSidebar />
      <div className="flex-1 py-10 pr-10">
        <Outlet />
      </div>
    </div>
  );
}
