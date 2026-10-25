import type { ServiceId } from "@/lib/services";

/* Data for the flower drawings in components/bloom/Flowers.tsx: which flower each app is, and the beds the garden grows. */

export type FlowerKind = "peony" | "buttercup" | "sage" | "mint" | "cornflower" | "lavender";

export const SERVICE_FLOWER: Record<ServiceId, FlowerKind> = {
  gmail: "peony",
  calendar: "buttercup",
  drive: "sage",
  sheets: "mint",
  meet: "cornflower",
  forms: "lavender",
};

/* ---------------- the garden ---------------- */

export interface Plant {
  /** the flower on top; "blossom" is GoPilot's own six-petal mark */
  kind: FlowerKind | "blossom";
  /** 0..1 across the bed */
  x: number;
  /** stem height in bed units (the bed is 1000 wide, `height` tall) */
  h: number;
  /** how far the head leans sideways, in bed units */
  lean?: number;
  /** head scale */
  s?: number;
  /** ms before this plant starts growing */
  d?: number;
  /** leaves on the stem, from 0 (ground) to 1 (head), negative for the left side */
  leaves?: number[];
  sway?: number;
}

/** The six service flowers plus the blossom, arranged as a bouquet. Used by the landing hero. */
export const BOUQUET: Plant[] = [
  { kind: "lavender", x: 0.08, h: 250, lean: -26, s: 1.05, d: 260, leaves: [0.22, -0.4] },
  { kind: "peony", x: 0.22, h: 330, lean: -18, s: 1.2, d: 120, leaves: [-0.3, 0.55] },
  { kind: "sage", x: 0.36, h: 210, lean: -6, s: 1, d: 420, leaves: [0.25] },
  { kind: "blossom", x: 0.5, h: 400, lean: 6, s: 1.35, d: 0, leaves: [-0.28, 0.46, -0.64] },
  { kind: "buttercup", x: 0.63, h: 270, lean: 12, s: 1.1, d: 320, leaves: [0.3, -0.52] },
  { kind: "cornflower", x: 0.77, h: 345, lean: 22, s: 1.1, d: 200, leaves: [-0.26, 0.48] },
  { kind: "mint", x: 0.91, h: 230, lean: 30, s: 1.05, d: 480, leaves: [0.32, -0.2] },
];

/** A low strip of small flowers for the edges of quiet screens. */
export const BORDER: Plant[] = [
  { kind: "sage", x: 0.04, h: 70, lean: -6, s: 0.55, d: 500, leaves: [] },
  { kind: "peony", x: 0.12, h: 110, lean: -8, s: 0.6, d: 300, leaves: [0.3] },
  { kind: "lavender", x: 0.2, h: 90, lean: 4, s: 0.55, d: 650, leaves: [] },
  { kind: "buttercup", x: 0.8, h: 95, lean: -4, s: 0.6, d: 420, leaves: [-0.3] },
  { kind: "cornflower", x: 0.88, h: 120, lean: 8, s: 0.6, d: 200, leaves: [0.35] },
  { kind: "mint", x: 0.96, h: 80, lean: 6, s: 0.55, d: 560, leaves: [] },
];
