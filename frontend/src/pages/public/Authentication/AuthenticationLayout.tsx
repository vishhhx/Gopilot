import { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAppSelector } from "@/store/hooks";
import { SERVICES, type ServiceId } from "@/lib/services";
import { Flower, Garden } from "@/components/bloom/Flowers";
import { BOUQUET, BORDER } from "@/lib/garden";
import Logo from "@/components/nav/Logo";

const ASKS: { service: ServiceId; text: string }[] = [
  { service: "gmail", text: "Summarize my unread mail from this morning" },
  { service: "meet", text: "Find 30 minutes with Priya on Friday and send a Meet link" },
  { service: "sheets", text: "Add this week's invoices to my Expenses sheet" },
  { service: "forms", text: "Make a feedback form for Thursday's workshop" },
  { service: "drive", text: "Share the Q3 folder with the design team" },
  { service: "calendar", text: "What's on my calendar tomorrow?" },
];

/** The garden half of the sign-in screen: a bouquet growing under requests people make. */
function GardenPanel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % ASKS.length), 3600);
    return () => clearInterval(t);
  }, []);
  const ask = ASKS[i];
  const svc = SERVICES[ask.service];

  return (
    <div className="relative m-3 hidden flex-1 flex-col overflow-hidden rounded-[32px] bg-paper-2 lg:flex">
      <div className="px-12 pt-16">
        <p className="max-w-[18ch] font-serif text-[clamp(32px,3.2vw,46px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Ask once. Your agents do the rest.
        </p>
        <div className="mt-10 h-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex max-w-full items-center gap-3 rounded-[22px] rounded-bl-md bg-raised py-3 pr-5 pl-3 shadow-float"
            >
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${svc.bgWash}`}>
                <Flower service={ask.service} size={24} bloom />
              </span>
              <span className="text-[16px] text-ink">{ask.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-auto aspect-[1000/520] w-full">
        <Garden plants={BOUQUET} height={520} ground className="h-full w-full" />
      </div>
    </div>
  );
}

function AuthenticationLayout() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/new" replace />;

  return (
    <div className="flex min-h-dvh w-full bg-paper">
      <div className="relative flex min-h-dvh w-full flex-col lg:w-[46%] lg:max-w-[640px]">
        <header className="px-6 pt-6 sm:px-10">
          <Link to="/landing" className="inline-block rounded-lg" aria-label="GoPilot home">
            <Logo motion="bloom" />
          </Link>
        </header>
        <main className="flex flex-1 items-center px-6 py-12 sm:px-10">
          <div className="mx-auto w-full max-w-[400px]">
            <Outlet />
          </div>
        </main>
        <div className="pointer-events-none aspect-[1000/160] w-full lg:hidden" aria-hidden>
          <Garden plants={BORDER} height={160} className="h-full w-full" />
        </div>
      </div>
      <GardenPanel />
    </div>
  );
}

export default AuthenticationLayout;
