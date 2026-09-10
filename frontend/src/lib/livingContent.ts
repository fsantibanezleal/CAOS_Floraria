import type { Localized, Source } from "./catalog.types";
export interface LivingContentNode {
  id: string;
  parentId: string | null;
  children: string[];
  depth: "organ" | "tissue" | "cell" | "organelle";
  label: Localized;
  summary: Localized;
  detail: Localized;
  sourceIds: string[];
}
export interface LivingContent {
  schemaVersion: 1;
  evidence: "illustrated";
  sources: Source[];
  nodes: LivingContentNode[];
}
const chain = [
  "sunflower-ray",
  "sunflower-ray-mesophyll",
  "sunflower-ray-cell",
  "sunflower-chromoplast",
];
export function validateLivingContent(value: unknown): LivingContent {
  const fail = () => {
    throw new Error("Living content integrity or structure is invalid");
  };
  if (!value || typeof value !== "object") return fail();
  const v = value as LivingContent;
  if (
    v.schemaVersion !== 1 ||
    v.evidence !== "illustrated" ||
    !Array.isArray(v.nodes) ||
    v.nodes.length !== 4 ||
    !Array.isArray(v.sources) ||
    !v.sources.length ||
    v.sources.length > 20
  )
    return fail();
  const text = (s: unknown) =>
    typeof s === "string" && s.trim().length > 0 && s.length <= 3000;
  const sourceIds = new Set<string>();
  for (const s of v.sources) {
    if (
      !s ||
      !text(s.id) ||
      sourceIds.has(s.id) ||
      !text(s.label) ||
      !text(s.citation) ||
      !text(s.url)
    )
      return fail();
    const url = new URL(s.url);
    if (url.protocol !== "https:" || url.username || url.password)
      return fail();
    sourceIds.add(s.id);
  }
  const nodes = new Map(v.nodes.map((n) => [n?.id, n]));
  if (nodes.size !== 4) return fail();
  for (const [index, id] of chain.entries()) {
    const n = nodes.get(id);
    if (
      !n ||
      n.parentId !== (chain[index - 1] ?? null) ||
      n.depth !== ["organ", "tissue", "cell", "organelle"][index] ||
      !Array.isArray(n.children) ||
      JSON.stringify(n.children) !==
        JSON.stringify(chain.slice(index + 1, index + 2))
    )
      return fail();
    for (const field of [n.label, n.summary, n.detail])
      if (
        !field ||
        Object.keys(field).sort().join(",") !== "en,es" ||
        !text(field.en) ||
        !text(field.es)
      )
        return fail();
    if (
      !Array.isArray(n.sourceIds) ||
      !n.sourceIds.length ||
      new Set(n.sourceIds).size !== n.sourceIds.length ||
      n.sourceIds.some((id) => !sourceIds.has(id))
    )
      return fail();
  }
  return v;
}
async function bounded(url: string, signal: AbortSignal, limit: number) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body)
    throw new Error("Living source content did not load");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Living content exceeded size boundary");
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
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function loadLivingContent(): Promise<LivingContent> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const base = import.meta.env.BASE_URL;
    const [bytes, record] = await Promise.all([
      bounded(base + "data/living-content.json", controller.signal, 100000),
      bounded(
        base + "data/living-content.integrity.json",
        controller.signal,
        8192,
      ),
    ]);
    const integrity = JSON.parse(new TextDecoder().decode(record));
    const digest = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (
      integrity.schemaVersion !== 1 ||
      integrity.artifact !== "living-content.json" ||
      integrity.bytes !== bytes.length ||
      integrity.sha256 !== digest
    )
      throw new Error("Living source integrity mismatch");
    return validateLivingContent(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } finally {
    clearTimeout(timer);
  }
}
