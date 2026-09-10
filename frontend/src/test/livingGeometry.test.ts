import * as T from "three";
import { describe, expect, it } from "vitest";
import {
  createLivingGeometry,
  continuousReveal,
  type LivingBranch,
  type LivingFormId,
} from "../render/livingGeometry";

const forms: LivingFormId[] = ["radial", "orchid", "sunflower"];
const branches: LivingBranch[] = ["petal", "stem", "anther", "ovary"];
const contexts = forms.flatMap((form) =>
  branches.map((branch) => ({ form, branch })),
);
const objects = (root: T.Object3D) => {
  const result: T.Object3D[] = [];
  root.traverse((object) => result.push(object));
  return result;
};

describe("persistent living botanical geometry", () => {
  it("frames the retained xylem pit and carries lateral markers through its membrane", () => {
    const model = createLivingGeometry("radial", "stem");
    model.update({ depth: 4, time: 0, activity: 1 });
    const all = objects(model.root);
    const route = all.find(
      (object) => object.userData.dynamicKind === "lateral-pit-route",
    ) as T.InstancedMesh;
    const membrane = all.find(
      (object) =>
        object.userData.nodeId === "stem-pit" &&
        object instanceof T.Mesh &&
        !(object instanceof T.InstancedMesh) &&
        Math.abs(object.position.y - 0.13) < 0.00001 &&
        Math.abs(object.position.z - 0.177) < 0.00001,
    )!;
    expect(membrane).toBeDefined();
    const position = membrane.getWorldPosition(new T.Vector3());
    expect(position.distanceTo(model.anchors[4].position)).toBeLessThan(
      0.000001,
    );
    const matrix = new T.Matrix4();
    route.getMatrixAt(4, matrix);
    const crossing = new T.Vector3().setFromMatrixPosition(matrix);
    route.localToWorld(crossing);
    expect(crossing.distanceTo(position)).toBeLessThan(0.000001);
    route.getMatrixAt(0, matrix);
    const before = new T.Vector3().setFromMatrixPosition(matrix);
    route.getMatrixAt(7, matrix);
    const after = new T.Vector3().setFromMatrixPosition(matrix);
    expect(before.z).toBeLessThan(membrane.position.z);
    expect(after.z).toBeGreaterThan(membrane.position.z);
    model.dispose();
  });
  it.each(contexts)(
    "preserves the $form / $branch hierarchy through fractional travel",
    ({ form, branch }) => {
      const model = createLivingGeometry(form, branch);
      const before = objects(model.root);
      const identities = before.map((object) => object.uuid);
      const geometryIds = before
        .filter((object): object is T.Mesh => object instanceof T.Mesh)
        .map((object) => object.geometry.uuid);
      const surfaces = before.filter(
        (object) => object.userData.openingSurface,
      );
      const closed = surfaces.flatMap((object) =>
        object.children.map((child) => child.matrix.toArray()),
      );
      expect(model.anchors).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(model.anchors[i].position.toArray().every(Number.isFinite)).toBe(
          true,
        );
        expect(model.anchors[i].radius).toBeGreaterThan(0);
        if (i)
          expect(model.anchors[i].radius).toBeLessThan(
            model.anchors[i - 1].radius,
          );
      }
      for (const depth of [
        0, 0.52, 0.9999, 1.0001, 1.8, 2.4, 2.9999, 3.0001, 3.67, 4,
      ]) {
        model.update({ depth, time: 5, opening: 0.86 });
        expect(objects(model.root).map((object) => object.uuid)).toEqual(
          identities,
        );
        expect(
          before
            .filter((object): object is T.Mesh => object instanceof T.Mesh)
            .map((object) => object.geometry.uuid),
        ).toEqual(geometryIds);
        expect(
          before.every((object) =>
            object.matrixWorld.elements.every(Number.isFinite),
          ),
        ).toBe(true);
        expect(
          before
            .filter((object) => object.userData.hierarchyLayer)
            .every((object) => object.visible),
        ).toBe(true);
      }
      expect(
        surfaces.flatMap((object) =>
          object.children.map((child) => child.matrix.toArray()),
        ),
      ).not.toEqual(closed);
      for (const boundary of [1, 2, 3]) {
        model.update({ depth: boundary - 0.0001, time: 5 });
        const positions = before.map((object) => object.matrixWorld.clone());
        model.update({ depth: boundary + 0.0001, time: 5 });
        expect(
          Math.max(
            ...before.flatMap((object, i) =>
              object.matrixWorld.elements.map((value, j) =>
                Math.abs(value - positions[i].elements[j]),
              ),
            ),
          ),
        ).toBeLessThan(0.005);
      }
      model.dispose();
    },
  );

  it("retains distinct floral organization and enters one sunflower disc floret", () => {
    const radial = createLivingGeometry("radial", "ovary");
    const orchid = createLivingGeometry("orchid", "anther");
    const sunflower = createLivingGeometry("sunflower", "ovary");
    const members = (root: T.Object3D, id: string) =>
      objects(root)
        .find((object) => object.name === "flower")!
        .children.filter(
          (object) =>
            object instanceof T.Group && object.userData.nodeId === id,
        );
    expect(members(radial.root, "sepal")).toHaveLength(5);
    expect(members(radial.root, "petal")).toHaveLength(5);
    expect(members(orchid.root, "sepal")).toHaveLength(3);
    expect(members(orchid.root, "petal")).toHaveLength(2);
    expect(members(orchid.root, "lip")).toHaveLength(1);
    expect(
      objects(orchid.root).some(
        (object) => object.userData.nodeId === "column",
      ),
    ).toBe(true);
    expect(
      objects(orchid.root).some(
        (object) => object.userData.nodeId === "pollinia",
      ),
    ).toBe(true);
    const flowers = objects(sunflower.root).find(
      (object) =>
        object instanceof T.InstancedMesh && object.userData.inflorescence,
    ) as T.InstancedMesh;
    expect(flowers.count).toBeGreaterThan(100);
    expect(
      members(sunflower.root, "sunflower-ray-corolla").length,
    ).toBeGreaterThan(10);
    expect(sunflower.anchors[1].nodeId).toBe("sunflower-disc-floret");
    expect(sunflower.anchors[1].radius).toBeLessThan(
      sunflower.anchors[0].radius / 10,
    );
    const first = new T.Matrix4(),
      last = new T.Matrix4();
    flowers.getMatrixAt(0, first);
    flowers.getMatrixAt(flowers.count - 1, last);
    expect(first.elements).not.toEqual(last.elements);
    for (const model of [radial, orchid, sunflower]) {
      for (const object of objects(model.root).filter((object) =>
        ["petal", "lip", "sepal"].includes(object.userData.nodeId),
      ))
        expect(object.userData.branch).toBe("petal");
      model.dispose();
    }
  });

  it.each(branches)(
    "moves $branch processes with the host clock and freezes them when paused",
    (branch) => {
      const model = createLivingGeometry("radial", branch);
      const moving = objects(model.root).filter(
        (object): object is T.InstancedMesh =>
          object instanceof T.InstancedMesh && !!object.userData.dynamicKind,
      );
      expect(moving.length).toBeGreaterThan(0);
      model.update({ depth: 4, time: 1 });
      const first = moving.map((object) =>
        Array.from(object.instanceMatrix.array),
      );
      model.update({ depth: 4, time: 8 });
      const second = moving.map((object) =>
        Array.from(object.instanceMatrix.array),
      );
      expect(second).not.toEqual(first);
      model.update({ depth: 4, time: 8 });
      expect(
        moving.map((object) => Array.from(object.instanceMatrix.array)),
      ).toEqual(second);
      model.dispose();
    },
  );

  it("releases every owned geometry, material and instance buffer exactly once", () => {
    const model = createLivingGeometry("sunflower", "anther");
    const resources = new Set<
      T.BufferGeometry | T.Material | T.InstancedMesh
    >();
    for (const object of objects(model.root)) {
      if (object instanceof T.Mesh || object instanceof T.Line) {
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          resources.add(material);
      }
      if (object instanceof T.InstancedMesh) resources.add(object);
    }
    const disposed = new Map<object, number>();
    for (const resource of resources) {
      const listener = () => {
        disposed.set(resource, (disposed.get(resource) ?? 0) + 1);
      };
      if (resource instanceof T.InstancedMesh)
        resource.addEventListener("dispose", listener);
      else if (resource instanceof T.Material)
        resource.addEventListener("dispose", listener);
      else resource.addEventListener("dispose", listener);
    }
    model.dispose();
    model.dispose();
    model.update({ depth: 3, time: 10 });
    expect(disposed.size).toBe(resources.size);
    expect([...disposed.values()].every((count) => count === 1)).toBe(true);
    expect(model.root.children).toHaveLength(0);
  });

  it("clamps malformed travel values without non-finite geometry", () => {
    expect(continuousReveal(1, 2, -10)).toBe(0);
    expect(continuousReveal(1, 2, 20)).toBe(1);
    const model = createLivingGeometry("radial", "stem");
    model.update({ depth: Number.NaN, time: Number.POSITIVE_INFINITY });
    expect(
      objects(model.root).every((object) =>
        object.matrixWorld.elements.every(Number.isFinite),
      ),
    ).toBe(true);
    model.dispose();
  });

  it("uses a distinct chromoplast compartment for the yellow sunflower ray", () => {
    const model = createLivingGeometry("sunflower", "petal");
    expect(model.anchors.slice(1).map((anchor) => anchor.nodeId)).toEqual([
      "sunflower-ray",
      "sunflower-ray-mesophyll",
      "sunflower-ray-cell",
      "sunflower-chromoplast",
    ]);
    const nodes = objects(model.root);
    expect(
      nodes.some((object) => object.userData.nodeId === "petal-vacuole"),
    ).toBe(false);
    expect(
      nodes.filter(
        (object) => object.userData.nodeId === "sunflower-chromoplast",
      ).length,
    ).toBeGreaterThan(10);
    expect(model.sourceUrls).toContain(
      "https://pubmed.ncbi.nlm.nih.gov/42225694/",
    );
    model.dispose();
  });

  it("subdues opened macro context without fading the focal tissue and restores it on reversal", () => {
    const model = createLivingGeometry("sunflower", "petal");
    const macro = model.root.children.find(
      (object) => object.name === "whole-plant",
    )!;
    const tissue = model.root.children.find(
      (object) => object.userData.hierarchyLayer === "tissue",
    )!;
    const materials = (root: T.Object3D) => [
      ...new Set(
        objects(root).flatMap((object) =>
          object instanceof T.Mesh || object instanceof T.Line
            ? Array.isArray(object.material)
              ? object.material
              : [object.material]
            : [],
        ),
      ),
    ];
    const outer = materials(macro),
      inner = materials(tissue);
    const original = outer.map((material) => [
      material.opacity,
      material.transparent,
      material.depthWrite,
    ]);
    const inside = inner.map((material) => [
      material.opacity,
      material.transparent,
      material.depthWrite,
    ]);
    model.update({ depth: 4, time: 0 });
    expect(macro.position.z).toBeLessThan(-1);
    expect(
      outer.every(
        (material) =>
          material.opacity < 0.1 &&
          material.transparent &&
          !material.depthWrite,
      ),
    ).toBe(true);
    expect(
      inner.map((material) => [
        material.opacity,
        material.transparent,
        material.depthWrite,
      ]),
    ).toEqual(inside);
    model.update({ depth: 0, time: 0 });
    expect(
      outer.map((material) => [
        material.opacity,
        material.transparent,
        material.depthWrite,
      ]),
    ).toEqual(original);
    model.dispose();
  });

  it.each(contexts)(
    "keeps enclosing $form / $branch macro faces behind the inner camera target",
    ({ form, branch }) => {
      const model = createLivingGeometry(form, branch);
      const macro = model.root.children.find(
        (object) => object.name === "whole-plant",
      )!;
      for (const depth of [2.8, 3.4, 4])
        for (const aspect of [0.57, 1.74]) {
          model.update({ depth, time: 0, opening: 0.86 });
          const i = Math.min(3, Math.floor(depth));
          const fraction = continuousReveal(0, 1, depth - i);
          const a = model.anchors[i],
            b = model.anchors[i + 1];
          const target = a.position.clone().lerp(b.position, fraction);
          const radius = Math.exp(
            Math.log(a.radius) * (1 - fraction) + Math.log(b.radius) * fraction,
          );
          const distance =
            (radius /
              Math.sin(T.MathUtils.degToRad(19)) /
              Math.min(1, aspect)) *
            1.05;
          const direction = new T.Vector3(
            Math.sin(0.05) * Math.cos(0.3),
            Math.sin(0.3),
            Math.cos(0.05) * Math.cos(0.3),
          );
          const camera = new T.PerspectiveCamera(38, aspect, 0.00002, 30);
          camera.position.copy(target).addScaledVector(direction, distance);
          camera.lookAt(target);
          camera.updateMatrixWorld();
          const ray = new T.Raycaster();
          for (const x of [-0.25, 0, 0.25])
            for (const y of [-0.25, 0, 0.25]) {
              ray.setFromCamera(new T.Vector2(x, y), camera);
              const foreground = ray
                .intersectObject(macro, true)
                .filter(
                  (hit) =>
                    hit.distance < distance - radius * 0.2 &&
                    hit.object instanceof T.Mesh,
                );
              expect(
                foreground.map((hit) => hit.object.userData.nodeId),
                `${form}/${branch}, depth ${depth}, aspect ${aspect}`,
              ).toEqual([]);
            }
        }
      model.dispose();
    },
  );
});
