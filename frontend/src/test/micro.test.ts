import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { validateMicroAtlas } from "../lib/micro";

const original = () =>
  JSON.parse(
    readFileSync(
      new URL("../../../data/sources/micro-atlas.json", import.meta.url),
      "utf8",
    ),
  );
describe("microscopic content boundary", () => {
  it("validates all four paths and their 34 sourced nodes", () => {
    const a = validateMicroAtlas(original());
    expect(a.nodes).toHaveLength(34);
    expect(a.branches).toHaveLength(4);
  });
  it.each(["en", "es"])("requires complete %s text", (lang) => {
    const a = original();
    delete a.nodes[1].detail[lang];
    expect(() => validateMicroAtlas(a)).toThrow();
  });
  it("rejects credentialed or executable citations", () => {
    for (const url of [
      "javascript:alert(1)",
      "https://user:pass@example.org",
    ]) {
      const a = original();
      a.sources[0].url = url;
      expect(() => validateMicroAtlas(a)).toThrow();
    }
  });
  it("rejects authored layers relabelled as observed", () => {
    const a = original();
    a.nodes[1].evidence = "observed";
    expect(() => validateMicroAtlas(a)).toThrow();
  });
  it("rejects reciprocal links crossing branch boundaries", () => {
    const a = original();
    a.nodes[1].parentId = "stem";
    expect(() => validateMicroAtlas(a)).toThrow();
  });
  it("rejects disconnected same-depth cycles", () => {
    const a = original(),
      nodes = new Map(a.nodes.map((n: { id: string }) => [n.id, n])) as Map<
        string,
        { id: string; parentId: string; children: string[] }
      >;
    const x = nodes.get("petal-nucleus")!,
      y = nodes.get("petal-wall")!,
      p = nodes.get("petal-papilla")!;
    p.children = p.children.filter((id) => id !== x.id && id !== y.id);
    x.parentId = y.id;
    x.children = [y.id];
    y.parentId = x.id;
    y.children = [x.id];
    expect(() => validateMicroAtlas(a)).toThrow(/unreachable/);
  });
  it("rejects prototype property names as depths", () => {
    const a = original();
    a.nodes[1].depth = "toString";
    expect(() => validateMicroAtlas(a)).toThrow();
  });
  it("rejects arrays coercible to known biological kind strings", () => {
    const a = original();
    a.nodes[1].kind = ["cell"];
    expect(() => validateMicroAtlas(a)).toThrow(/taxonomy/);
  });
  it("requires sourced claims and bounded text", () => {
    for (const bad of ["source", "length"]) {
      const a = original();
      if (bad === "source") a.nodes[1].sourceIds = ["invented"];
      else a.nodes[1].summary.en = "x".repeat(3001);
      expect(() => validateMicroAtlas(a)).toThrow();
    }
  });
});

describe("bounded verified microscopic loader", () => {
  afterEach(() => vi.unstubAllGlobals());
  const raw = () =>
    readFileSync(
      new URL("../../../data/artifacts/micro-atlas.json", import.meta.url),
    );
  const receipt = () =>
    readFileSync(
      new URL(
        "../../../data/artifacts/micro-atlas.integrity.json",
        import.meta.url,
      ),
    );
  async function loader(respond: (url: string) => Response) {
    vi.resetModules();
    vi.stubGlobal("crypto", webcrypto);
    const fetcher = vi.fn(async (url: string) => respond(url));
    vi.stubGlobal("fetch", fetcher);
    const module = await import("../lib/micro");
    return { ...module, fetcher };
  }
  const bytes = (data: Uint8Array) => new Response(new Uint8Array(data));
  it("verifies checksums and caches a successful catalog", async () => {
    const { loadMicroAtlas, fetcher } = await loader((url) =>
      bytes(url.includes("integrity") ? receipt() : raw()),
    );
    const first = await loadMicroAtlas();
    expect(first.nodes).toHaveLength(34);
    expect(await loadMicroAtlas()).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects a same-size mutated artifact", async () => {
    const changed = raw();
    changed[80] ^= 1;
    const { loadMicroAtlas } = await loader((url) =>
      bytes(url.includes("integrity") ? receipt() : changed),
    );
    await expect(loadMicroAtlas()).rejects.toThrow(/checksum/);
  });
  it("rejects oversized declared bytes before accepting a body", async () => {
    const { loadMicroAtlas } = await loader((url) =>
      url.includes("integrity")
        ? bytes(receipt())
        : new Response("{}", { headers: { "content-length": "1000001" } }),
    );
    await expect(loadMicroAtlas()).rejects.toThrow(/declared size/);
  });
  it("bounds actual stream bytes when content length is omitted", async () => {
    const { loadMicroAtlas } = await loader((url) =>
      url.includes("integrity")
        ? bytes(receipt())
        : bytes(new Uint8Array(1_000_001)),
    );
    await expect(loadMicroAtlas()).rejects.toThrow(/response too large/);
  });
  it("retries after a failed HTTP response without caching the error", async () => {
    let fail = true;
    const { loadMicroAtlas, fetcher } = await loader((url) =>
      fail
        ? new Response("", { status: 503 })
        : bytes(url.includes("integrity") ? receipt() : raw()),
    );
    await expect(loadMicroAtlas()).rejects.toThrow(/HTTP/);
    fail = false;
    expect((await loadMicroAtlas()).nodes).toHaveLength(34);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
