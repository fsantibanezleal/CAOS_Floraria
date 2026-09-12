export const REGIONS = [
  "root",
  "stem",
  "branch",
  "leaf",
  "sepal",
  "petal",
  "stamen",
  "pistil",
] as const;
export type Region = (typeof REGIONS)[number];
export type LocalText = { en: string; es: string };
export interface SpatialNode {
  id: string;
  region: Region | null;
  depth: number;
  parentId: string | null;
  childId: string | null;
  route?: "alternate";
  label: LocalText;
  body: LocalText;
  sourceIds: string[];
}
export interface SpatialAtlas {
  schemaVersion: 1;
  representation: "authored-schematic";
  regions: Region[];
  alternateTriggers: Record<Region, string>;
  sources: { id: string; label: string; url: string }[];
  nodes: SpatialNode[];
  parts: {
    region: Region;
    id: string;
    label: LocalText;
    body: LocalText;
    sourceIds: string[];
  }[];
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`Spatial atlas: ${message}`);
}
export function validateSpatialAtlas(value: unknown): SpatialAtlas {
  assert(!!value && typeof value === "object", "object");
  const atlas = value as SpatialAtlas;
  assert(
    atlas.schemaVersion === 1 && atlas.representation === "authored-schematic",
    "schema",
  );
  assert(
    Array.isArray(atlas.regions) && atlas.regions.join() === REGIONS.join(),
    "regions",
  );
  assert(Array.isArray(atlas.sources) && atlas.sources.length >= 5, "sources");
  const sourceIds = new Set<string>();
  for (const source of atlas.sources) {
    assert(
      typeof source.id === "string" && !sourceIds.has(source.id),
      "source identity",
    );
    const url = new URL(source.url);
    assert(
      url.protocol === "https:" && !url.username && !url.password,
      "source URL",
    );
    sourceIds.add(source.id);
  }
  assert(Array.isArray(atlas.nodes) && atlas.nodes.length === 57, "node count");
  const nodes = new Map(atlas.nodes.map((node) => [node.id, node]));
  assert(nodes.size === 57 && nodes.has("plant"), "node identity");
  for (const region of REGIONS)
    for (let depth = 0; depth < 4; depth++) {
      const node = nodes.get(`${region}-${depth}`);
      assert(node?.region === region && node.depth === depth, "region path");
      assert(
        node.parentId === (depth ? `${region}-${depth - 1}` : "plant"),
        "parent",
      );
      assert(
        node.childId === (depth < 3 ? `${region}-${depth + 1}` : null),
        "child",
      );
    }
  for (const region of REGIONS) {
    assert(
      typeof atlas.alternateTriggers?.[region] === "string",
      "alternate trigger",
    );
    for (let depth = 1; depth < 4; depth++) {
      const node = nodes.get(`${region}-alt-${depth}`);
      assert(
        node?.region === region &&
          node.route === "alternate" &&
          node.depth === depth,
        "alternate route",
      );
      assert(
        node.parentId ===
          (depth === 1 ? `${region}-0` : `${region}-alt-${depth - 1}`),
        "alternate parent",
      );
    }
  }
  for (const node of atlas.nodes) {
    for (const local of [node.label, node.body])
      assert(
        typeof local?.en === "string" &&
          !!local.en.trim() &&
          typeof local?.es === "string" &&
          !!local.es.trim(),
        "bilingual text",
      );
    assert(
      Array.isArray(node.sourceIds) &&
        node.sourceIds.length > 0 &&
        node.sourceIds.every((id) => sourceIds.has(id)),
      "references",
    );
  }
  assert(Array.isArray(atlas.parts) && atlas.parts.length >= 24, "part notes");
  const keys = new Set<string>();
  for (const part of atlas.parts) {
    const key = `${part.region}:${part.id}`;
    assert(REGIONS.includes(part.region) && !keys.has(key), "part identity");
    keys.add(key);
    for (const text of [part.label, part.body])
      assert(!!text?.en?.trim() && !!text?.es?.trim(), "part bilingual text");
    assert(
      part.sourceIds.length > 0 &&
        part.sourceIds.every((id) => sourceIds.has(id)),
      "part references",
    );
  }
  return atlas;
}
async function bounded(url: string, signal: AbortSignal, limit: number) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body)
    throw new Error("Spatial atlas unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Spatial atlas exceeds size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function loadSpatialAtlas(): Promise<SpatialAtlas> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const base = import.meta.env.BASE_URL;
    const [bytes, check] = await Promise.all([
      bounded(base + "data/spatial-atlas.json", controller.signal, 200_000),
      bounded(
        base + "data/spatial-atlas.integrity.json",
        controller.signal,
        4096,
      ),
    ]);
    const integrity = JSON.parse(new TextDecoder().decode(check));
    const digest = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    if (
      integrity.artifact !== "spatial-atlas.json" ||
      integrity.bytes !== bytes.length ||
      integrity.sha256 !== digest
    )
      throw new Error("Spatial atlas integrity mismatch");
    return validateSpatialAtlas(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } finally {
    clearTimeout(timer);
  }
}
export const atlasNode = (
  atlas: SpatialAtlas,
  region: Region | null,
  depth: number,
  route: "primary" | "alternate" = "primary",
) => {
  const index = Math.max(0, Math.min(3, Math.floor(depth)));
  return atlas.nodes.find(
    (node) =>
      node.id ===
      (region
        ? `${region}${route === "alternate" && index > 0 ? "-alt" : ""}-${index}`
        : "plant"),
  )!;
};
export function routeFromPart(
  region: Region,
  part: string | null,
): "primary" | "alternate" {
  if (!part) return "primary";
  const alternate: Record<Region, RegExp> = {
    root: /xylem|phloem/,
    stem: /phloem/,
    branch: /xylem/,
    leaf: /guard-cell|lower-epidermis/,
    sepal: /vein/,
    petal: /vein/,
    stamen: /pollen-sac/,
    pistil: /style|stigma|ovary-wall/,
  };
  return alternate[region].test(part) ? "alternate" : "primary";
}
