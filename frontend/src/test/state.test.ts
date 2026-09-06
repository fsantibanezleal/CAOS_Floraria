import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  exportState,
  normalizeState,
  parseStateFile,
  stageIndex,
  stateFromUrl,
  stateSearch,
} from "../lib/state";
describe("untrusted exploration states", () => {
  it("round trips complete share and file state", () => {
    const s = normalizeState({
      ...DEFAULT_STATE,
      mode: "anatomy",
      model: "orchid",
      selected: "column",
      explode: 0.67,
      cutEnabled: true,
      cut: 0.3,
      hidden: ["petal"],
    });
    expect(stateFromUrl(stateSearch(s))).toEqual(s);
    expect(parseStateFile(exportState(s))).toEqual(s);
  });
  it("bounds invalid input and rejects duplicate comparisons", () => {
    const s = normalizeState({
      explode: 8,
      cut: -9,
      bloom: NaN,
      stage: Infinity,
      mode: "medical",
      specimen: "vanda",
      compare: "vanda",
      hidden: ["__proto__", "petal", "petal"],
    });
    expect(s.explode).toBe(1);
    expect(s.cut).toBe(-1);
    expect(s.bloom).toBe(1);
    expect(s.stage).toBe(0);
    expect(s.mode).toBe("specimen");
    expect(s.compare).toBe("");
    expect(s.hidden).toEqual(["petal"]);
  });
  it("keeps orchids outside general reproductive animation", () =>
    expect(normalizeState({ mode: "lifecycle", model: "orchid" }).model).toBe(
      "general",
    ));
  it("rejects wrong products and oversized files", () => {
    expect(() => parseStateFile('{"product":"other"}')).toThrow();
    expect(() => parseStateFile(" ".repeat(65537))).toThrow();
  });
  it("recovers malformed links and empty isolation", () => {
    expect(stateFromUrl("?view=%7B")).toEqual(DEFAULT_STATE);
    expect(normalizeState({ isolate: true }).isolate).toBe(false);
  });
  it("includes the exact final endpoint", () => {
    expect(stageIndex(0)).toBe(0);
    expect(stageIndex(0.49)).toBe(2);
    expect(stageIndex(1)).toBe(4);
  });
});
