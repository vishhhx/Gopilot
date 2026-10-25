import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SERVICES, type ServiceId } from "@/lib/services";
import { SERVICE_FLOWER, type FlowerKind, type Plant } from "@/lib/garden";
import { PETAL_PATH } from "./Blossom";

/*
  Six hand-drawn flowers, one per Google service, in the service's own pastel. They share the
  -50..50 head box of the blossom so they can stand in for it anywhere: as a list marker, a node
  icon, or a head on a stem in the garden. Petals carry `petal` (open from their base) or `bud`
  (open from their centre) and a --i index, so the CSS can bloom them one after another.
*/

const v = (name: string) => `var(--${name})`;
const mix = (a: string, b: string, pct: number) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
const idx = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;

/** Round, layered petals: three rings of soft circles. */
function Peony() {
  const outer = Array.from({ length: 8 }, (_, i) => i * 45);
  const mid = Array.from({ length: 6 }, (_, i) => i * 60 + 30);
  const inner = Array.from({ length: 4 }, (_, i) => i * 90 + 15);
  const at = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return { cx: Math.cos(a) * r, cy: Math.sin(a) * r };
  };
  let i = 0;
  return (
    <>
      {outer.map((d) => (
        <circle key={`o${d}`} className="bud" {...at(d, 22)} r={17} fill={v("peony")} style={idx(i++)} />
      ))}
      {mid.map((d) => (
        <circle
          key={`m${d}`}
          className="bud"
          {...at(d, 12)}
          r={13}
          fill={mix(v("peony"), v("peony-deep"), 82)}
          style={idx(i++)}
        />
      ))}
      {inner.map((d) => (
        <circle
          key={`i${d}`}
          className="bud"
          {...at(d, 5)}
          r={8.5}
          fill={mix(v("peony"), v("peony-deep"), 62)}
          style={idx(i++)}
        />
      ))}
    </>
  );
}

/** Five glossy cup petals around a pollen heart. */
function Buttercup() {
  const cup = "M0 -5 C 15 -9 22 -32 0 -42 C -22 -32 -15 -9 0 -5 Z";
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 72})`}>
          <path className="petal" d={cup} fill={v("buttercup")} style={idx(i)} />
          <path d="M0 -12 C 3 -20 3 -28 0 -33" stroke={v("buttercup-deep")} strokeOpacity={0.25} strokeWidth={1.4} fill="none" />
        </g>
      ))}
      <circle className="bud" r={10} fill={v("pollen")} style={idx(5)} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <circle
            key={`s${i}`}
            className="bud"
            cx={Math.cos(a) * 6}
            cy={Math.sin(a) * 6}
            r={1.6}
            fill={v("buttercup-deep")}
            fillOpacity={0.55}
            style={idx(6 + i)}
          />
        );
      })}
    </>
  );
}

/** A sprig of paired sage leaves climbing to a small bud. */
function Sage() {
  const leaf = "M0 0 C 7 -7 19 -8 27 -2 C 19 5 7 6 0 0 Z";
  const pairs = [
    { y: 26, s: 1 },
    { y: 10, s: 0.9 },
    { y: -6, s: 0.78 },
    { y: -21, s: 0.62 },
  ];
  let i = 0;
  return (
    <>
      <path d="M0 40 C 1 18 -1 -10 0 -38" stroke={v("sage-deep")} strokeOpacity={0.5} strokeWidth={2} fill="none" />
      {pairs.map(({ y, s }) => (
        <g key={y}>
          <g transform={`translate(0 ${y}) rotate(-28) scale(${s})`}>
            <path className="bud" d={leaf} fill={v("sage")} style={idx(i++)} />
          </g>
          <g transform={`translate(0 ${y - 3}) rotate(208) scale(${s})`}>
            <path className="bud" d={leaf} fill={mix(v("sage"), v("sage-deep"), 80)} style={idx(i++)} />
          </g>
        </g>
      ))}
      <ellipse className="bud" cy={-38} rx={6} ry={9} fill={mix(v("sage"), v("sage-deep"), 70)} style={idx(i++)} />
    </>
  );
}

/** A round cluster of tiny four-petal florets, like a mint flower head. */
function Mint() {
  const florets = [
    [0, 0],
    [-17, -8],
    [17, -8],
    [-9, -24],
    [9, -24],
    [-17, 10],
    [17, 10],
    [0, 20],
    [0, -36],
  ];
  return (
    <>
      {florets.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className="bud" style={idx(i)}>
            {[0, 90, 180, 270].map((d) => (
              <ellipse
                key={d}
                rx={4.6}
                ry={7}
                cy={-6}
                transform={`rotate(${d + i * 12})`}
                fill={i % 3 === 0 ? mix(v("mint"), v("mint-deep"), 78) : v("mint")}
              />
            ))}
            <circle r={2.6} fill={v("mint-deep")} fillOpacity={0.55} />
          </g>
        </g>
      ))}
    </>
  );
}

/** Ragged, toothed rays, two rings deep. */
function Cornflower() {
  const ray = "M0 -6 L -8 -36 L -4 -32 L 0 -40 L 4 -32 L 8 -36 Z";
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 36})`}>
          <path className="petal" d={ray} fill={v("cornflower")} style={idx(i)} />
        </g>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={`in${i}`} transform={`rotate(${i * 45 + 18}) scale(0.55)`}>
          <path className="petal" d={ray} fill={mix(v("cornflower"), v("cornflower-deep"), 70)} style={idx(10 + i)} />
        </g>
      ))}
      <circle className="bud" r={7} fill={v("cornflower-deep")} fillOpacity={0.8} style={idx(18)} />
    </>
  );
}

