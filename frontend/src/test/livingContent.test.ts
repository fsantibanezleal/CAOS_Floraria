import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import { loadLivingContent, validateLivingContent } from "../lib/livingContent";
const read = (name: string) =>
  readFileSync(
    new URL("../../../data/artifacts/" + name, import.meta.url),
    "utf8",
  );
const content = JSON.parse(read("living-content.json"));
afterEach(() => vi.unstubAllGlobals());
describe("source-informed living content", () => {
  it("retains the connected sunflower chromoplast route and bilingual evidence", () => {
    const result = validateLivingContent(content);
    expect(result.nodes.map((n) => n.depth)).toEqual([
      "organ",
      "tissue",
      "cell",
      "organelle",
    ]);
    expect(result.nodes.at(-1)?.label.es).toBe("Cromoplasto");
  });
  it("rejects incomplete source chains and unsupported source URLs", () => {
    for (const mutate of [
      (v: typeof content) => {
        v.nodes[2].parentId = "sunflower-ray";
      },
      (v: typeof content) => {
        delete v.nodes[1].summary.es;
      },
      (v: typeof content) => {
        v.nodes[3].sourceIds = ["unverified"];
      },
      (v: typeof content) => {
        v.sources[0].url = "https://operator:secret@example.org/";
      },
    ]) {
      const bad = structuredClone(content);
      mutate(bad);
      expect(() => validateLivingContent(bad)).toThrow();
    }
  });
  it("verifies published bytes and rejects even a parseable modified artifact", async () => {
    let corrupt = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(
            read(
              url.endsWith("integrity.json")
                ? "living-content.integrity.json"
                : "living-content.json",
            ) + (corrupt && !url.endsWith("integrity.json") ? " " : ""),
          ),
      ),
    );
    expect((await loadLivingContent()).nodes).toHaveLength(4);
    corrupt = true;
    await expect(loadLivingContent()).rejects.toThrow("integrity mismatch");
  });
});
