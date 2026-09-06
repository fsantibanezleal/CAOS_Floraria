import { DEFAULT_STATE, normalizeState, type AtlasState } from "./state";

export type Depth = 0 | 1 | 2 | 3 | 4;
export type Branch = "petal" | "stem" | "anther" | "ovary";
export interface Exploration {
  view: AtlasState;
  depth: Depth;
  branch: Branch;
  microSelected: string;
  progress: number;
  note: string;
  journey: string;
  step: number;
}
export const INITIAL: Exploration = {
  view: { ...DEFAULT_STATE, quality: "detail" },
  depth: 0,
  branch: "petal",
  microSelected: "",
  progress: 0,
  note: "",
  journey: "",
  step: 0,
};
export function normalizeExploration(raw: unknown): Exploration {
  const r =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const view = normalizeState(r.view ?? r);
  const depth =
    typeof r.depth === "number" &&
    Number.isInteger(r.depth) &&
    r.depth >= 0 &&
    r.depth <= 4
      ? (r.depth as Depth)
      : view.mode === "specimen"
        ? 0
        : 1;
  if (depth === 0) view.mode = "specimen";
  else if (depth === 1 && view.mode === "specimen") view.mode = "anatomy";
  return {
    view,
    depth,
    branch: ["petal", "stem", "anther", "ovary"].includes(String(r.branch))
      ? (r.branch as Branch)
      : "petal",
    microSelected:
      typeof r.microSelected === "string" &&
      /^[a-z][a-z0-9-]{0,79}$/.test(r.microSelected)
        ? r.microSelected
        : "",
    progress:
      typeof r.progress === "number" && Number.isFinite(r.progress)
        ? Math.max(0, Math.min(1, r.progress))
        : 0,
    note: typeof r.note === "string" ? r.note.slice(0, 10000) : "",
    journey:
      typeof r.journey === "string" && /^[a-z0-9-]{1,80}$/.test(r.journey)
        ? r.journey
        : "",
    step:
      typeof r.step === "number" && Number.isInteger(r.step)
        ? Math.max(0, Math.min(4, r.step))
        : 0,
  };
}
export function readExploration(search: string): Exploration {
  const p = new URLSearchParams(search);
  const raw = p.get("explore") ?? p.get("view");
  if (!raw) return structuredClone(INITIAL);
  try {
    return raw.length <= 20000
      ? normalizeExploration(JSON.parse(raw))
      : structuredClone(INITIAL);
  } catch {
    return structuredClone(INITIAL);
  }
}
export function explorationSearch(state: Exploration): string {
  // Personal field notes stay in local saves and explicit exports, never in shared URLs.
  return (
    "?" +
    new URLSearchParams({
      explore: JSON.stringify({ ...normalizeExploration(state), note: "" }),
    })
  );
}
export function exportExploration(state: Exploration): string {
  return JSON.stringify(
    {
      product: "FLORARIA",
      schemaVersion: 2,
      exploration: normalizeExploration(state),
    },
    null,
    2,
  );
}
export function importExploration(text: string): Exploration {
  if (text.length > 65536) throw new Error("Exploration exceeds 64 KB");
  const p = JSON.parse(text);
  if (p?.product !== "FLORARIA") throw new Error("Unknown product");
  if (p.schemaVersion === 1 && p.view)
    return normalizeExploration({ view: p.view });
  if (p.schemaVersion === 2 && p.exploration)
    return normalizeExploration(p.exploration);
  throw new Error("Unsupported exploration");
}
export function branchForPart(part: string): Branch | null {
  if (["petal", "lip", "sepal"].includes(part)) return "petal";
  if (["anther", "pollen", "pollinia", "column"].includes(part))
    return "anther";
  if (["ovary", "ovule", "seed"].includes(part)) return "ovary";
  if (["stem", "receptacle", "filament", "style"].includes(part)) return "stem";
  return null;
}