/** A spike of small florets, widest at the bottom. */
function Lavender() {
  const rows = [
    { y: 32, r: 1 },
    { y: 20, r: 0.95 },
    { y: 8, r: 0.9 },
    { y: -4, r: 0.82 },
    { y: -15, r: 0.72 },
    { y: -25, r: 0.62 },
    { y: -34, r: 0.5 },
  ];
  let i = 0;
  return (
    <>
      <path d="M0 42 L0 -42" stroke={v("leaf-deep")} strokeWidth={2} strokeOpacity={0.6} />
      {rows.map(({ y, r }, row) => (
        <g key={y}>
          {[-1, 1].map((side) => (
            // the bloom animates `transform`, so the tilt lives on a wrapper
            <g key={side} transform={`rotate(${side * 22} ${side * 7 * r} ${y})`}>
              <ellipse
                className="bud"
                cx={side * 7 * r}
                cy={y + (side > 0 ? 3 : 0)}
                rx={7 * r}
                ry={9 * r}
                fill={row % 2 ? v("lavender") : mix(v("lavender"), v("lavender-deep"), 78)}
                style={idx(i++)}
              />
            </g>
          ))}
        </g>
      ))}
      <ellipse className="bud" cy={-44} rx={4} ry={6} fill={mix(v("lavender"), v("lavender-deep"), 70)} style={idx(i++)} />
    </>
  );
}

const HEADS: Record<FlowerKind, () => ReactNode> = {
  peony: Peony,
  buttercup: Buttercup,
  sage: Sage,
  mint: Mint,
  cornflower: Cornflower,
  lavender: Lavender,
};

/** The head's shapes on their own, for drawing straight into a parent SVG. */
export function FlowerHead({ kind }: { kind: FlowerKind }) {
  const Head = HEADS[kind];
  return <Head />;
}

