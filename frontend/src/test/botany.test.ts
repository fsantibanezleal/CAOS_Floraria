import { readFileSync } from "node:fs";
import * as T from "three";
import { describe, expect, it } from "vitest";
import { validateCatalog } from "../lib/catalog";
import { DEFAULT_STATE, normalizeState, parseStateFile } from "../lib/state";
import { createBotanicalModel, disposeObject } from "../render/botany";
import type { AtlasState } from "../lib/state";
import type { BotanicalModel } from "../render/botany";
import type { TeachingModel } from "../lib/catalog.types";

const catalog = validateCatalog(
  JSON.parse(
    readFileSync(
      new URL("../../../data/artifacts/catalog.json", import.meta.url),
      "utf8",
    ),
  ),
);
const specimenIds = catalog.specimens.map((specimen) => specimen.id);
const state = (value: Partial<AtlasState>): AtlasState =>
  normalizeState(
    { ...DEFAULT_STATE, mode: "anatomy", ...value },
    specimenIds,
    catalog.structures,
  );
const visible = (model: BotanicalModel, id: string): boolean =>
  model.parts.some((part) => part.id === id && part.object.visible);

function expectFiniteGeometry(model: BotanicalModel): void {
  model.root.updateMatrixWorld(true);
  let meshes = 0;
  model.root.traverse((object) => {
    expect(
      object.matrixWorld.elements.every(Number.isFinite),
      `${object.name} transform`,
    ).toBe(true);
    if (!(object instanceof T.Mesh || object instanceof T.Line)) return;
    meshes++;
    const geometry = object.geometry as T.BufferGeometry;
    const position = geometry.getAttribute("position");
    expect(position.count).toBeGreaterThan(0);
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      expect(
        Array.from(attribute.array).every(Number.isFinite),
        `${object.parent?.name} ${name}`,
      ).toBe(true);
    }
    if (geometry.index) {
      expect(
        Array.from(geometry.index.array).every(
          (index) =>
            Number.isInteger(index) && index >= 0 && index < position.count,
        ),
      ).toBe(true);
    }
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(
      [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite),
    ).toBe(true);
  });
  expect(meshes).toBeGreaterThan(20);
}

