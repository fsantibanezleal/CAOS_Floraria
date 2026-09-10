/** Continuous view coordinates are illustrative, not metric magnification. */
export type LivingForm = "radial" | "orchid" | "sunflower";
export type LivingPath = "petal" | "stem" | "anther" | "ovary";
export interface LivingState {
  form: LivingForm;
  branch: LivingPath;
  depth: number;
  opening: number;
  activity: number;
  playing: boolean;
}
export const LIVING_DEFAULT: LivingState = {
  form: "sunflower",
  branch: "petal",
  depth: 0,
  opening: 0.86,
  activity: 0.7,
  playing: true,
};
export const clamp = (x: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, x));
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export function normalizeLiving(value: unknown): LivingState {
  const v =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const number = (key: keyof LivingState, max = 1) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? clamp(v[key] as number, 0, max)
      : (LIVING_DEFAULT[key] as number);
  return {
    form: ["radial", "orchid", "sunflower"].includes(String(v.form))
      ? (v.form as LivingForm)
      : LIVING_DEFAULT.form,
    branch: ["petal", "stem", "anther", "ovary"].includes(String(v.branch))
      ? (v.branch as LivingPath)
      : LIVING_DEFAULT.branch,
    depth: number("depth", 4),
    opening: number("opening"),
    activity: number("activity"),
    playing:
      typeof v.playing === "boolean" ? v.playing : LIVING_DEFAULT.playing,
  };
}
export function readLiving(search: string): LivingState {
  const p = new URLSearchParams(search);
  const n = (key: string) =>
    p.has(key) && p.get(key)?.trim() ? Number(p.get(key)) : undefined;
  return normalizeLiving({
    form: p.get("form"),
    branch: p.get("path"),
    depth: n("depth"),
    opening: n("opening"),
    activity: n("activity"),
    playing: p.has("paused") ? false : undefined,
  });
}
export function livingSearch(s: LivingState) {
  const v = normalizeLiving(s);
  return (
    "?" +
    new URLSearchParams({
      living: "1",
      form: v.form,
      path: v.branch,
      depth: v.depth.toFixed(3),
      opening: v.opening.toFixed(3),
      activity: v.activity.toFixed(3),
      ...(v.playing ? {} : { paused: "1" }),
    })
  );
}
/** Exponential convergence has consistent timing across refresh rates. */
export function approach(current: number, target: number, seconds: number) {
  return (
    current +
    (target - current) * (1 - Math.exp(-Math.max(0, Math.min(seconds, 1)) * 9))
  );
}
export function wheelDepth(
  current: number,
  deltaY: number,
  mode: number,
  viewportHeight: number,
) {
  const pixels = deltaY * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return clamp(current + pixels * 0.0017, 0, 4);
}
export const PATHS: {
  id: LivingPath;
  name: [string, string];
  verb: [string, string];
  color: string;
}[] = [
  {
    id: "petal",
    name: ["Colour & surface", "Color y superficie"],
    verb: ["Inside the colour", "Dentro del color"],
    color: "#e992b3",
  },
  {
    id: "stem",
    name: ["Water & support", "Agua y soporte"],
    verb: ["Follow a drop", "Sigue una gota"],
    color: "#87d5ca",
  },
  {
    id: "anther",
    name: ["Pollen & protection", "Polen y protección"],
    verb: ["Travel with pollen", "Viaja con el polen"],
    color: "#ecc46a",
  },
  {
    id: "ovary",
    name: ["Ovules & new life", "Óvulos y nueva vida"],
    verb: ["Inside a future seed", "Dentro de una futura semilla"],
    color: "#b9b0ef",
  },
];
