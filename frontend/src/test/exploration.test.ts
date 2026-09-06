import { describe, expect, it } from "vitest";
import {
  INITIAL,
  normalizeExploration,
  readExploration,
  explorationSearch,
  exportExploration,
  importExploration,
  branchForPart,
} from "../lib/exploration";
describe("connected exploration persistence", () => {
  it("round trips depth, cell selection and all original viewer controls", () => {
    const e = normalizeExploration({
      ...INITIAL,
      depth: 3,
      branch: "anther",
      microSelected: "anther-vegetative-cell",
      progress: 0.7,
      view: {
        ...INITIAL.view,
        mode: "anatomy",
        selected: "anther",
        explode: 0.3,
      },
    });
    expect(readExploration(explorationSearch(e))).toEqual(e);
    expect(importExploration(exportExploration(e))).toEqual(e);
  });
  it("keeps personal notes out of copied URLs while retaining them in files", () => {
    const e = { ...INITIAL, note: "My personal observation" };
    expect(readExploration(explorationSearch(e)).note).toBe("");
    expect(importExploration(exportExploration(e)).note).toBe(e.note);
  });
  it("restores paid-for version one explorations", () => {
    const e = importExploration(
      JSON.stringify({
        product: "FLORARIA",
        schemaVersion: 1,
        view: { mode: "anatomy", selected: "ovule" },
      }),
    );
    expect(e.depth).toBe(1);
    expect(e.view.selected).toBe("ovule");
  });
  it("rejects hostile or malformed persisted values", () => {
    expect(readExploration("?explore=%7B")).toEqual(INITIAL);
    const e = normalizeExploration({
      depth: 44,
      branch: "__proto__",
      progress: Infinity,
      microSelected: "<script>",
      note: "x".repeat(20000),
    });
    expect(e.depth).toBe(0);
    expect(e.branch).toBe("petal");
    expect(e.progress).toBe(0);
    expect(e.microSelected).toBe("");
    expect(e.note.length).toBe(10000);
    expect(() => importExploration("x".repeat(65537))).toThrow();
    expect(() => importExploration('{"product":"other"}')).toThrow();
    expect(branchForPart("ovule")).toBe("ovary");
    expect(branchForPart("stigma")).toBeNull();
  });
});