describe("botanical teaching geometry contracts (without WebGL)", () => {
  it.each(["general", "orchid"] as const)(
    "%s geometry exposes exactly its catalog structures and stays finite",
    (modelId) => {
      const model = createBotanicalModel(modelId);
      try {
        expect([...new Set(model.parts.map((part) => part.id))].sort()).toEqual(
          catalog.structures
            .filter((part) => part.models.includes(modelId))
            .map((part) => part.id)
            .sort(),
        );
        for (const settings of [
          { explode: 0, bloom: 1 },
          { explode: 1, bloom: 0 },
          { explode: 1, bloom: 1 },
        ]) {
          model.update(state({ model: modelId, ...settings }));
          expectFiniteGeometry(model);
        }
      } finally {
        disposeObject(model.root);
      }
    },
  );

  it("represents five general sepals and petals, and the orchid six-member perianth", () => {
    const general = createBotanicalModel("general");
    const orchid = createBotanicalModel("orchid");
    const count = (model: BotanicalModel, id: string) =>
      model.parts.filter((part) => part.id === id).length;
    try {
      expect(count(general, "sepal")).toBe(5);
      expect(count(general, "petal")).toBe(5);
      expect(count(general, "filament")).toBe(5);
      expect(count(general, "anther")).toBe(5);
      expect(count(orchid, "sepal")).toBe(3);
      expect(count(orchid, "petal")).toBe(2);
      expect(count(orchid, "lip")).toBe(1);
      for (const absent of [
        "filament",
        "anther",
        "stigma",
        "style",
        "pollen",
        "seed",
      ])
        expect(count(orchid, absent)).toBe(0);
      expect(count(orchid, "column")).toBe(1);
      expect(count(orchid, "pollinia")).toBe(1);
    } finally {
      disposeObject(general.root);
      disposeObject(orchid.root);
    }
  });

  it("places the schematic orchid ovary below the outer floral attachment points", () => {
    const model = createBotanicalModel("orchid");
    try {
      model.update(state({ model: "orchid" }));
      model.root.updateMatrixWorld(true);
      const ovary = model.parts.find((part) => part.id === "ovary")!;
      const boundary = new T.Box3().setFromObject(ovary.object);
      const attachments = model.parts.filter((part) =>
        ["sepal", "petal", "lip"].includes(part.id),
      );
      expect(boundary.max.y).toBeLessThan(
        Math.min(...attachments.map((part) => part.origin.y)),
      );
      expect(boundary.max.y - boundary.min.y).toBeGreaterThan(
        boundary.max.x - boundary.min.x,
      );
    } finally {
      disposeObject(model.root);
    }
  });

  it("shows the pollen tube only in the supported general sequence and changes ovules to seeds at its final stage", () => {
    const model = createBotanicalModel("general");
    const tube = model.parts.find((part) => part.object.userData.sequenceOnly)!;
    try {
      model.update(state({ model: "general" }));
      expect(tube.object.visible).toBe(false);
      expect(visible(model, "seed")).toBe(false);
      for (const stage of [0, 0.25, 0.5, 0.7, 1]) {
        model.update(state({ mode: "lifecycle", model: "general", stage }));
        expect(tube.object.visible).toBe(stage >= 0.4);
        expect(visible(model, "ovule")).toBe(stage < 0.8);
        expect(visible(model, "seed")).toBe(stage >= 0.8);
        const ovary = model.parts.find((part) => part.id === "ovary")!;
        expect(ovary.object.scale.x > 1).toBe(stage > 0.6);
        expectFiniteGeometry(model);
      }
    } finally {
      disposeObject(model.root);
    }
  });

  it("moves illustrated pollen toward the stigma before drawing the pollen tube", () => {
    const model = createBotanicalModel("general");
    const target = new T.Vector3(0, 1.57, 0);
    const grains = model.parts.filter(
      (part) => part.object.userData.sourcePosition,
    );
    try {
      model.update(state({ mode: "lifecycle", stage: 0 }));
      const distances = grains.map((part) =>
        part.object.position
          .clone()
          .add(part.object.userData.sourcePosition as T.Vector3)
          .distanceTo(target),
      );
      model.update(state({ mode: "lifecycle", stage: 0.38 }));
      grains.forEach((part, index) => {
        const distance = part.object.position
          .clone()
          .add(part.object.userData.sourcePosition as T.Vector3)
          .distanceTo(target);
        expect(distance).toBeLessThan(distances[index]);
        expect(distance).toBeLessThan(1e-6);
      });
      expect(
        model.parts.find((part) => part.object.userData.sequenceOnly)!.object
          .visible,
      ).toBe(false);
    } finally {
      disposeObject(model.root);
    }
  });

  it("does not reveal seeds early when a seed selection persists while scrubbing backward", () => {
    const model = createBotanicalModel("general");
    try {
      model.update(state({ mode: "lifecycle", selected: "seed", stage: 1 }));
      expect(visible(model, "seed")).toBe(true);
      model.update(state({ mode: "lifecycle", selected: "seed", stage: 0 }));
      expect(visible(model, "seed")).toBe(false);
      expect(visible(model, "ovule")).toBe(true);
      model.update(state({ mode: "anatomy", selected: "seed" }));
      expect(visible(model, "seed")).toBe(true);
    } finally {
      disposeObject(model.root);
    }
  });

  it("resolves every real investigation selection to visible geometry in its designated model", () => {
    const models: Record<TeachingModel, BotanicalModel> = {
      general: createBotanicalModel("general"),
      orchid: createBotanicalModel("orchid"),
    };
    try {
      for (const journey of catalog.journeys)
        for (const step of journey.steps) {
          if (step.view.mode === "specimen") continue;
          const view = state(step.view);
          const model = models[view.model];
          model.update(view);
          expect(view.selected, `${journey.id}: ${step.title.en}`).toBe(
            step.view.selected ?? "",
          );
          if (view.selected)
            expect(
              visible(model, view.selected),
              `${journey.id}: ${view.selected}`,
            ).toBe(true);
        }
    } finally {
      Object.values(models).forEach((model) => disposeObject(model.root));
    }
  });

  it("honors hiding and isolation while preserving the explicit seed-only anatomy view", () => {
    const model = createBotanicalModel("general");
    try {
      model.update(state({ selected: "anther", isolate: true }));
      expect(
        model.parts
          .filter((part) => part.object.visible)
          .every((part) => part.id === "anther"),
      ).toBe(true);
      model.update(state({ hidden: ["petal"] }));
      expect(visible(model, "petal")).toBe(false);
      expect(visible(model, "sepal")).toBe(true);
      model.update(state({ selected: "seed", isolate: true }));
      expect(visible(model, "seed")).toBe(true);
      expect(visible(model, "ovule")).toBe(false);
    } finally {
      disposeObject(model.root);
    }
  });
});

describe("model-compatible exploration state", () => {
  it.each([
    [
      "orchid",
      "seed",
      ["seed", "anther", "petal", "column"],
      ["petal", "column"],
    ],
    [
      "general",
      "column",
      ["column", "pollinia", "petal", "seed"],
      ["petal", "seed"],
    ],
  ] as const)(
    "clears incompatible %s selections and hidden structures",
    (model, selected, hidden, expectedHidden) => {
      const view = normalizeState(
        { mode: "anatomy", model, selected, hidden, isolate: true },
        specimenIds,
        catalog.structures,
      );
      expect(view.selected).toBe("");
      expect(view.isolate).toBe(false);
      expect(view.hidden).toEqual(expectedHidden);
    },
  );

  it("normalizes compatibility after a lifecycle transition forces the general model", () => {
    const view = normalizeState({
      mode: "lifecycle",
      model: "orchid",
      selected: "lip",
      hidden: ["column", "ovary"],
      isolate: true,
    });
    expect(view.model).toBe("general");
    expect(view.selected).toBe("");
    expect(view.hidden).toEqual(["ovary"]);
    expect(view.isolate).toBe(false);
  });

  it("uses catalog model membership on imported files and preserves compatible selections", () => {
    const file = (model: TeachingModel, selected: string) =>
      JSON.stringify({
        product: "FLORARIA",
        schemaVersion: 1,
        view: { mode: "anatomy", model, selected, isolate: true },
      });
    expect(parseStateFile(file("orchid", "seed"), catalog).selected).toBe("");
    const orchid = parseStateFile(file("orchid", "column"), catalog);
    expect(orchid.selected).toBe("column");
    expect(orchid.isolate).toBe(true);
    const general = parseStateFile(file("general", "stigma"), catalog);
    expect(general.selected).toBe("stigma");
    expect(general.isolate).toBe(true);
  });
});
