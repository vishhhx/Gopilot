import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { Plug, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/settings/general", label: "General", icon: SlidersHorizontal },
  { to: "/settings/integrations", label: "Connected apps", icon: Plug },
];

/** Settings sections: a column on wide screens, a row of tabs on phones. */
export function SettingSidebar() {
  return (
    <nav aria-label="Settings" className="md:w-56 md:shrink-0">
      <h1 className="font-serif text-[30px] leading-tight font-normal tracking-[-0.02em] md:text-[34px]">Settings</h1>
      <ul className="mt-5 flex gap-1 md:mt-7 md:flex-col">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} className="relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-[14.5px]">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="settings-active"
                      className="absolute inset-0 rounded-xl bg-paper-3/80"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <Icon className={cn("relative size-4", isActive ? "text-clay-ink" : "text-ink-soft")} />
                  <span className={cn("relative", isActive ? "font-medium text-ink" : "text-ink-soft")}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
