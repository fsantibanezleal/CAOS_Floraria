import type {
  Catalog,
  Structure,
  TeachingModel,
  ViewMode,
} from "./catalog.types";
import { STRUCTURE_MODELS } from "./catalog";
export const PART_IDS = [
  "sepal",
  "petal",
  "anther",
  "filament",
  "stigma",
  "style",
  "ovary",
  "ovule",
  "pollen",
  "stem",
  "receptacle",
  "lip",
  "column",
  "pollinia",
  "seed",
] as const;
export type PartId = (typeof PART_IDS)[number];
export type CameraPreset = "front" | "top" | "side" | "back";
export interface AtlasState {
  mode: ViewMode;
  model: TeachingModel;
  specimen: string;
  compare: string;
  selected: string;
  hidden: string[];
  explode: number;
  cut: number;
  cutEnabled: boolean;
  cutAxis: "x" | "y" | "z";
  stage: number;
  bloom: number;
  isolate: boolean;
  labels: boolean;
  quality: "preview" | "detail";
  camera: CameraPreset;
}
export const DEFAULT_STATE: AtlasState = {
  mode: "specimen",
  model: "general",
  specimen: "phalaenopsis",
  compare: "",
  selected: "",
  hidden: [],
  explode: 0,
  cut: 0,
  cutEnabled: false,
  cutAxis: "x",
  stage: 0,
  bloom: 1,
  isolate: false,
  labels: true,
  quality: "preview",
  camera: "front",
};
const choices = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof v === "string" && allowed.includes(v as T) ? (v as T) : fallback;
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
/** Normalize untrusted URL/file state into the complete bounded viewer contract. */
export function normalizeState(
  value: unknown,
  specimenIds = [
    "phalaenopsis",
    "encyclia",
    "lycaste",
    "phragmipedium",
    "vanda",
  ],
  structures?: Pick<Structure, "id" | "models">[],
): AtlasState {
  const x =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const s: AtlasState = {
    mode: choices(
      x.mode,
      ["specimen", "anatomy", "lifecycle"],
      DEFAULT_STATE.mode,
    ),
    model: choices(x.model, ["general", "orchid"], "general"),
    specimen: choices(
      x.specimen,
      specimenIds,
      specimenIds[0] ?? DEFAULT_STATE.specimen,
    ),
    compare: choices(x.compare, ["", ...specimenIds], ""),
    selected: choices(x.selected, ["", ...PART_IDS], ""),
    hidden: Array.isArray(x.hidden)
      ? ([
          ...new Set(
            x.hidden.filter(
              (v) => typeof v === "string" && PART_IDS.includes(v as PartId),
            ),
          ),
        ].slice(0, PART_IDS.length) as string[])
      : [],
    explode: bounded(x.explode, 0, 1, 0),
    cut: bounded(x.cut, -1, 1, 0),
    stage: bounded(x.stage, 0, 1, 0),
    bloom: bounded(x.bloom, 0, 1, 1),
    cutEnabled: x.cutEnabled === true,
    cutAxis: choices(x.cutAxis, ["x", "y", "z"], "x"),
    isolate: x.isolate === true,
    labels: x.labels !== false,
    quality: choices(x.quality, ["preview", "detail"], "preview"),
    camera: choices(x.camera, ["front", "top", "side", "back"], "front"),
  };
  if (s.mode === "lifecycle") s.model = "general";
  const modelParts = new Set(
    structures
      ? structures.filter((p) => p.models.includes(s.model)).map((p) => p.id)
      : Object.keys(STRUCTURE_MODELS).filter((id) =>
          STRUCTURE_MODELS[id].includes(s.model),
        ),
  );
  if (!modelParts.has(s.selected)) s.selected = "";
  s.hidden = s.hidden.filter((id) => modelParts.has(id));
  if (s.compare === s.specimen) s.compare = "";
  if (!s.selected) s.isolate = false;
  return s;
}
export function stateFromUrl(search: string): AtlasState {
  try {
    const raw = new URLSearchParams(search).get("view");
    return raw && raw.length < 8192
      ? normalizeState(JSON.parse(raw))
      : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
export function stateSearch(s: AtlasState): string {
  return (
    "?" +
    new URLSearchParams({ view: JSON.stringify(normalizeState(s)) }).toString()
  );
}
export function parseStateFile(text: string, catalog?: Catalog): AtlasState {
  if (text.length > 65536)
    throw new Error("The exploration file exceeds 64 KB.");
  const p = JSON.parse(text);
  if (p?.product !== "FLORARIA" || p?.schemaVersion !== 1 || !p?.view)
    throw new Error("This is not a FLORARIA exploration file.");
  return normalizeState(
    p.view,
    catalog?.specimens.map((s) => s.id),
    catalog?.structures,
  );
}
export const exportState = (s: AtlasState) =>
  JSON.stringify(
    { product: "FLORARIA", schemaVersion: 1, view: normalizeState(s) },
    null,
    2,
  );
export const stageIndex = (s: number) =>
  Math.min(4, Math.floor(Math.max(0, Math.min(1, s)) * 5));
