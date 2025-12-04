import { cn } from "@/lib/utils";
import { useEffect, useState, type ElementType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAppSelector } from "@/store/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";

interface CollapsedProps {
  collapsed: boolean;
}
interface NavItemData {
  name: string;
  icon: ElementType;
  href: string;
}

const SideCollapse = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M9 4v16" />
      <path d="M15 10l-2 2l2 2" />
    </svg>
  );
};

const SideExpand = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M9 4v16" />
      <path d="M14 10l2 2l-2 2" />
    </svg>
  );
};

const AddIcon = () => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M17 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M7 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      </svg>
    </>
  );
};

const UpgradeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
  </svg>
);

const PlugIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054z" />
    <path d="M4 20l3.5 -3.5" />
    <path d="M15 4l-3.5 3.5" />
    <path d="M20 9l-3.5 3.5" />
  </svg>
);

const HelpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M12 17l0 .01" />
    <path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
    <path d="M9 12h12l-3 -3" />
    <path d="M18 15l3 -3" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
  </svg>
);
const UserButtonPlaceholder: React.FC<CollapsedProps> = ({ collapsed }) => {
  const user = useAppSelector((state) => state.auth.authData);
  const navigate = useNavigate();
  const popOverContents: NavItemData[] = [
    {
      icon: UpgradeIcon,
      name: "Upgrade plan",
      href: "/settings/general",
    },
    {
      icon: SettingsIcon,
      name: "Settings",
      href: "/settings/general",
    },
    {
      icon: PlugIcon,
      name: "Integrations",
      href: "/settings/integrations",
    },
    {
      icon: HelpIcon,
      name: "Help",
      href: "/help",
    },
    {
      icon: LogoutIcon,
      name: "Logout",
      href: "/logout",
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center p-3 border-t transition-all duration-300 ease-in-out hover:bg-accent/50 cursor-pointer group",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div
              className={cn(
                "flex-shrink-0 size-10 rounded-full bg-muted overflow-hidden ring-2 ring-transparent transition-all duration-300 group-hover:ring-primary/20",
                collapsed && "mx-auto"
              )}
            >
              <img
                src={user?.avatarUrl}
                alt={user?.name}
                className="size-10 rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            <div
              className={cn(
                "flex flex-col min-w-0 transition-all duration-300 ease-in-out",
                collapsed
                  ? "w-0 opacity-0 translate-x-4"
                  : "w-full opacity-100 translate-x-0"
              )}
            >
              <p className="text-sm font-medium text-foreground truncate transition-colors duration-200">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate transition-colors duration-200">
                {user?.email.toString()}
              </p>
            </div>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-2 "
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-1">
          {/* User Info Header */}
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>

          <div className="border-t my-2" />

          {popOverContents.map((item, index) => {
            const Icon = item.icon;
            const isLogout = item.name.toLowerCase() === "logout";

            return (
              <div
                key={index}
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isLogout
                    ? "text-red-400 hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Icon className="size-4 flex-shrink-0" />
                <span className="capitalize">{item.name}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
const navItems: NavItemData[] = [
  {
    name: "New Task",
    icon: AddIcon,
    href: "/new",
  },
  {
    name: "Chats",
    icon: () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M8 9h8" />
        <path d="M8 13h6" />
        <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
      </svg>
    ),
    href: "/chats",
  },
  {
    name: "workflow",
    icon: () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect width="8" height="8" x="3" y="3" rx="2" />
        <path d="M7 11v4a2 2 0 0 0 2 2h4" />
        <rect width="8" height="8" x="13" y="13" rx="2" />
      </svg>
    ),
    href: "/Workflow",
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<string>(location.pathname);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const sessions = useAppSelector((state) => state.session.sessions);
  // const user = useAppSelector((state) => state.auth.authData);
  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const handleNavigate = (href: string) => {
    navigate(href);
    setActiveItem(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-background text-foreground transition-all duration-300 ease-in-out h-screen shadow-sm",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div
          className={cn(
            "transition-all duration-300 overflow-hidden",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          <Logo size={18} showText={true} variant="compact" />
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 hover:bg-accent/80 active:scale-95 cursor-pointer",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <SideExpand /> : <SideCollapse />}
        </button>
      </div>

      <div className="flex-1 p-2 scrollbar-thin">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  "flex items-center w-full rounded-lg transition-all duration-200 group active:scale-95",
                  collapsed ? "justify-center p-3" : "justify-start p-3 gap-3",
                  isActive
                    ? "bg-orange-500/80 text-white shadow-lg"
                    : "hover:bg-gray-300/60 text-foreground"
                )}
                aria-label={item.name}
              >
                <div className="flex-shrink-0 size-5">
                  <Icon />
                </div>

                <span
                  className={cn(
                    "text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap",
                    collapsed
                      ? "w-0 opacity-0 translate-x-4"
                      : "w-auto opacity-100 translate-x-0"
                  )}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>
        <div>
          {/* TASKS SECTION (SESSIONS) */}
          {sessions && sessions.length > 0 && (
            <div className={cn("mt-6", collapsed && "px-1")}>
              {!collapsed && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide px-3">
                  Tasks
                </p>
              )}

              <div className="mt-2 space-y-1">
                {sessions.map((s) => {
                  const isActive = location.pathname.includes(s.sessionId);
                  return (
                    <Button
                      key={s._id}
                      onClick={() => handleNavigate(`/task/${s.sessionId}`)}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left transition-all rounded-xl",
                        isActive && "font-medium shadow-sm"
                      )}
                    >
                      {collapsed ? (
                        <span className="text-xs font-bold">T</span>
                      ) : (
                        <span className="text-sm truncate">
                          {s.sessionId.substring(0, 20)}...
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <UserButtonPlaceholder collapsed={collapsed} />
      </div>
    </aside>
  );
}
