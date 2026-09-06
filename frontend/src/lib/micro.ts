import type { Localized, Source } from "./catalog.types";

export const MICRO_BRANCHES = ["petal", "stem", "anther", "ovary"] as const;
export const MICRO_DEPTHS = ["tissue", "cell", "organelle"] as const;
export type MicroBranch = (typeof MICRO_BRANCHES)[number];
export type MicroDepth = (typeof MICRO_DEPTHS)[number];
export const MICRO_BRANCH_META = [
  {
    id: "petal",
    label: { en: "Petal surface", es: "Superficie del pétalo" },
    structureIds: ["petal"],
  },
  {
    id: "stem",
    label: { en: "Water pathway", es: "Ruta del agua" },
    structureIds: ["stem"],
  },
  {
    id: "anther",
    label: { en: "Pollen architecture", es: "Arquitectura del polen" },
    structureIds: ["anther", "pollen"],
  },
  {
    id: "ovary",
    label: { en: "Inside an ovule", es: "Dentro de un óvulo" },
    structureIds: ["ovary", "ovule", "seed"],
  },
] as const;
export interface MicroNode {
  id: string;
  branch: MicroBranch;
  parentId: string | null;
  children: string[];
  depth: "organ" | MicroDepth;
  kind:
    | "organ"
    | "tissue"
    | "structure"
    | "cell"
    | "cell-group"
    | "gametophyte"
    | "organelle"
    | "organelle-group"
    | "membrane"
    | "wall"
    | "space";
  label: Localized;
  summary: Localized;
  detail: Localized;
  scaleLabel: Localized;
  evidence: "illustrated";
  sourceIds: string[];
}
export interface MicroBranchRecord {
  id: MicroBranch;
  label: Localized;
  rootId: string;
  structureIds: string[];
  question: Localized;
  process: Localized;
  assumptions: Localized[];
  stages: { title: Localized; body: Localized }[];
}
export interface MicroAtlas {
  schemaVersion: 1;
  evidence: "illustrated";
  sources: Source[];
  branches: MicroBranchRecord[];
  nodes: MicroNode[];
}
const MAX_BYTES = 1_000_000;
type Obj = Record<string, unknown>;
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`Invalid micro atlas: ${message}`);
}
function object(v: unknown): Obj {
  check(v !== null && typeof v === "object" && !Array.isArray(v), "object");
  return v as Obj;
}
function text(v: unknown): string {
  check(
    typeof v === "string" && v.trim().length > 0 && v.length <= 3000,
    "bounded text",
  );
  return v;
}
function localized(v: unknown) {
  const o = object(v);
  check(Object.keys(o).sort().join(",") === "en,es", "English and Spanish");
  text(o.en);
  text(o.es);
}
function list(v: unknown, min: number, max: number): unknown[] {
  check(Array.isArray(v) && v.length >= min && v.length <= max, "array count");
  return v;
}
function records(v: unknown, min: number, max: number) {
  const result = new Map<string, Obj>();
  for (const item of list(v, min, max)) {
    const o = object(item),
      id = text(o.id);
    check(/^[a-z][a-z0-9-]{0,63}$/.test(id) && !result.has(id), "identifier");
    result.set(id, o);
  }
  return result;
}
export function validateMicroAtlas(input: unknown): MicroAtlas {
  const a = object(input);
  check(
    a.schemaVersion === 1 && a.evidence === "illustrated",
    "schema/evidence",
  );
  const sources = records(a.sources, 1, 40),
    branches = records(a.branches, 4, 4),
    nodes = records(a.nodes, 24, 64);
  for (const s of sources.values()) {
    text(s.label);
    text(s.citation);
    const u = new URL(text(s.url));
    check(
      ["http:", "https:"].includes(u.protocol) &&
        !!u.hostname &&
        !u.username &&
        !u.password,
      "source URL",
    );
  }
  for (const id of MICRO_BRANCHES) {
    const b = branches.get(id);
    check(b && b.rootId === id, "branch");
    for (const key of ["label", "question", "process"]) localized(b[key]);
    const ids = list(b.structureIds, 1, 4);
    check(
      new Set(ids).size === ids.length &&
        ids.every((x) =>
          MICRO_BRANCH_META.find((m) => m.id === id)!.structureIds.some(
            (s) => s === x,
          ),
        ),
      "structure mapping",
    );
    list(b.assumptions, 2, 2).forEach(localized);
    for (const s of list(b.stages, 4, 4)) {
      const stage = object(s);
      localized(stage.title);
      localized(stage.body);
    }
  }
  const depth: Record<string, number> = {
    organ: 0,
    tissue: 1,
    cell: 2,
    organelle: 3,
  };
  const kinds = [
    "organ",
    "tissue",
    "structure",
    "cell",
    "cell-group",
    "gametophyte",
    "organelle",
    "organelle-group",
    "membrane",
    "wall",
    "space",
  ];
  for (const [id, n] of nodes) {
    check(
      MICRO_BRANCHES.some((x) => x === n.branch) &&
        typeof n.depth === "string" &&
        Object.hasOwn(depth, n.depth) &&
        typeof n.kind === "string" &&
        kinds.includes(n.kind) &&
        n.evidence === "illustrated",
      "taxonomy",
    );
    for (const key of ["label", "summary", "detail", "scaleLabel"])
      localized(n[key]);
    const refs = list(n.sourceIds, 1, 8);
    check(
      new Set(refs).size === refs.length &&
        refs.every((s) => typeof s === "string" && sources.has(s)),
      "source reference",
    );
    const children = list(n.children, 0, 16);
    check(
      new Set(children).size === children.length &&
        children.every((c) => typeof c === "string" && nodes.has(c)),
      "children",
    );
    if (id === n.branch)
      check(n.parentId === null && n.depth === "organ", "root");
    else {
      const parent =
        typeof n.parentId === "string" ? nodes.get(n.parentId) : undefined;
      check(
        parent &&
          parent.branch === n.branch &&
          Array.isArray(parent.children) &&
          parent.children.includes(id),
        "parent",
      );
      check(
        depth[String(n.depth)] >= depth[String(parent.depth)],
        "depth order",
      );
    }
    for (const c of children) {
      const child = nodes.get(String(c))!;
      check(
        child.parentId === id && child.branch === n.branch,
        "child reciprocity",
      );
    }
  }
  const seen = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    check(!active.has(id) && !seen.has(id), "cycle or multiple ancestry");
    const n = nodes.get(id);
    check(n, "missing root");
    seen.add(id);
    active.add(id);
    for (const c of n.children as string[]) visit(c);
    active.delete(id);
  }
  for (const b of MICRO_BRANCHES) {
    visit(b);
    for (const d of Object.keys(depth))
      check(
        [...nodes.values()].some((n) => n.branch === b && n.depth === d),
        "missing depth",
      );
  }
  check(seen.size === nodes.size, "unreachable node");
  return input as MicroAtlas;
}
async function bounded(response: Response, limit: number): Promise<Uint8Array> {
  check(response.ok, "HTTP request");
  const declared = response.headers.get("content-length");
  check(
    declared === null || (/^\d+$/.test(declared) && Number(declared) <= limit),
    "declared size",
  );
  check(response.body, "missing response body");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.byteLength;
      check(count <= limit, "response too large");
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel();
    throw e;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
let cached: Promise<MicroAtlas> | undefined;
export function loadMicroAtlas(): Promise<MicroAtlas> {
  if (cached) return cached;
  cached = (async () => {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 12000);
    try {
      const base = import.meta.env.BASE_URL;
      const [raw, meta] = await Promise.all([
        fetch(`${base}data/micro-atlas.json`, {
          signal: controller.signal,
        }).then((r) => bounded(r, MAX_BYTES)),
        fetch(`${base}data/micro-atlas.integrity.json`, {
          signal: controller.signal,
        }).then((r) => bounded(r, 8192)),
      ]);
      const decoder = new TextDecoder("utf-8", { fatal: true }),
        integrity = object(JSON.parse(decoder.decode(meta)));
      check(
        integrity.schemaVersion === 1 &&
          integrity.artifact === "micro-atlas.json" &&
          integrity.bytes === raw.length &&
          typeof integrity.sha256 === "string" &&
          /^[a-f0-9]{64}$/.test(integrity.sha256),
        "integrity shape",
      );
      const sha = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", raw as Uint8Array<ArrayBuffer>),
        ),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      check(sha === integrity.sha256, "artifact checksum");
      const atlas = validateMicroAtlas(JSON.parse(decoder.decode(raw))),
        counts = object(integrity.counts);
      check(
        counts.nodes === atlas.nodes.length &&
          counts.branches === atlas.branches.length &&
          counts.sources === atlas.sources.length,
        "integrity counts",
      );
      return atlas;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  })();
  cached.catch(() => {
    cached = undefined;
  });
  return cached;
}
