import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_ORDER, SERVICES } from "@/lib/services";
import { Petal } from "./Blossom";

/** A few petals falling slowly behind an empty screen. Decorative; hidden for reduced motion. */
export function PetalDrift({
  count = 9,
  className,
  alpha = 0.55,
}: {
  count?: number;
  className?: string;
  alpha?: number;
}) {
  const petals = useMemo(() => {
    // deterministic spread so the layout is stable between renders
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      left: `${4 + ((i * 97) % 92)}%`,
      size: 10 + Math.round(rand() * 12),
      dur: `${16 + rand() * 14}s`,
      delay: `${-rand() * 26}s`,
      dx: `${Math.round(-60 + rand() * 120)}px`,
      rot: `${Math.round(160 + rand() * 260)}deg`,
      color: SERVICES[SERVICE_ORDER[i % SERVICE_ORDER.length]].petal,
    }));
  }, [count]);

  return (
    <div
      aria-hidden
      className={cn("motion-ambient pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {petals.map((p, i) => (
        <span
          key={i}
          className="drift-petal"
          style={
            {
              left: p.left,
              "--dur": p.dur,
              "--delay": p.delay,
              "--dx": p.dx,
              "--rot": p.rot,
              "--alpha": alpha,
            } as CSSProperties
          }
        >
          <Petal color={p.color} size={p.size} />
        </span>
      ))}
    </div>
  );
}
