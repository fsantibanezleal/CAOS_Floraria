import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INITIAL, type Branch } from "../lib/exploration";
import { navigateDepth, nodeAtDepth } from "../lib/depthNavigation";
import { validateMicroAtlas } from "../lib/micro";

const atlas = validateMicroAtlas(
  JSON.parse(
    readFileSync(
      new URL("../../../data/artifacts/micro-atlas.json", import.meta.url),
      "utf8",
    ),
  ),
);
describe("semantic depth follows actual botanical relationships", () => {
  it.each(["petal", "anther", "ovary", "stem"] as Branch[])(
    "moves %s from an organ into distinct tissue, cell and subcellular data",
    (branch) => {
      let state = navigateDepth(
        { ...INITIAL, note: "Keep my paid-for observation" },
        1,
        atlas,
        branch,
      );
      expect(state.view.selected).toBe(branch);
      expect(state.view.model).toBe("general");
      for (const [depth, kind] of [
        [2, "tissue"],
        [3, "cell"],
        [4, "organelle"],
      ] as const) {
        const previous = state;
        state = navigateDepth(state, depth, atlas);
        expect(state.microSelected).not.toBe(previous.microSelected);
        expect(
          atlas.nodes.find((node) => node.id === state.microSelected),
        ).toMatchObject({ branch, depth: kind });
        expect(state.note).toBe("Keep my paid-for observation");
        expect(state.view.specimen).toBe(INITIAL.view.specimen);
      }
      const organ = navigateDepth(state, 1, atlas);
      expect(organ.view.selected).toBe(branch);
      expect(organ.depth).toBe(1);
    },
  );
  it("climbs the same-depth tonoplast/vacuole chain back to its actual cell", () => {
    const state = {
      ...INITIAL,
      depth: 4 as const,
      microSelected: "petal-tonoplast",
    };
    expect(nodeAtDepth(atlas, state, 3)?.id).toBe("petal-papilla");
    expect(nodeAtDepth(atlas, state, 2)?.id).toBe("petal-epidermis");
  });
  it("keeps a selected egg cell's own nucleus rather than another cell's nucleus", () => {
    const state = {
      ...INITIAL,
      depth: 3 as const,
      branch: "ovary" as const,
      microSelected: "ovary-egg",
    };
    expect(nodeAtDepth(atlas, state, 4)?.id).toBe("ovary-egg-nucleus");
  });
  it("names the canonical destination for a structure with no illustrated deeper child", () => {
    const state = {
      ...INITIAL,
      depth: 2 as const,
      microSelected: "petal-inner-tissue",
    };
    expect(nodeAtDepth(atlas, state, 3)?.id).toBe("petal-papilla");
  });
  it("changing pathways cannot retain a stale selection from another organ", () => {
    const state = {
      ...INITIAL,
      depth: 4 as const,
      microSelected: "petal-tonoplast",
    };
    const changed = navigateDepth(state, 3, atlas, "stem");
    expect(changed.microSelected).toBe("stem-vessel");
    expect(state.microSelected).toBe("petal-tonoplast");
  });
});
