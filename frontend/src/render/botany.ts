/** Authored explanatory geometry. Coordinates are illustrative units, never measured tissue. */
import * as T from "three";
import type { AtlasState } from "../lib/state";
export interface BotanicalPart {
  id: string;
  object: T.Group;
  origin: T.Vector3;
  offset: T.Vector3;
}
export interface BotanicalModel {
  root: T.Group;
  parts: BotanicalPart[];
  update: (s: AtlasState) => void;
}
const GREEN = 0x51826b,
  GOLD = 0xe2b35d;

/** A curved petal surface with an explicit central vein and tapering lateral margin. */
export function petalGeometry(
  length: number,
  width: number,
  curl: number,
  color: number,
): T.BufferGeometry {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [],
    uv: number[] = [],
    base = new T.Color(color),
    tip = new T.Color(0xf7dce4);
  const rows = 32,
    cols = 16;
  for (let i = 0; i <= rows; i++)
    for (let j = 0; j <= cols; j++) {
      const t = i / rows,
        u = (j / cols) * 2 - 1,
        edge = Math.pow(Math.sin(Math.PI * t), 0.72);
      positions.push(
        u * width * edge,
        0.09 + Math.sin(Math.PI * t) * 0.27 + curl * t * t + 0.2 * u * u * edge,
        length * t,
      );
      const c = base.clone().lerp(tip, 0.35 * t + 0.13 * Math.abs(u));
      colors.push(c.r, c.g, c.b);
      uv.push(j / cols, t);
    }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j,
        b = a + cols + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const mat = (color: number, opacity = 1) =>
  new T.MeshPhysicalMaterial({
    color,
    roughness: 0.46,
    metalness: 0,
    clearcoat: 0.22,
    side: T.DoubleSide,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.7,
  });
function sphere(
  parent: T.Object3D,
  r: number,
  position: T.Vector3,
  color: number,
  scale = [1, 1, 1],
  opacity = 1,
) {
  const m = new T.Mesh(new T.SphereGeometry(r, 28, 20), mat(color, opacity));
  m.position.copy(position);
  m.scale.set(...(scale as [number, number, number]));
  parent.add(m);
  return m;
}
function tube(
  parent: T.Object3D,
  points: T.Vector3[],
  r: number,
  color: number,
) {
  const curve = new T.CatmullRomCurve3(points);
  const m = new T.Mesh(new T.TubeGeometry(curve, 28, r, 8, false), mat(color));
  parent.add(m);
  return m;
}

export function createBotanicalModel(
  model: "general" | "orchid",
): BotanicalModel {
  const root = new T.Group(),
    parts: BotanicalPart[] = [];
  const part = (id: string, origin: T.Vector3, offset: T.Vector3) => {
    const object = new T.Group();
    object.name = id;
    object.userData.part = id;
    root.add(object);
    parts.push({ id, object, origin, offset });
    return object;
  };
  const stem = part("stem", new T.Vector3(), new T.Vector3(0, -1.7, 0));
  tube(
    stem,
    [
      new T.Vector3(0, -2.8, 0),
      new T.Vector3(-0.08, -1.7, 0.04),
      new T.Vector3(0, -0.13, 0),
    ],
    0.07,
    GREEN,
  );
  for (const side of [-1, 1]) {
    const leaf = new T.Mesh(
      petalGeometry(1.2, 0.24, 0.34, GREEN),
      new T.MeshStandardMaterial({
        color: 0x75a280,
        vertexColors: true,
        side: T.DoubleSide,
        roughness: 0.65,
      }),
    );
    leaf.rotation.y = side * 1.4;
    leaf.rotation.x = -0.3;
    leaf.position.set(0, -1.6, 0);
    stem.add(leaf);
  }
  const receptacle = part(
    "receptacle",
    new T.Vector3(),
    new T.Vector3(0, -0.7, 0),
  );
  sphere(receptacle, 0.35, new T.Vector3(0, -0.05, 0), GREEN, [1, 0.45, 1]);
  const floral = (
    id: string,
    n: number,
    length: number,
    width: number,
    curl: number,
    color: number,
    phase: number,
    y: number,
  ) => {
    for (let k = 0; k < n; k++) {
      const a = phase + (k * Math.PI * 2) / n,
        p = part(
          id,
          new T.Vector3(0, y, 0),
          new T.Vector3(
            Math.sin(a) * 1.2,
            id === "sepal" ? -0.45 : 0.55,
            Math.cos(a) * 1.2,
          ),
        );
      const m = new T.Mesh(
        petalGeometry(length, width, curl, color),
        new T.MeshPhysicalMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.42,
          clearcoat: 0.4,
          side: T.DoubleSide,
        }),
      );
      m.rotation.y = a;
      p.add(m);
      for (const u of [-0.55, -0.27, 0, 0.27, 0.55]) {
        const pts: T.Vector3[] = [];
        for (let i = 2; i <= 28; i++) {
          const t = i / 32,
            e = Math.pow(Math.sin(Math.PI * t), 0.72),
            x = u * width * e,
            z = length * t;
          const v = new T.Vector3(
            x,
            0.105 +
              Math.sin(Math.PI * t) * 0.27 +
              curl * t * t +
              0.2 * u * u * e,
            z,
          );
          v.applyAxisAngle(new T.Vector3(0, 1, 0), a);
          pts.push(v);
        }
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({
            color: id === "sepal" ? 0xabcdb3 : 0xa65079,
            transparent: true,
            opacity: 0.2,
          }),
        );
        p.add(line);
      }
    }
  };
  if (model === "general") {
    floral("sepal", 5, 1.2, 0.3, 0.1, 0x528261, Math.PI / 5, -0.12);
    floral("petal", 5, 2, 0.8, 0.75, 0xd885a8, 0, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 + 0.4,
        p = new T.Vector3(Math.sin(a) * 0.72, 1.15, Math.cos(a) * 0.72);
      const f = part(
        "filament",
        new T.Vector3(),
        new T.Vector3(Math.sin(a) * 1.1, 0.8, Math.cos(a) * 1.1),
      );
      tube(
        f,
        [
          new T.Vector3(Math.sin(a) * 0.24, 0.15, Math.cos(a) * 0.24),
          new T.Vector3(Math.sin(a) * 0.55, 0.77, Math.cos(a) * 0.55),
          p,
        ],
        0.027,
        0xe8c8b4,
      );
      const anther = part(
        "anther",
        new T.Vector3(),
        new T.Vector3(Math.sin(a) * 1.3, 1.05, Math.cos(a) * 1.3),
      );
      sphere(anther, 0.115, p, GOLD, [1.7, 0.65, 1]);
      const pollen = part(
        "pollen",
        new T.Vector3(),
        new T.Vector3(Math.sin(a) * 1.4, 1.3, Math.cos(a) * 1.4),
      );
      pollen.userData.sourcePosition = p.clone();
      for (let j = 0; j < 9; j++)
        sphere(
          pollen,
          0.024,
          p
            .clone()
            .add(
              new T.Vector3(
                Math.sin(j * 2.4) * 0.14,
                0.05 + Math.cos(j) * 0.02,
                Math.cos(j * 2.4) * 0.065,
              ),
            ),
          0xf0d273,
        );
    }
    const style = part("style", new T.Vector3(), new T.Vector3(0, 0.95, 0));
    tube(
      style,
      [
        new T.Vector3(0, 0.42, 0),
        new T.Vector3(0, 0.9, 0),
        new T.Vector3(0, 1.5, 0),
      ],
      0.055,
      0xc5bf8d,
    );
    const stigma = part("stigma", new T.Vector3(), new T.Vector3(0, 1.5, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      sphere(
        stigma,
        0.12,
        new T.Vector3(Math.sin(a) * 0.1, 1.51, Math.cos(a) * 0.1),
        0xd6aa88,
        [1.05, 0.55, 1],
      );
    }
  } else {
    // An orchid has six perianth members: 3 sepals, 2 ordinary petals and the differentiated lip.
    const orchidPlane = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(1, 0, 0),
      -Math.PI / 2,
    );
    const member = (
      id: string,
      a: number,
      length: number,
      width: number,
      color: number,
    ) => {
      const g = part(
        id,
        new T.Vector3(0, 0.6, 0),
        new T.Vector3(Math.sin(a) * 1.2, Math.cos(a) * 1.2, 0.25),
      );
      const m = new T.Mesh(
        petalGeometry(length, width, 0.24, color),
        new T.MeshPhysicalMaterial({
          vertexColors: true,
          side: T.DoubleSide,
          roughness: 0.43,
          clearcoat: 0.3,
        }),
      );
      m.rotation.y = a;
      m.quaternion.premultiply(orchidPlane);
      g.add(m);
    };
    member("sepal", 0, 1.75, 0.52, 0xce9cab);
    member("sepal", (2 * Math.PI) / 3, 1.55, 0.55, 0xd4a2b4);
    member("sepal", (4 * Math.PI) / 3, 1.55, 0.55, 0xd4a2b4);
    member("petal", 1.12, 1.6, 0.85, 0xe9b8cf);
    member("petal", -1.12, 1.6, 0.85, 0xe9b8cf);
    const lip = part(
      "lip",
      new T.Vector3(0, 0.57, 0.08),
      new T.Vector3(0, -0.9, 1.1),
    );
    const l = new T.Mesh(
      petalGeometry(1.3, 0.58, 0.63, 0xa74372),
      new T.MeshPhysicalMaterial({
        vertexColors: true,
        side: T.DoubleSide,
        roughness: 0.48,
      }),
    );
    l.rotation.x = 0.76;
    lip.add(l);
    for (const side of [-1, 1])
      sphere(
        lip,
        0.17,
        new T.Vector3(side * 0.2, 0.1, 0.35),
        GOLD,
        [1, 0.5, 1.4],
      );
    const column = part("column", new T.Vector3(), new T.Vector3(0, 0.6, 1.15));
    tube(
      column,
      [
        new T.Vector3(0, 0.05, 0),
        new T.Vector3(0, 0.7, 0.2),
        new T.Vector3(0, 1, 0.3),
      ],
      0.14,
      0xf0cabe,
    );
    sphere(column, 0.2, new T.Vector3(0, 1, 0.3), 0xf0dbca, [1, 0.7, 1.2]);
    const pollinia = part(
      "pollinia",
      new T.Vector3(),
      new T.Vector3(0, 1.5, 1.4),
    );
    for (const side of [-1, 1])
      sphere(
        pollinia,
        0.065,
        new T.Vector3(side * 0.075, 1.14, 0.36),
        GOLD,
        [1, 1.5, 1],
      );
  }
  const oy = model === "orchid" ? -0.55 : 0.22;
  const ovary = part(
    "ovary",
    new T.Vector3(0, oy, 0),
    new T.Vector3(0.8, -0.35, 0.6),
  );
  const ovaryMesh = sphere(
    ovary,
    0.35,
    new T.Vector3(),
    0x93b783,
    [1, model === "orchid" ? 1.7 : 1.3, 1],
    0.36,
  );
  ovaryMesh.userData.ovary = true;
  const ovules = part(
    "ovule",
    new T.Vector3(0, oy, 0),
    new T.Vector3(-0.9, -0.4, 0.55),
  );
  for (let j = 0; j < 9; j++) {
    const a = j * 2.399;
    sphere(
      ovules,
      0.062,
      new T.Vector3(
        Math.sin(a) * 0.16,
        (j / 8 - 0.5) * 0.55,
        Math.cos(a) * 0.16,
      ),
      0xd0d8a9,
      [0.85, 1.35, 0.85],
    );
  }
  if (model === "general") {
    const seed = part(
      "seed",
      new T.Vector3(0, oy, 0),
      new T.Vector3(-0.8, -0.5, 0.8),
    );
    for (let j = 0; j < 9; j++) {
      const a = j * 2.399;
      sphere(
        seed,
        0.08,
        new T.Vector3(
          Math.sin(a) * 0.27,
          (j / 8 - 0.5) * 0.66,
          Math.cos(a) * 0.27,
        ),
        0x896546,
        [0.8, 1.3, 0.8],
      );
    }
  }
  if (model === "general") {
    const pollenTube = part("pollen", new T.Vector3(), new T.Vector3(0, 0, 0));
    tube(
      pollenTube,
      [
        new T.Vector3(0.06, 1.5, 0),
        new T.Vector3(0.02, 1, 0),
        new T.Vector3(-0.03, 0.6, 0),
        new T.Vector3(0.1, 0.23, 0),
      ],
      0.022,
      0xf1cc63,
    );
    pollenTube.userData.sequenceOnly = true;
  }
  const update = (s: AtlasState) => {
    for (const p of parts) {
      p.object.position
        .copy(p.origin)
        .addScaledVector(p.offset, s.explode * 1.7);
      p.object.visible =
        !s.hidden.includes(p.id) &&
        (!s.isolate || !s.selected || s.selected === p.id);
      if (p.object.userData.sequenceOnly)
        p.object.visible =
          p.object.visible && s.mode === "lifecycle" && s.stage >= 0.4;
      if (p.id === "seed")
        p.object.visible =
          p.object.visible &&
          ((s.mode === "lifecycle" && s.stage >= 0.8) ||
            (s.mode === "anatomy" && s.selected === "seed"));
      if (p.id === "ovule" && s.mode === "lifecycle" && s.stage >= 0.8)
        p.object.visible = false;
      const bloom = s.mode === "lifecycle" ? 1 : s.bloom;
      if (p.object.userData.sourcePosition && s.mode === "lifecycle")
        p.object.position.addScaledVector(
          new T.Vector3(0, 1.57, 0).sub(p.object.userData.sourcePosition),
          Math.min(1, Math.max(0, (s.stage - 0.2) / 0.18)),
        );
      p.object.scale.setScalar(1);
      if (p.id === "petal" || p.id === "sepal" || p.id === "lip") {
        p.object.scale.set(0.36 + 0.64 * bloom, 1, 0.35 + 0.65 * bloom);
        if (s.mode === "lifecycle" && s.stage > 0.73) {
          const senescence = 1 - (s.stage - 0.73) * 2.4;
          p.object.scale.multiplyScalar(Math.max(0.28, senescence));
        }
      }
      if (p.id === "ovary" && s.mode === "lifecycle")
        p.object.scale.multiplyScalar(1 + Math.max(0, s.stage - 0.6) * 2.8);
      p.object.traverse((o) => {
        if (o instanceof T.Mesh) {
          const m = o.material as T.MeshStandardMaterial;
          if (m.emissive) {
            m.emissive.set(s.selected === p.id ? 0x653423 : 0x000000);
            m.emissiveIntensity = s.selected === p.id ? 0.25 : 0;
          }
        }
      });
    }
  };
  return { root, parts, update };
}

/** Dispose owned GPU resources exactly once; scans and diagrams have no shared application cache. */
export function disposeObject(object: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  object.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value instanceof T.Texture) textures.add(value);
      }
    }
  });
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
}
