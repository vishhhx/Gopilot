import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_ORDER, SERVICES, type ServiceId } from "@/lib/services";

/** One petal, pointing up from just above the centre. Drawn in a -50..50 viewBox. */
export const PETAL_PATH = "M0 -7 C 11 -15 13 -36 0 -47 C -13 -36 -11 -15 0 -7 Z";

export type BlossomMotion = "none" | "bloom" | "loading" | "sway";

export interface BlossomProps {
  size?: number | string;
  /** petals to show fully; the rest are drawn small and faded. Omit to open every petal. */
  active?: ServiceId[];
  /** paint every petal one colour (used for the large stage shapes) */
  mono?: string;
  centre?: string;
  motion?: BlossomMotion;
  /** delay before the bloom starts, in ms */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  /** accessible name; without it the blossom is decorative */
  label?: string;
  /** shows the service name in a <title> on each petal (hover) */
  titles?: boolean;
}

/**
 * The GoPilot blossom: the orchestrator at the centre, one petal per Google service.
 * It is the logo, the loader, the agent's avatar and the landing page's hero shape.
 */
export function Blossom({
  size = 32,
  active,
  mono,
  centre = "var(--clay)",
  motion = "none",
  delay = 0,
  className,
  style,
  label,
  titles = false,
}: BlossomProps) {
  const motionClass =
    motion === "bloom"
      ? "blossom-bloom"
      : motion === "loading"
        ? "blossom-loading"
        : motion === "sway"
          ? "blossom-sway"
          : "";

  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", motionClass, className)}
      style={{ ["--bloom-delay" as string]: `${delay}ms`, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g>
        {SERVICE_ORDER.map((id, i) => {
          const isOn = !active || active.includes(id);
          return (
            <g key={id} transform={`rotate(${i * 60})`}>
              <path
                d={PETAL_PATH}
                className="petal"
                fill={mono ?? SERVICES[id].petal}
                style={{
                  ["--i" as string]: i,
                  opacity: isOn ? 1 : 0.32,
                  scale: isOn ? undefined : "0.72",
                  transition: "scale 520ms var(--ease-bloom), opacity 400ms var(--ease-soft)",
                }}
              >
                {titles && <title>{SERVICES[id].name}</title>}
              </path>
            </g>
          );
        })}
        <circle r="10" fill={centre} className="pollen" style={{ transformOrigin: "0 0" }} />
      </g>
    </svg>
  );
}

/** A single petal, for bullets, drift and small accents. */
export function Petal({
  color = "var(--peony)",
  size = 12,
  rotate = 0,
  className,
  style,
}: {
  color?: string;
  size?: number;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="-14 -48 28 42"
      width={size * 0.67}
      height={size}
      className={cn("shrink-0", className)}
      style={{ rotate: `${rotate}deg`, ...style }}
      aria-hidden
    >
      <path d={PETAL_PATH} fill={color} />
    </svg>
  );
}
