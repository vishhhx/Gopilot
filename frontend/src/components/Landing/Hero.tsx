import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Flower, Garden } from "@/components/bloom/Flowers";
import { BOUQUET } from "@/lib/garden";
import { PetalDrift } from "@/components/bloom/PetalDrift";
import { SERVICE_ORDER, SERVICES, type ServiceId } from "@/lib/services";
import { useAppSelector } from "@/store/hooks";
import { RiseWords } from "./Reveal";

const BED_H = 720;
/** The landing bouquet, drawn taller so it climbs up beside the headline. */
const TALL = BOUQUET.map((p) => ({ ...p, h: p.h * 1.5 }));

/** What the agents just did, arriving one after another once the bouquet has bloomed. */
const NOTES: { service: ServiceId; text: string }[] = [
  { service: "gmail", text: "Replied to Priya" },
  { service: "calendar", text: "Friday, 3 PM booked" },
  { service: "meet", text: "Meet link sent" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <section id="top" className="relative overflow-hidden bg-paper">
      <PetalDrift count={14} alpha={0.5} />
      <div className="relative mx-auto flex min-h-[100svh] max-w-[1240px] flex-col px-5 pt-28 sm:px-8 lg:pt-32">
        <h1 className="relative z-10 font-serif text-[clamp(42px,8.2vw,124px)] leading-[0.95] font-normal tracking-[-0.035em] text-ink">
          <RiseWords text="Your Google apps," delay={0.25} />
          <br />
          <RiseWords text="in one chat." delay={0.5} />
        </h1>

        <div>
          <div className="relative z-10 pt-8 pb-4 lg:max-w-[40%] lg:pt-10">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
              className="max-w-[34ch] text-[19px] leading-[1.55] text-ink sm:text-[21px]"
            >
              Ask in plain words. GoPilot reads your mail, books the meeting, files the Drive doc and fills the
              sheet, with an agent for each app.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="h-12 px-7 text-[16px]">
                <Link to={isAuthenticated ? "/new" : "/login"}>
                  {isAuthenticated ? "Open GoPilot" : "Get started free"}
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 px-6 text-[16px]">
                <a href="#how">See it work</a>
              </Button>
            </motion.div>
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.25 }}
              className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-soft"
              aria-label="Works with"
            >
              {SERVICE_ORDER.map((id, i) => (
                <li key={id} className="inline-flex items-center gap-1.5">
                  <Flower service={id} size={18} bloom delay={1300 + i * 110} />
                  {SERVICES[id].name}
                </li>
              ))}
            </motion.ul>
          </div>

          <div className="relative -mx-5 mt-6 aspect-[1000/720] sm:-mx-8 lg:absolute lg:right-8 lg:bottom-0 lg:mx-0 lg:mt-0 lg:aspect-auto lg:h-[78%] lg:w-[57%]">
            <Garden plants={TALL} height={BED_H} ground className="absolute inset-0 h-full w-full" />
            <ul className="absolute top-[13%] right-[1%] hidden flex-col items-end gap-2 xl:flex" aria-label="Recent agent activity">
              {NOTES.map((n, i) => {
                const svc = SERVICES[n.service];
                return (
                  <motion.li
                    key={n.text}
                    initial={{ opacity: 0, x: 20, scale: 0.94 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: 2.8 + i * 0.55, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    className="inline-flex items-center gap-2 rounded-full bg-raised py-1.5 pr-3.5 pl-1.5 text-[14px] whitespace-nowrap text-ink shadow-float"
                  >
                    <span className={`flex size-6 items-center justify-center rounded-full ${svc.bgWash} ${svc.textDeep}`}>
                      <svc.icon className="size-3.5" strokeWidth={2} />
                    </span>
                    {n.text}
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
