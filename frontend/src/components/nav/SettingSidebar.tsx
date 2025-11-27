import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plug, Shield, Bell, BarChart3 } from "lucide-react";
interface SettingElementType {
  id: string;
  title: string;
  description: string;
  icon: any;
}
const SettingElements: SettingElementType[] = [
  {
    id: "general",
    title: "General Settings",
    description: "Manage app preferences and appearance.",
    icon: LayoutGrid,
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Connect Shield with Gmail and other web services.",
    icon: Plug,
  },
  {
    id: "security",
    title: "Security & Privacy",
    description: "Manage vault, data protection, and access control.",
    icon: Shield,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure email and in-app alert preferences.",
    icon: Bell,
  },
  {
    id: "reports",
    title: "Reports & History",
    description: "View past scans, analytics, and performance insights.",
    icon: BarChart3,
  },
];

export function SettingSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-3/12 h-full py-10 pl-8 pr-4 flex justify-end">
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>

        <nav className="flex flex-col gap-2 mt-4">
          {SettingElements.map((ele) => {
            const Icon = ele.icon;
            const isActive = location.pathname.includes(ele.id);

            return (
              <Button
                key={ele.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left transition-all rounded-xl",
                  isActive && "font-medium shadow-sm"
                )}
                onClick={() => navigate(`/settings/${ele.id}`)}
              >
                <Icon className="mr-2 h-5 w-5" />
                {ele.title}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
