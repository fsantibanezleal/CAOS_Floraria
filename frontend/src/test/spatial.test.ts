import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  atlasNode,
  routeFromPart,
  validateSpatialAtlas,
} from "../lib/spatialAtlas";

const data = JSON.parse(
  readFileSync(
    new URL("../../../data/artifacts/spatial-atlas.json", import.meta.url),
    "utf8",
  ),
);
describe("spatial atlas", () => {
  it("resolves region-specific primary and alternate anatomy", () => {
    const atlas = validateSpatialAtlas(data);
    expect(atlasNode(atlas, null, 0).id).toBe("plant");
    expect(atlasNode(atlas, "root", 2.4).id).toBe("root-2");
    expect(atlasNode(atlas, "root", 2.4, "alternate").id).toBe("root-alt-2");
    expect(atlasNode(atlas, "leaf", 3.4, "alternate").label.en).toBe(
      "Stomatal aperture",
    );
    expect(routeFromPart("leaf", "guard-cell")).toBe("alternate");
    expect(routeFromPart("leaf", "palisade-mesophyll")).toBe("primary");
    expect(routeFromPart("stem", "phloem")).toBe("alternate");
  });
  it("rejects an incomplete route and invalid reference", () => {
    const route = structuredClone(data);
    route.nodes = route.nodes.filter(
      (node: { id: string }) => node.id !== "leaf-alt-2",
    );
    expect(() => validateSpatialAtlas(route)).toThrow();
    const source = structuredClone(data);
    source.nodes.find(
      (node: { id: string }) => node.id === "root-2",
    ).sourceIds = ["missing"];
    expect(() => validateSpatialAtlas(source)).toThrow();
  });
});
