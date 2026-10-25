import { useMemo, useState, type ElementType } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LogOut,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  Settings,
  Sprout,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { removeUser } from "@/store/slices/authSlice";
import { clearSessions, type Session } from "@/store/slices/sessionSlice";
import { AuthServices } from "@/services";
import { objectIdDate, initials } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ThemeToggle from "../Other/theme/ThemeToggle";
import Logo from "./Logo";

interface NavItemData {
  name: string;
  icon: ElementType;
  href: string;
}

const navItems: NavItemData[] = [
  { name: "Workflows", icon: Workflow, href: "/workflow" },
  { name: "Agent Hub", icon: Network, href: "/hub" },
];

type Group = { label: string; items: Session[] };

function groupSessions(sessions: Session[]): Group[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  const buckets: Record<string, Session[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Earlier: [],
  };
  for (const s of sessions) {
    const d = (s.createdAt ? new Date(s.createdAt) : objectIdDate(s._id))?.getTime();
    if (!d) buckets.Earlier.push(s);
    else if (d >= startOfToday.getTime()) buckets.Today.push(s);
    else if (d >= startOfToday.getTime() - day) buckets.Yesterday.push(s);
    else if (d >= startOfToday.getTime() - 7 * day) buckets["Previous 7 days"].push(s);
    else buckets.Earlier.push(s);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function sessionLabel(s: Session): string {
  if (s.title) return s.title;
  const d = objectIdDate(s._id);
  return d
    ? `Task from ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "Untitled task";
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { authData: user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className={cn("p-3", collapsed && "px-2")}>
        <Link
          to="/login"
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong bg-raised text-sm font-medium hover:bg-paper-2 transition-colors",
            collapsed && "w-10 px-0"
          )}
          aria-label="Sign in"
        >
          <Sprout className="size-4 text-sage-deep" />
          {!collapsed && "Sign in"}
        </Link>
      </div>
    );
  }

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const logout = async () => {
    setOpen(false);
    try {
      await AuthServices.logout();
    } catch {
      // the server may not offer a logout route yet; clearing this device still signs out locally
    }
    dispatch(removeUser());
    dispatch(clearSessions());
    toast.success("Signed out");
    navigate("/landing");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group m-2 flex items-center gap-3 rounded-2xl p-2 text-left transition-colors duration-200 hover:bg-accent",
            collapsed && "justify-center"
          )}
          aria-label="Account menu"
        >
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-peony-wash text-peony-deep">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-sm font-semibold">
                {initials(user.name)}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
              <span className="block truncate text-[13px] text-ink-soft">{user.email}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" side="top" sideOffset={6}>
        <div className="px-3 pt-2 pb-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-[13px] text-ink-soft">{user.email}</p>
        </div>
        <div className="space-y-0.5">
          {[
            { label: "Settings", icon: Settings, href: "/settings/general" },
            { label: "Integrations", icon: Plug, href: "/settings/integrations" },
          ].map(({ label, icon: Icon, href }) => (
            <button
              key={label}
              type="button"
              onClick={() => go(href)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-accent"
            >
              <Icon className="size-4 text-ink-soft" />
              {label}
            </button>
          ))}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm text-ink">Theme</span>
            <ThemeToggle compact />
          </div>
          <button
            type="button"
            onClick={() => go("/landing")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-accent"
          >
            <Sprout className="size-4 text-ink-soft" />
            About GoPilot
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger transition-colors hover:bg-danger-wash"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SidebarBody({
  collapsed,
  onToggle,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const location = useLocation();
  const sessions = useAppSelector((state) => state.session.sessions);
  const groups = useMemo(() => groupSessions(sessions ?? []), [sessions]);
  const onNew = location.pathname === "/new";

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link to="/new" onClick={onNavigate} className="rounded-lg px-1.5 py-1" aria-label="GoPilot home">
            <Logo variant="compact" />
          </Link>
        )}
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-accent hover:text-ink"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
        )}
      </div>

      <nav className={cn("space-y-0.5 px-2 pt-1", collapsed && "flex flex-col items-center")} aria-label="Main">
        <Link
          to="/new"
          onClick={onNavigate}
          aria-label="New task"
          title={collapsed ? "New task" : undefined}
          className={cn(
            "group flex h-10 items-center gap-3 rounded-xl px-2 text-sm font-medium transition-colors duration-200",
            onNew ? "bg-paper-3/80 text-ink" : "text-ink hover:bg-accent",
            collapsed && "w-10 justify-center px-0"
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-clay text-on-clay transition-transform duration-300 ease-[var(--ease-bloom)] group-hover:rotate-90">
            <Plus className="size-4" strokeWidth={2.4} />
          </span>
          {!collapsed && <span>New task</span>}
        </Link>
        {navItems.map(({ name, icon: Icon, href }) => (
          <NavLink
            key={href}
            to={href}
            onClick={onNavigate}
            aria-label={name}
            title={collapsed ? name : undefined}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 items-center gap-3 rounded-xl px-2 text-sm transition-colors duration-200",
                isActive ? "font-medium text-ink" : "text-ink hover:bg-accent",
                collapsed && "w-10 justify-center px-0"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={mobile ? "nav-active-m" : "nav-active"}
                    className="absolute inset-0 rounded-xl bg-paper-3/80"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative flex size-7 shrink-0 items-center justify-center">
                  <Icon className={cn("size-[18px]", isActive ? "text-clay-ink" : "text-ink-soft")} strokeWidth={1.75} />
                </span>
                {!collapsed && <span className="relative">{name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!collapsed && groups.length > 0 && (
          <div className="space-y-4">
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="px-2 pb-1 text-xs font-medium text-ink-faint">{g.label}</h2>
                <ul className="space-y-px">
                  {g.items.map((s) => {
                    const active = location.pathname === `/task/${s.sessionId}`;
                    return (
                      <li key={s._id || s.sessionId}>
                        <Link
                          to={`/task/${s.sessionId}`}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block truncate rounded-lg px-2 py-1.5 text-[13.5px] transition-colors duration-150",
                            active ? "bg-paper-3/80 text-ink" : "text-ink-soft hover:bg-accent hover:text-ink"
                          )}
                        >
                          {sessionLabel(s)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        {!collapsed && groups.length === 0 && (
          <p className="px-2 text-[13px] leading-relaxed text-ink-faint">
            Your tasks will appear here once you start one.
          </p>
        )}
      </div>

      <div className="border-t border-line">
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  );
}

/** Desktop sidebar, collapsible to a rail. */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("gopilot.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("gopilot.sidebar", c ? "open" : "collapsed");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });

  return (
    <aside
      className={cn(
        "hidden h-dvh shrink-0 border-r border-line bg-paper transition-[width] duration-300 ease-[var(--ease-soft)] md:block",
        collapsed ? "w-[60px]" : "w-[264px]"
      )}
    >
      <SidebarBody collapsed={collapsed} onToggle={toggle} />
    </aside>
  );
}

/** Phone drawer version of the sidebar. */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[#2a1d16]/35 dark:bg-black/60 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] bg-paper shadow-float md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            role="dialog"
            aria-label="Menu"
          >
            <SidebarBody collapsed={false} onNavigate={onClose} mobile />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
