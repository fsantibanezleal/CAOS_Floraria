import { describe, expect, it } from "vitest";
import { notebookText, parseLivingNotebook } from "../lib/livingNotebook";
import {
  approach,
  normalizeLiving,
  livingSearch,
  readLiving,
  wheelDepth,
  LIVING_DEFAULT,
} from "../lib/living";

describe("continuous scene input and public state", () => {
  it("round-trips explicit private notebook exports and rejects incompatible files", () => {
    const text = notebookText(
      { ...LIVING_DEFAULT, depth: 2.75 },
      "My private observation",
    );
    expect(parseLivingNotebook(text).note).toBe("My private observation");
    expect(parseLivingNotebook(text).state.depth).toBe(2.75);
    expect(() =>
      parseLivingNotebook('{"schemaVersion":1,"state":{},"note":""}'),
    ).toThrow();
    const invalid = JSON.parse(text);
    invalid.state.depth = 99;
    expect(() => parseLivingNotebook(JSON.stringify(invalid))).toThrow(
      "Invalid exploration",
    );
    expect(() => parseLivingNotebook(" ".repeat(64001))).toThrow("64 KB");
  });
  it("keeps meaningful intermediate depths through a shared URL", () => {
    const state = {
      ...LIVING_DEFAULT,
      depth: 2.375,
      form: "orchid" as const,
      branch: "stem" as const,
      playing: false,
    };
    expect(readLiving(livingSearch(state))).toEqual(state);
    expect(readLiving("")).toEqual(LIVING_DEFAULT);
  });
  it("normalizes hostile input without accepting arbitrary scene or numeric values", () => {
    expect(
      normalizeLiving({
        depth: Infinity,
        form: "../../secret",
        branch: [],
        opening: -100,
        activity: 50,
        playing: "true",
      }),
    ).toEqual({ ...LIVING_DEFAULT, opening: 0, activity: 1 });
    expect(readLiving("?depth=NaN&opening=&activity=Infinity")).toEqual(
      LIVING_DEFAULT,
    );
    expect(normalizeLiving({ depth: 99 }).depth).toBe(4);
  });
  it("never serializes private notes or unrelated fields into a link", () => {
    const link = livingSearch({
      ...LIVING_DEFAULT,
      note: "private observation",
      token: "do not share",
    } as typeof LIVING_DEFAULT);
    expect(link).not.toContain("private");
    expect(link).not.toContain("token");
    expect([...new URLSearchParams(link).keys()]).toEqual([
      "living",
      "form",
      "path",
      "depth",
      "opening",
      "activity",
    ]);
  });
  it("normalizes wheel units and reverses a gesture without discrete tier switches", () => {
    const next = wheelDepth(1.23, 80, 0, 800);
    expect(next).toBeCloseTo(1.366);
    expect(wheelDepth(1.23, 5, 1, 800)).toBeCloseTo(next);
    expect(wheelDepth(1.23, 0.1, 2, 800)).toBeCloseTo(next);
    expect(wheelDepth(next, -80, 0, 800)).toBeCloseTo(1.23);
    expect(wheelDepth(3.9, 10000, 0, 800)).toBe(4);
    expect(wheelDepth(0.1, -10000, 0, 800)).toBe(0);
  });
  it("camera smoothing converges independently of display refresh rate", () => {
    const advance = (hz: number) => {
      let d = 0;
      for (let i = 0; i < hz; i++) d = approach(d, 3, hz ** -1);
      return d;
    };
    expect(advance(30)).toBeCloseTo(advance(60), 10);
    expect(advance(60)).toBeCloseTo(advance(120), 10);
    expect(advance(2)).toBeCloseTo(advance(60), 10);
    expect(advance(5)).toBeCloseTo(advance(60), 10);
    expect(approach(1, 3, 0.016)).toBeGreaterThan(1);
    expect(approach(1, 3, 0.016)).toBeLessThan(3);
    expect(approach(3, 1, 0.016)).toBeLessThan(3);
  });
});