/** The flower head alone, as an inline SVG. */
export function Flower({
  kind,
  service,
  size = 28,
  bloom = false,
  delay = 0,
  className,
  style,
  label,
}: {
  kind?: FlowerKind;
  service?: ServiceId;
  size?: number | string;
  /** open the petals one after another when it mounts */
  bloom?: boolean;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  const k = kind ?? (service ? SERVICE_FLOWER[service] : "peony");
  const Head = HEADS[k];
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", bloom && "flower-bloom", className)}
      style={{ ["--bloom-delay" as string]: `${delay}ms`, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Head />
    </svg>
  );
}

/* ---------------- the garden ---------------- */

function BlossomHead() {
  const order: ServiceId[] = ["gmail", "calendar", "drive", "sheets", "meet", "forms"];
  return (
    <>
      {order.map((id, i) => (
        <g key={id} transform={`rotate(${i * 60})`}>
          <path className="petal" d={PETAL_PATH} fill={SERVICES[id].petal} style={idx(i)} />
        </g>
      ))}
      <circle className="bud" r={10} fill="var(--clay)" style={idx(6)} />
    </>
  );
}

const LEAF = "M0 0 C 10 -12 30 -14 46 -4 C 30 6 12 8 0 0 Z";

/**
 * A bed of flowers that grow when it mounts: each stem draws up from the ground, its leaves
 * unfurl, the head blooms, and then the plant sways in its own rhythm. Decorative.
 */
export function Garden({
  plants,
  height = 420,
  grow = true,
  className,
  style,
  ground = false,
}: {
  plants: Plant[];
  height?: number;
  grow?: boolean;
  className?: string;
  style?: CSSProperties;
  /** draw a soft mound of earth along the bottom */
  ground?: boolean;
}) {
  const W = 1000;
  const H = height;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      className={cn("garden overflow-visible", grow && "garden-grow", className)}
      style={style}
      aria-hidden
    >
      {plants.map((p, n) => {
        const x = p.x * W;
        const lean = p.lean ?? 0;
        const top = H - p.h;
        const hx = x + lean;
        const stem = `M ${x} ${H + 4} C ${x} ${H - p.h * 0.4}, ${hx - lean * 0.2} ${H - p.h * 0.7}, ${hx} ${top}`;
        const growMs = 900 + p.h * 1.4;
        const vars = {
          "--d": `${p.d ?? n * 140}ms`,
          "--grow": `${growMs}ms`,
          "--sway": `${p.sway ?? 6 + (n % 4)}s`,
        } as CSSProperties;
        const Head = p.kind === "blossom" ? BlossomHead : HEADS[p.kind];
        const s = (p.s ?? 1) * (p.kind === "blossom" ? 0.9 : 0.75);
        return (
          <g key={n} className="plant" style={vars}>
            <path
              className="stem"
              d={stem}
              pathLength={1}
              fill="none"
              stroke="var(--stem)"
              strokeWidth={p.kind === "blossom" ? 5 : 4}
              strokeLinecap="round"
            />
            {(p.leaves ?? [0.35]).map((at, li) => {
              const t = Math.abs(at);
              const side = at < 0 ? -1 : 1;
              // a point on the stem near `t`, close enough for a leaf's base
              const ly = H - p.h * t;
              const lx = x + lean * t * t;
              return (
                <g key={li} transform={`translate(${lx} ${ly}) rotate(${side > 0 ? -30 : 210}) scale(${0.8 + (1 - t) * 0.5})`}>
                  <path
                    className="leaf"
                    d={LEAF}
                    fill={li % 2 ? "var(--leaf-deep)" : "var(--leaf)"}
                    style={{ ["--at" as string]: t } as CSSProperties}
                  />
                </g>
              );
            })}
            <g transform={`translate(${hx} ${top}) scale(${s})`} className="flower-head">
              <Head />
            </g>
          </g>
        );
      })}
      {ground && (
        <path
          d={`M 0 ${H} C ${W * 0.2} ${H - 18}, ${W * 0.45} ${H - 6}, ${W * 0.6} ${H - 14} S ${W * 0.9} ${H - 4}, ${W} ${H - 12} L ${W} ${H + 40} L 0 ${H + 40} Z`}
          fill="var(--paper-3)"
        />
      )}
    </svg>
  );
}
