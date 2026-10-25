import { Link } from "react-router-dom";
import { Check, Clock3, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flower } from "@/components/bloom/Flowers";
import { type FlowerKind } from "@/lib/garden";
import { Reveal } from "./Reveal";

interface Plan {
  name: string;
  flower: FlowerKind;
  price: number | null;
  blurb: string;
  cta: string;
  href: string;
  features: { label: string; state?: "no" | "soon" }[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    flower: "sage",
    price: 0,
    blurb: "For trying GoPilot on your own apps.",
    cta: "Start free",
    href: "/login",
    features: [
      { label: "Up to 3 workflows" },
      { label: "100 agent runs a month" },
      { label: "Gmail, Calendar and Sheets" },
      { label: "Community support" },
      { label: "Advanced models", state: "no" },
    ],
  },
  {
    name: "Professional",
    flower: "peony",
    price: 299,
    blurb: "For one person or a small team.",
    cta: "Start 14-day trial",
    href: "/login",
    featured: true,
    features: [
      { label: "Unlimited workflows" },
      { label: "3,000 agent runs a month" },
      { label: "All six Google apps" },
      { label: "API access, rate-limited" },
      { label: "Larger models", state: "soon" },
    ],
  },
  {
    name: "Business",
    flower: "cornflower",
    price: 999,
    blurb: "For teams running workflows every day.",
    cta: "Start 14-day trial",
    href: "/login",
    features: [
      { label: "Everything in Professional" },
      { label: "12,000 agent runs a month" },
      { label: "Priority support and run logs" },
      { label: "Custom integrations and webhooks" },
      { label: "Choice of model per workflow" },
    ],
  },
  {
    name: "Enterprise",
    flower: "lavender",
    price: null,
    blurb: "For large organisations with their own terms.",
    cta: "Contact us",
    // TODO: put the sales address in front of the "?" once there is one
    href: "mailto:?subject=GoPilot%20Enterprise",
    features: [
      { label: "Dedicated onboarding" },
      { label: "Custom SLA and SSO" },
      { label: "Private deployment" },
      { label: "Custom pricing for usage" },
      { label: "Priority feature requests" },
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-paper py-28 sm:py-36">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <h2 className="font-serif text-[clamp(38px,4.6vw,64px)] leading-[1.02] font-normal tracking-[-0.03em]">
            Start free. Grow when you need to.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-6 max-w-[48ch] text-[18px] leading-relaxed text-ink">
            Prices are per month in rupees, billed monthly. Paid plans start with a 14-day trial.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.07} className="h-full">
              <div
                className={cn(
                  "group flex h-full flex-col rounded-[28px] p-7 transition-transform duration-500 ease-[var(--ease-bloom)] hover:-translate-y-1",
                  p.featured ? "bg-peony-wash" : "bg-paper-2"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-[24px] tracking-[-0.01em]">{p.name}</h3>
                  <Flower kind={p.flower} size={34} className="transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:rotate-[30deg]" />
                </div>
                <p className="mt-1 text-[15px] text-ink-soft">{p.blurb}</p>
                <p className="mt-7 flex items-baseline gap-1.5">
                  {p.price === null ? (
                    <span className="font-serif text-[40px] leading-none tracking-[-0.02em]">Custom</span>
                  ) : p.price === 0 ? (
                    <span className="font-serif text-[52px] leading-none tracking-[-0.03em]">Free</span>
                  ) : (
                    <>
                      <span className="font-serif text-[52px] leading-none tracking-[-0.03em] tabular-nums">₹{p.price}</span>
                      <span className="text-[15px] text-ink-soft">a month</span>
                    </>
                  )}
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f.label} className={cn("flex items-start gap-2.5 text-[15px]", f.state === "no" ? "text-ink-faint" : "text-ink")}>
                      {f.state === "no" ? (
                        <Minus className="mt-0.5 size-4 shrink-0" />
                      ) : f.state === "soon" ? (
                        <Clock3 className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-sage-deep" strokeWidth={2.4} />
                      )}
                      <span>
                        {f.label}
                        {f.state === "soon" && <span className="text-ink-soft">, coming soon</span>}
                        {f.state === "no" && <span>, not included</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {p.href.startsWith("mailto:") ? (
                  <a
                    href={p.href}
                    className="mt-8 flex h-11 items-center justify-center rounded-full border border-line-strong bg-raised text-[15px] font-medium transition-colors hover:bg-paper-3"
                  >
                    {p.cta}
                  </a>
                ) : (
                  <Link
                    to={p.href}
                    className={cn(
                      "mt-8 flex h-11 items-center justify-center rounded-full text-[15px] font-medium transition-colors",
                      p.featured ? "bg-clay text-on-clay hover:bg-clay-hover" : "border border-line-strong bg-raised hover:bg-paper-3"
                    )}
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
