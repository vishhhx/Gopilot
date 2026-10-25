import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Blossom, Petal } from "@/components/bloom/Blossom";
import { Flower } from "@/components/bloom/Flowers";
import { Reveal } from "./Reveal";

const SCOPES = [
  { id: "gmail.readonly", label: "Read your email", note: "So the reader agent can find and summarize messages." },
  { id: "gmail.send", label: "Send email for you", note: "So the writer agent can reply and send what you ask." },
  { id: "gmail.modify", label: "Organize labels and trash", note: "So agents can archive, label and clear old mail." },
];

export function Permissions() {
  const [on, setOn] = useState<string[]>(["gmail.readonly", "gmail.send"]);
  const toggle = (id: string) => setOn((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return (
    <section className="bg-paper-2 py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <h2 className="font-serif text-[clamp(38px,4.6vw,64px)] leading-[1.02] font-normal tracking-[-0.03em]">
              You choose what each agent can touch.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-ink">
              Connect Gmail, Calendar, Drive, Sheets, Meet and Forms one at a time, and tick only the permissions
              you want to give. GoPilot asks Google for those and nothing more, and you can remove its access from
              your Google account whenever you like.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div data-ui className="rounded-[28px] border border-line bg-raised p-6 shadow-float sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-paper-2">
                <Blossom size={34} motion="sway" />
              </span>
              <span className="relative h-6 flex-1 [container-type:inline-size]" aria-hidden>
                <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-line-strong" />
                {[0, 0.85, 1.7].map((delay, i) => (
                  <span
                    key={i}
                    className="absolute top-0 left-0 animate-travel motion-reduce:hidden"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <Petal color={["var(--peony)", "var(--clay)", "var(--peony-deep)"][i]} size={18} rotate={90} />
                  </span>
                ))}
              </span>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-peony-wash">
                <Flower service="gmail" size={36} />
              </span>
            </div>

            <h3 className="mt-7 font-serif text-[24px] tracking-[-0.01em]">Connect Gmail</h3>
            <p className="mt-1 text-[15px] text-ink-soft">Choose what GoPilot's Gmail agents may do.</p>

            <ul className="mt-5 space-y-2">
              {SCOPES.map((s) => {
                const checked = on.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "flex w-full items-start gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200",
                        checked ? "bg-peony-wash" : "bg-paper-2 hover:bg-paper-3"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md transition-all duration-300 ease-[var(--ease-bloom)]",
                          checked ? "scale-100 bg-peony-deep text-white dark:text-paper" : "scale-90 border-2 border-line-strong"
                        )}
                      >
                        {checked && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15.5px] font-medium text-ink">{s.label}</span>
                        <span className="block text-[14px] text-ink-soft">{s.note}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Link
              to="/login"
              className={cn(
                "mt-6 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-medium transition-colors duration-200",
                on.length ? "bg-clay text-on-clay hover:bg-clay-hover" : "pointer-events-none bg-paper-3 text-ink-faint"
              )}
              aria-disabled={on.length === 0}
            >
              {on.length ? `Sign in to connect with ${on.length} ${on.length === 1 ? "permission" : "permissions"}` : "Pick at least one permission"}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
