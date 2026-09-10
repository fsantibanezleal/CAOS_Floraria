/**
 * Persistent botanical teaching geometry. Distances, particle counts and animation
 * clocks are illustrative; this is neither a scan reconstruction nor physiology.
 * Floral organization: Oregon State EM 9900; Kew Orchidaceae and Helianthus below.
 * Internal organization follows the IDs/references in data/sources/micro-atlas.json.
 */
import * as T from "three";

export type LivingFormId = "radial" | "orchid" | "sunflower";
export type LivingBranch = "petal" | "stem" | "anther" | "ovary";
type Localized = { en: string; es: string };
export interface LivingFormDescriptor {
  id: LivingFormId;
  name: Localized;
  summary: Localized;
  sourceUrls: string[];
}
export const LIVING_FORMS: readonly LivingFormDescriptor[] = [
  {
    id: "radial",
    name: { en: "A radial flower", es: "Una flor radial" },
    summary: {
      en: "Separate floral whorls surround the reproductive structures of an illustrative flower.",
      es: "Verticilos florales separados rodean las estructuras reproductivas de una flor ilustrativa.",
    },
    sourceUrls: [
      "https://extension.oregonstate.edu/catalog/em-9900-reproductive-plant-parts",
    ],
  },
  {
    id: "orchid",
    name: { en: "An orchid", es: "Una orquídea" },
    summary: {
      en: "Bilateral organization, three sepals, two petals, a differentiated lip, a column and an inferior ovary.",
      es: "Organización bilateral, tres sépalos, dos pétalos, un labelo diferenciado, una columna y un ovario ínfero.",
    },
    sourceUrls: [
      "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000046-2/general-information",
    ],
  },
  {
    id: "sunflower",
    name: { en: "A sunflower head", es: "Un capítulo de girasol" },
    summary: {
      en: "An inflorescence: outer ray florets surround many separate tubular disc florets. Reproductive exploration enters one disc floret.",
      es: "Una inflorescencia: flores liguladas externas rodean muchas flores tubulares del disco. La exploración reproductiva entra en una flor del disco.",
    },
    sourceUrls: [
      "https://www.kew.org/plants/sunflower",
      "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000729-2/general-information",
    ],
  },
];

export interface LivingAnchor {
  depth: number;
  position: T.Vector3;
  radius: number;
  nodeId: string;
}
export interface LivingGeometryState {
  /** A continuous travel coordinate; fractional values are meaningful. */
  depth: number;
  /** Host-controlled illustrative clock in seconds. Freeze to pause. */
  time: number;
  activity?: number;
  opening?: number;
  selectedNode?: string;
}
export interface LivingGeometry {
  root: T.Group;
  anchors: LivingAnchor[];
  formId: LivingFormId;
  branch: LivingBranch;
  teachingNote: Localized;
  sourceUrls: string[];
  update: (state: LivingGeometryState) => void;
  /** Positions are local to root, including any opening already applied. */
  focusForNode: (nodeId: string) => LivingAnchor | undefined;
  dispose: () => void;
}

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
export function continuousReveal(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const C = {
  stem: 0x386548,
  leaf: 0x3f7d45,
  ivory: 0xfff0d8,
  rose: 0xb94d87,
  wine: 0x9e326d,
  gold: 0xdfa319,
  pollen: 0xf1cb63,
  water: 0x6cdef0,
  membrane: 0x96c4a6,
  nucleus: 0xb998de,
  wall: 0xa5bba0,
};

/** Curved 3D lamina, optionally one half of a surface that can physically peel. */
function lamina(
  length: number,
  width: number,
  curl: number,
  color: number,
  half = 0,
) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const base = new T.Color(color),
    tip = new T.Color(C.ivory);
  const rows = 28,
    columns = half ? 8 : 16;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let col = 0; col <= columns; col++) {
      const u =
        half < 0
          ? col / columns - 1
          : half > 0
            ? col / columns
            : (2 * col) / columns - 1;
      const edge = Math.pow(Math.sin(Math.PI * t), 0.68);
      positions.push(
        u * width * edge,
        length * t,
        curl * t * t + 0.11 * Math.sin(Math.PI * t) + 0.14 * u * u * edge,
      );
      const shade = base
        .clone()
        .lerp(tip, 0.08 + 0.26 * t + 0.06 * Math.abs(u));
      colors.push(shade.r, shade.g, shade.b);
    }
  }
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col,
        b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A raised conical epidermal-cell example; no measured cell-size distribution. */
function papillaGeometry(half = 0, normalized = false) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const rings = 14,
    segments = 24;
  const basal = new T.Color(0x7c345b),
    apical = new T.Color(0xce83b0);
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    for (let s = 0; s <= segments; s++) {
      const angle = half
        ? (half < 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.PI * s) / segments
        : (2 * Math.PI * s) / segments;
      const radius =
        0.195 *
        Math.pow(1 - t, 0.67) *
        (1 + 0.035 * Math.cos(angle * 6) * (1 - t));
      positions.push(
        (Math.cos(angle) * radius) / (normalized ? 0.195 : 1),
        (Math.sin(angle) * radius) / (normalized ? 0.195 : 1),
        normalized ? -1 + 2 * t : -0.1 + 0.4 * t,
      );
      const shade = basal
        .clone()
        .lerp(apical, 0.2 + 0.55 * t + 0.045 * Math.sin(angle * 12) * t);
      colors.push(shade.r, shade.g, shade.b);
    }
  }
  for (let ring = 0; ring < rings; ring++)
    for (let s = 0; s < segments; s++) {
      const a = ring * (segments + 1) + s,
        b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Tubular corolla with a five-lobed rim, reused by distinct sunflower disc florets. */
function discFloretGeometry() {
  const geometry = new T.CylinderGeometry(0.039, 0.021, 0.08, 30, 3, true);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i),
      angle = Math.atan2(positions.getZ(i), positions.getX(i));
    if (y > 0.01) {
      const upper = (y - 0.01) / 0.03,
        lobe = Math.cos(angle * 5);
      positions.setXYZ(
        i,
        positions.getX(i) * (1 + upper * 0.14 * lobe),
        y + upper * 0.009 * lobe,
        positions.getZ(i) * (1 + upper * 0.14 * lobe),
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createLivingGeometry(
  formId: LivingFormId,
  branch: LivingBranch,
): LivingGeometry {
  const form = LIVING_FORMS.find((entry) => entry.id === formId);
  if (!form || !["petal", "stem", "anther", "ovary"].includes(branch))
    throw new Error("Unknown botanical teaching context");
  const root = new T.Group();
  root.name = `living-${formId}-${branch}`;
  root.userData = {
    formId,
    branch,
    evidence: "illustrated",
    persistentHierarchy: true,
  };
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  const instances = new Set<T.InstancedMesh>();
  const nodeMaterials = new Map<string, Set<T.MeshPhysicalMaterial>>();
  const animated: Array<
    (depth: number, time: number, activity: number, opening: number) => void
  > = [];
  const selectable = new Map<
    string,
    { object: T.Object3D; radius: number; depth: number }
  >();
  const own = <G extends T.BufferGeometry>(geometry: G): G => {
    geometries.add(geometry);
    return geometry;
  };
  const material = (color: number, opacity = 1, vertexColors = false) => {
    const result = new T.MeshPhysicalMaterial({
      color,
      roughness: 0.53,
      metalness: 0,
      clearcoat: 0.16,
      side: T.DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.98,
      vertexColors,
    });
    materials.add(result);
    return result;
  };
  const tag = <O extends T.Object3D>(
    object: O,
    nodeId: string,
    radius = 0.1,
    depth = 1,
  ): O => {
    object.userData = {
      ...object.userData,
      nodeId,
      part: nodeId,
      branch: nodeId.startsWith("stem")
        ? "stem"
        : nodeId.startsWith("anther") ||
            ["column", "pollinia", "sunflower-disc-floret"].includes(nodeId)
          ? "anther"
          : nodeId.startsWith("ovary")
            ? "ovary"
            : ["petal", "sepal", "lip", "sunflower-ray-corolla"].some(
                  (prefix) => nodeId.startsWith(prefix),
                )
              ? "petal"
              : branch,
      formId,
      evidence: "illustrated",
    };
    if (!selectable.has(nodeId) || depth > (selectable.get(nodeId)?.depth ?? 0))
      selectable.set(nodeId, { object, radius, depth });
    if (object instanceof T.InstancedMesh) instances.add(object);
    if (object instanceof T.Mesh) {
      const entries = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const entry of entries)
        if (entry instanceof T.MeshPhysicalMaterial) {
          const set =
            nodeMaterials.get(nodeId) ?? new Set<T.MeshPhysicalMaterial>();
          set.add(entry);
          nodeMaterials.set(nodeId, set);
        }
    }
    return object;
  };
  const mesh = (
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    mat: T.Material,
    nodeId: string,
  ) => {
    const object = tag(new T.Mesh(own(geometry), mat), nodeId);
    parent.add(object);
    return object;
  };
  const group = (
    parent: T.Object3D,
    nodeId: string,
    position = V(),
    radius = 0.1,
    depth = 1,
  ) => {
    const object = tag(new T.Group(), nodeId, radius, depth);
    object.name = nodeId;
    object.position.copy(position);
    parent.add(object);
    return object;
  };
  const ball = (
    parent: T.Object3D,
    nodeId: string,
    position: T.Vector3,
    scale: T.Vector3,
    color: number,
    opacity = 1,
  ) => {
    const object = mesh(
      parent,
      new T.SphereGeometry(1, 18, 12),
      material(color, opacity),
      nodeId,
    );
    object.position.copy(position);
    object.scale.copy(scale);
    return object;
  };
  const curve = (
    parent: T.Object3D,
    nodeId: string,
    points: T.Vector3[],
    radius: number,
    color: number,
  ) => {
    const path = new T.CatmullRomCurve3(points);
    const object = mesh(
      parent,
      new T.TubeGeometry(path, 28, radius, 6, false),
      material(color),
      nodeId,
    );
    return { path, object };
  };
  const particles = (
    parent: T.Object3D,
    nodeId: string,
    count: number,
    radius: number,
    color: number,
    locate: (index: number, time: number, target: T.Vector3) => void,
    kind: string,
  ) => {
    const object = tag(
      new T.InstancedMesh(
        own(new T.SphereGeometry(radius, 7, 5)),
        material(color),
        count,
      ),
      nodeId,
    );
    object.instanceMatrix.setUsage(T.DynamicDrawUsage);
    object.frustumCulled = false;
    object.userData.dynamicKind = kind;
    parent.add(object);
    const position = V(),
      scale = V(1, 1, 1),
      quaternion = new T.Quaternion(),
      matrix = new T.Matrix4();
    animated.push((_depth, time, activity) => {
      for (let index = 0; index < count; index++) {
        locate(index, time * (0.15 + 0.85 * activity), position);
        matrix.compose(position, quaternion, scale);
        object.setMatrixAt(index, matrix);
      }
      object.instanceMatrix.needsUpdate = true;
    });
    return object;
  };
  const shell = (
    parent: T.Object3D,
    nodeId: string,
    center: T.Vector3,
    size: T.Vector3,
    color: number,
    start: number,
    end: number,
    opacity = 0.86,
    depth = 2,
    shape: "sphere" | "papilla" = "sphere",
  ) => {
    const container = group(
      parent,
      nodeId,
      center,
      Math.max(size.x, size.y, size.z),
      depth,
    );
    container.userData.openingSurface = true;
    for (const sign of [-1, 1]) {
      const hinge = new T.Group();
      container.add(hinge);
      const skin = mesh(
        hinge,
        // Split into left/right hemispheres, matching the actual hinge motion.
        shape === "papilla"
          ? papillaGeometry(sign, true)
          : new T.SphereGeometry(
              1,
              40,
              28,
              sign < 0 ? -Math.PI / 2 : Math.PI / 2,
              Math.PI,
            ),
        material(color, opacity),
        nodeId,
      );
      skin.scale.copy(size);
      animated.push((d, _t, _a, opening) => {
        const opened = continuousReveal(start, end, d) * opening;
        hinge.position.x = sign * size.x * opened * 1.45;
        hinge.position.z = -size.z * opened * 0.55;
        hinge.rotation.y = sign * opened * 0.55;
        hinge.rotation.z = sign * opened * 0.08;
        container.userData.opening = opened;
      });
    }
    return container;
  };
  const splitTube = (
    parent: T.Object3D,
    nodeId: string,
    center: T.Vector3,
    radius: number,
    height: number,
    color: number,
    start: number,
    end: number,
    depth = 2,
  ) => {
    const container = group(parent, nodeId, center, height / 2, depth);
    container.userData.openingSurface = true;
    for (const sign of [-1, 1]) {
      const hinge = new T.Group();
      container.add(hinge);
      mesh(
        hinge,
        new T.CylinderGeometry(
          radius,
          radius,
          height,
          28,
          1,
          true,
          sign < 0 ? Math.PI : 0,
          Math.PI,
        ),
        material(color),
        nodeId,
      );
      animated.push((d, _t, _a, opening) => {
        const opened = continuousReveal(start, end, d) * opening;
        hinge.position.x = sign * radius * opened * 1.65;
        hinge.position.z = -radius * opened * 0.25;
        hinge.rotation.z = sign * opened * 0.13;
        container.userData.opening = opened;
      });
    }
    return container;
  };

  const macro = group(root, "whole-plant", V(), 3.2, 0);
  const stem = splitTube(
    macro,
    "stem",
    V(0, -1, 0),
    0.085,
    3.6,
    C.stem,
    branch === "stem" ? 0.65 : 99,
    branch === "stem" ? 2.05 : 100,
    1,
  );
  stem.userData.branch = "stem";
  for (let side = -1; side <= 1; side += 2)
    for (let index = 0; index < 2; index++) {
      const leaf = mesh(
        macro,
        lamina(
          1.03 + index * 0.2,
          formId === "orchid" ? 0.26 : 0.39,
          0.22,
          C.leaf,
        ),
        material(0xffffff, 1, true),
        "stem",
      );
      leaf.position.set(0, -1.9 + index * 0.85, 0);
      leaf.rotation.z = side * (0.91 + index * 0.16);
      leaf.rotation.y = side * 0.35;
    }
  const bloom = group(macro, "flower", V(0, 0.8, 0), 2.2, 0);
  const openPetal = (
    nodeId: string,
    angle: number,
    length: number,
    width: number,
    curl: number,
    color: number,
    baseRadius = 0,
    selected = false,
  ) => {
    const member = group(
      bloom,
      nodeId,
      V(-Math.sin(angle) * baseRadius, Math.cos(angle) * baseRadius, 0),
      length,
      1,
    );
    member.rotation.z = angle;
    member.userData.branch = "petal";
    for (const sign of [-1, 1]) {
      const hinge = new T.Group();
      member.add(hinge);
      const surface = mesh(
        hinge,
        lamina(length, width, curl, color, sign),
        material(0xffffff, 1, true),
        nodeId,
      );
      surface.userData.branch = "petal";
      // Branching veins follow the same lamina coordinates and remain attached
      // when that surface opens. They show organization, not measured venation.
      const veinPositions: number[] = [];
      const veinPoint = (t: number, u: number) => {
        const edge = Math.pow(Math.sin(Math.PI * t), 0.68);
        return [
          u * width * edge,
          length * t,
          curl * t * t +
            0.11 * Math.sin(Math.PI * t) +
            0.14 * u * u * edge +
            0.003,
        ];
      };
      const strokes = [{ start: 0.04, end: 0.97, extent: sign * 0.006 }];
      for (let i = 0; i < 6; i++)
        strokes.push({
          start: 0.08 + i * 0.105,
          end: 0.4 + i * 0.08,
          extent: sign * 0.82,
        });
      for (const stroke of strokes)
        for (let segment = 0; segment < 16; segment++) {
          for (const step of [segment, segment + 1]) {
            const p = step / 16;
            veinPositions.push(
              ...veinPoint(
                stroke.start + (stroke.end - stroke.start) * p,
                stroke.extent * Math.pow(p, 0.83),
              ),
            );
          }
        }
      const veins = own(new T.BufferGeometry());
      veins.setAttribute(
        "position",
        new T.Float32BufferAttribute(veinPositions, 3),
      );
      const veinMaterial = new T.LineBasicMaterial({
        color:
          nodeId === "sepal"
            ? 0x214c2d
            : formId === "sunflower"
              ? 0x9d6619
              : 0x793b62,
        transparent: true,
        opacity: 0.48,
      });
      materials.add(veinMaterial);
      hinge.add(tag(new T.LineSegments(veins, veinMaterial), nodeId));
      animated.push((d, time, _a, opening) => {
        const reveal =
          selected && branch === "petal"
            ? continuousReveal(0.55, 2.15, d) * opening
            : 0;
        hinge.rotation.y = sign * reveal * 1.22;
        hinge.position.x = sign * reveal * width * 0.08;
        member.userData.opening = reveal;
        member.rotation.x =
          Math.sin(time * 0.38 + angle * 2) *
          0.014 *
          (1 - continuousReveal(0, 1.1, d));
      });
    }
    return member;
  };
  const floralSources = [...form.sourceUrls];
  let petalCenter: T.Vector3,
    petalAngle = 0;
  let antherCenter = V(0, 1.24, 0.44),
    ovaryCenter = V(0, 0.72, 0.12);
  if (formId === "radial") {
    for (let i = 0; i < 5; i++)
      openPetal(
        "sepal",
        (2 * Math.PI * (i + 0.5)) / 5,
        1.3,
        0.28,
        -0.13,
        C.leaf,
      );
    for (let i = 0; i < 5; i++)
      openPetal(
        "petal",
        (2 * Math.PI * i) / 5,
        1.92,
        0.72,
        0.58,
        C.rose,
        0,
        i === 0,
      );
    petalCenter = V(0, 1.86, 0.29);
    ball(bloom, "receptacle", V(0, 0, -0.06), V(0.34, 0.34, 0.17), C.leaf);
    for (let i = 0; i < 8; i++) {
      const angle = (2 * Math.PI * i) / 8;
      const end = V(Math.sin(angle) * 0.44, 0.8 + Math.cos(angle) * 0.44, 0.44);
      curve(
        macro,
        "anther",
        [
          V(end.x * 0.2, 0.8 + (end.y - 0.8) * 0.2, 0.08),
          end
            .clone()
            .multiplyScalar(0.72)
            .add(V(0, 0.22, 0.08)),
          end,
        ],
        0.018,
        C.ivory,
      );
      if (i !== 0) ball(macro, "anther", end, V(0.07, 0.042, 0.052), C.gold);
    }
    curve(
      macro,
      "ovary",
      [ovaryCenter, V(0, 0.85, 0.35), V(0, 0.96, 0.63)],
      0.034,
      C.ivory,
    );
    ball(macro, "ovary", V(0, 0.96, 0.63), V(0.085, 0.054, 0.034), C.rose);
  } else if (formId === "orchid") {
    for (let i = 0; i < 3; i++)
      openPetal("sepal", (2 * Math.PI * i) / 3, 1.66, 0.43, 0.22, 0xdda4c2);
    openPetal("petal", -1.05, 1.76, 0.77, 0.31, 0xca7bb3, 0, true);
    openPetal("petal", 1.05, 1.76, 0.77, 0.31, 0xca7bb3);
    const lip = openPetal("lip", Math.PI, 1.27, 0.55, 0.92, C.wine);
    lip.position.z = 0.13;
    lip.userData.differentiatedLip = true;
    // Raised side lobes and paired callus ridges belong to the one labellum;
    // these are an illustrative orchid form, not additional perianth members.
    for (const side of [-1, 1]) {
      const lobe = mesh(
        lip,
        lamina(0.61, 0.2, 0.31, 0xd9b0c7),
        material(0xffffff, 1, true),
        "lip",
      );
      lobe.position.set(side * 0.08, 0.13, 0.16);
      lobe.rotation.z = side * 0.75;
      lobe.rotation.y = -side * 0.65;
      curve(
        lip,
        "lip",
        [
          V(side * 0.07, 0.13, 0.16),
          V(side * 0.08, 0.35, 0.19),
          V(side * 0.1, 0.58, 0.34),
        ],
        0.026,
        C.gold,
      );
    }
    curve(
      macro,
      "column",
      [V(0, 0.45, 0.08), V(0, 0.86, 0.23), V(0, 1.09, 0.31)],
      0.093,
      C.ivory,
    );
    antherCenter = V(0, 1.09, 0.33);
    ovaryCenter = V(0, 0.24, -0.015);
    for (const side of [-1, 1])
      ball(
        macro,
        "pollinia",
        V(side * 0.052, 1.08, 0.37),
        V(0.037, 0.056, 0.028),
        C.pollen,
      );
    petalAngle = -1.05;
    petalCenter = V(1.0, 1.38, 0.24);
  } else {
    ball(bloom, "sunflower-head", V(0, 0, -0.09), V(0.89, 0.89, 0.19), C.stem);
    ball(
      bloom,
      "sunflower-head",
      V(0, 0, 0.035),
      V(0.825, 0.825, 0.14),
      0x654324,
    );
    for (let i = 0; i < 23; i++)
      openPetal(
        "sunflower-ray-corolla",
        (2 * Math.PI * i) / 23,
        1.1,
        0.17,
        0.13,
        C.gold,
        0.83,
        i === 0,
      );
    const discGeometry = own(discFloretGeometry());
    const discCount = 320;
    const discs = tag(
      new T.InstancedMesh(discGeometry, material(0xaa751d), discCount),
      "sunflower-disc-floret",
    );
    const matrix = new T.Matrix4(),
      orient = new T.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2);
    for (let i = 0; i < discCount; i++) {
      const angle = i * 2.3999632297,
        radius = 0.78 * Math.sqrt((i + 0.5) / discCount);
      matrix.compose(
        V(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0.12 + 0.045 * (1 - radius),
        ),
        orient,
        V(1, 1, 1),
      );
      discs.setMatrixAt(i, matrix);
      discs.setColorAt(i, new T.Color(i % 3 ? 0x976721 : 0xc29331));
    }
    bloom.add(discs);
    discs.userData.inflorescence = true;
    discs.userData.branch = "anther";
    // One persistent selected tubular floret carries the reproductive route.
    const floret = group(
      bloom,
      "sunflower-disc-floret",
      V(0, 0.12, 0.19),
      0.15,
      1,
    );
    for (let i = 0; i < 5; i++) {
      const lobe = mesh(
        floret,
        lamina(0.09, 0.023, 0.025, C.gold),
        material(0xffffff, 1, true),
        "sunflower-disc-floret",
      );
      lobe.rotation.z = (2 * Math.PI * i) / 5;
      animated.push((d, _t, _a, opening) => {
        lobe.rotation.x =
          branch === "anther" || branch === "ovary"
            ? -continuousReveal(0.4, 1.8, d) * opening * 0.7
            : 0;
      });
    }
    curve(
      floret,
      "ovary",
      [V(0, 0, -0.13), V(0, 0, -0.025), V(0, 0.01, 0.055)],
      0.007,
      C.ivory,
    );
    antherCenter = V(0, 0.92, 0.22);
    ovaryCenter = V(0, 0.92, 0.06);
    petalCenter = V(0, 2.22, 0.09);
    root.userData.selectedFloret = "sunflower-disc-floret";
  }
  const macroAnther = shell(
    macro,
    formId === "orchid" ? "anther-cap" : "anther",
    antherCenter,
    formId === "sunflower" ? V(0.032, 0.041, 0.028) : V(0.096, 0.067, 0.066),
    C.gold,
    branch === "anther" ? 0.65 : 99,
    branch === "anther" ? 2.05 : 100,
    0.97,
    1,
  );
  macroAnther.userData.branch = "anther";
  const macroOvary = shell(
    macro,
    "ovary",
    ovaryCenter,
    formId === "orchid"
      ? V(0.13, 0.29, 0.13)
      : formId === "sunflower"
        ? V(0.035, 0.065, 0.035)
        : V(0.19, 0.24, 0.17),
    C.leaf,
    branch === "ovary" ? 0.6 : 99,
    branch === "ovary" ? 2.1 : 100,
    0.98,
    1,
  );
  macroOvary.userData.branch = "ovary";

  const center =
    branch === "petal"
      ? petalCenter
      : branch === "stem"
        ? V(0, -1.25, 0.02)
        : branch === "anther"
          ? antherCenter
          : ovaryCenter;
  const scale =
    branch === "petal"
      ? formId === "sunflower"
        ? 0.09
        : 0.14
      : branch === "stem"
        ? 0.072
        : formId === "sunflower"
          ? 0.022
          : branch === "anther"
            ? 0.047
            : formId === "orchid"
              ? 0.085
              : 0.105;
  const tissue = group(root, `${branch}-continuum`, center, scale * 1.3, 2);
  tissue.scale.setScalar(scale);
  if (branch === "petal") tissue.rotation.z = petalAngle;
  tissue.userData.hierarchyLayer = "tissue";
  const localToRoot = (position: T.Vector3) =>
    position
      .clone()
      .multiplyScalar(scale)
      .applyAxisAngle(V(0, 0, 1), branch === "petal" ? petalAngle : 0)
      .add(center);
  let cellPoint = V(),
    componentPoint = V();
  let cellRadius = 0.36,
    componentRadius = 0.15;
  let tissueId = "petal-epidermis",
    cellId = "petal-papilla",
    componentId = "petal-vacuole";

  if (branch === "petal" && formId === "sunflower") {
    // Wiland-Szymańska et al. 2026, doi:10.1038/s41598-026-53788-7,
    // identifies xanthophyll-bearing globular chromoplasts in ray-ligule
    // mesophyll. Original schematic geometry; no cultivar measurements copied.
    tissueId = "sunflower-ray-mesophyll";
    cellId = "sunflower-ray-cell";
    componentId = "sunflower-chromoplast";
    const mesophyll = group(tissue, tissueId, V(), 1.4, 2);
    const cellGeometry = own(new T.SphereGeometry(1, 24, 18));
    const cellMaterial = material(0xc8cb9b, 0.3);
    const plastidGeometry = own(new T.SphereGeometry(0.044, 14, 10));
    const plastidMaterial = material(0xe6ad12);
    for (let row = -2; row <= 2; row++)
      for (let col = -2; col <= 2; col++) {
        if (!row && !col) continue;
        const neighbor = group(
          mesophyll,
          tissueId,
          V(
            col * 0.43 + (Math.abs(row) % 2) * 0.08,
            row * 0.46,
            -0.12 - 0.025 * col * col,
          ),
          0.3,
          2,
        );
        const covering = mesh(neighbor, cellGeometry, cellMaterial, tissueId);
        covering.scale.set(0.21, 0.25 + 0.016 * Math.cos(row + col), 0.16);
        for (let i = 0; i < 5; i++) {
          const plastid = mesh(
            neighbor,
            plastidGeometry,
            plastidMaterial,
            componentId,
          );
          const angle = i * 2.399 + row + col;
          plastid.position.set(
            Math.cos(angle) * 0.12,
            Math.sin(angle) * 0.17,
            0.065,
          );
        }
        const base = neighbor.position.clone();
        animated.push((depth, _time, _activity, opening) => {
          const spread = continuousReveal(2.1, 3.4, depth) * opening;
          neighbor.position.copy(base).multiplyScalar(1 + 0.35 * spread);
          neighbor.position.z -= spread * 0.12;
        });
      }
    const cell = group(mesophyll, cellId, V(0, 0, 0.055), 0.5, 3);
    cell.userData.hierarchyLayer = "cell";
    shell(
      cell,
      cellId,
      V(),
      V(0.32, 0.42, 0.26),
      0xa5b897,
      2.03,
      3.48,
      0.46,
      3,
    );
    shell(
      cell,
      cellId,
      V(),
      V(0.305, 0.404, 0.248),
      0xc7d5b0,
      2.25,
      3.65,
      0.2,
      3,
    );
    // Clear vacuolar volume is context, not the yellow-pigment compartment.
    ball(
      cell,
      cellId,
      V(-0.055, 0.02, -0.025),
      V(0.18, 0.29, 0.15),
      0xa1cdd0,
      0.12,
    );
    ball(
      cell,
      cellId,
      V(-0.16, -0.2, 0.06),
      V(0.073, 0.095, 0.062),
      0x9b91b5,
      0.7,
    );
    for (let i = 0; i < 8; i++) {
      const angle = 0.85 + i * 0.68;
      ball(
        cell,
        componentId,
        V(Math.cos(angle) * 0.2, Math.sin(angle) * 0.3, 0.09),
        V(0.053, 0.06, 0.055),
        0xe4b315,
      );
    }
    const plastidCenter = V(0.19, 0.065, 0.18);
    const chromoplast = group(cell, componentId, plastidCenter, 0.13, 4);
    chromoplast.userData.hierarchyLayer = "organelle";
    shell(
      chromoplast,
      componentId,
      V(),
      V(0.109, 0.109, 0.109),
      0xd9a91c,
      3.05,
      4,
      0.66,
      4,
    );
    shell(
      chromoplast,
      componentId,
      V(),
      V(0.1, 0.1, 0.1),
      0xf5d577,
      3.18,
      4,
      0.35,
      4,
    );
    particles(
      chromoplast,
      componentId,
      34,
      0.0105,
      0xe8ac09,
      (i, time, target) => {
        const angle = i * 2.399 + Math.sin(time * 0.13) * 0.1;
        const y = 1 - (2 * (i + 0.5)) / 34;
        const radius = 0.074 * Math.sqrt(1 - y * y);
        target.set(
          Math.cos(angle) * radius,
          y * 0.074,
          Math.sin(angle) * radius,
        );
      },
      "illustrative-xanthophyll-compartment",
    );
    cellPoint = V(0, 0, 0.055);
    componentPoint = plastidCenter.clone().add(cellPoint);
    cellRadius = 0.52;
    componentRadius = 0.16;
  } else if (branch === "petal") {
    // Anthocyanin-bearing papilla: this is a comparative example, not a claim
    // that sunflower rays or every orchid have anthocyanins or conical cells.
    const cells = tag(
      new T.InstancedMesh(
        own(papillaGeometry()),
        material(0xffffff, 0.96, true),
        34,
      ),
      "petal-epidermis",
    );
    const transform = new T.Matrix4(),
      orientation = new T.Quaternion();
    let index = 0;
    for (let row = -2; row <= 2; row++)
      for (let col = -3; col <= 3; col++) {
        if (row === 0 && col === 0) continue;
        transform.compose(
          V(
            col * 0.35 + (Math.abs(row) % 2) * 0.175,
            row * 0.3,
            -0.065 - 0.03 * col * col,
          ),
          orientation,
          V(
            1 + 0.045 * Math.sin(row * 1.7 + col),
            1 + 0.045 * Math.cos(col * 1.7 + row),
            0.94 + 0.12 * Math.sin(col + row),
          ),
        );
        cells.setMatrixAt(index++, transform);
      }
    tissue.add(cells);
    const underside = tag(
      new T.InstancedMesh(
        own(new T.SphereGeometry(0.12, 10, 8)),
        material(0x99ad8f, 0.83),
        20,
      ),
      "petal-inner-tissue",
    );
    for (let i = 0; i < 20; i++) {
      transform.compose(
        V(((i % 5) - 2) * 0.42, (Math.floor(i / 5) - 1.5) * 0.35, -0.29),
        new T.Quaternion(),
        V(1.4, 1, 0.85),
      );
      underside.setMatrixAt(i, transform);
    }
    tissue.add(underside);
    const cell = group(tissue, "petal-papilla", V(0, 0, 0.02), 0.38, 3);
    cell.userData.hierarchyLayer = "cell";
    shell(
      cell,
      "petal-wall",
      V(),
      V(0.23, 0.3, 0.3),
      C.wall,
      2.15,
      3.45,
      0.88,
      3,
      "papilla",
    );
    shell(
      cell,
      "petal-papilla",
      V(0, 0, 0.006),
      V(0.212, 0.277, 0.28),
      C.membrane,
      2.35,
      3.5,
      0.32,
      3,
      "papilla",
    );
    const vacuole = shell(
      cell,
      "petal-tonoplast",
      V(-0.018, 0.014, 0.025),
      V(0.145, 0.207, 0.19),
      C.rose,
      3.13,
      4,
      0.43,
      4,
    );
    vacuole.userData.hierarchyLayer = "organelle";
    const lumen = group(cell, "petal-vacuole", V(-0.018, 0.014, 0.025), 0.2, 4);
    particles(
      lumen,
      "petal-vacuole",
      42,
      0.01,
      C.wine,
      (i, time, target) => {
        const a = i * 2.399 + time * 0.085,
          r = 0.12 * Math.sqrt((i + 1) / 43);
        target.set(
          Math.cos(a) * r,
          Math.sin(a) * r * 1.42,
          Math.sin(i * 1.71 + time * 0.13) * 0.105,
        );
      },
      "illustrative-pigment-motion",
    );
    const nucleus = shell(
      cell,
      "petal-nucleus",
      V(0.14, -0.12, 0.09),
      V(0.068, 0.082, 0.071),
      C.nucleus,
      3.45,
      4.0,
      0.6,
      4,
    );
    const chromatin = new Float32Array(180 * 3);
    const chromatinGeometry = own(new T.BufferGeometry());
    chromatinGeometry.setAttribute(
      "position",
      new T.BufferAttribute(chromatin, 3),
    );
    const chromatinMaterial = new T.LineBasicMaterial({ color: 0x644682 });
    materials.add(chromatinMaterial);
    nucleus.add(
      tag(new T.Line(chromatinGeometry, chromatinMaterial), "petal-nucleus"),
    );
    animated.push((_d, time) => {
      for (let i = 0; i < 180; i++) {
        const t = i / 179;
        chromatin[i * 3] = Math.sin(t * 47) * 0.043;
        chromatin[i * 3 + 1] = (t - 0.5) * 0.11;
        chromatin[i * 3 + 2] =
          Math.cos(t * 37 + Math.sin(time * 0.12) * 0.12) * 0.038;
      }
      chromatinGeometry.attributes.position.needsUpdate = true;
    });
    cellPoint = V(0, 0, 0.045);
    componentPoint = V(-0.018, 0.014, 0.065);
    componentRadius = 0.2;
  } else if (branch === "stem") {
    tissueId = "stem-xylem";
    cellId = "stem-vessel";
    componentId = "stem-pit";
    const bundle = group(tissue, "stem-xylem", V(), 1.5, 2);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8,
        x = Math.cos(angle) * 0.6,
        z = Math.sin(angle) * 0.6;
      if (i === 0) continue;
      const vessel = mesh(
        bundle,
        new T.CylinderGeometry(0.13, 0.13, 2.6, 12, 1, true),
        material(0xae9870),
        "stem-xylem",
      );
      vessel.position.set(x, 0, z);
      // Unfold the surrounding bundle away from the selected vessel's sightline.
      // This is an exploded teaching view, not a physiological movement.
      animated.push((depth, _time, _activity, opening) => {
        const spread = continuousReveal(1.65, 3.15, depth) * opening;
        vessel.position.set(
          x * (1 + spread * 1.7) - spread * 0.25,
          0,
          z - spread * 0.85,
        );
      });
    }
    for (let i = 0; i < 9; i++)
      ball(
        tissue,
        "stem-phloem",
        V(-0.8, ((i % 3) - 1) * 0.4, (Math.floor(i / 3) - 1) * 0.28),
        V(0.12, 0.19, 0.1),
        0x94b37e,
      );
    const conduit = group(bundle, "stem-vessel", V(0.6, 0, 0), 0.9, 3);
    conduit.userData.hierarchyLayer = "cell";
    splitTube(
      conduit,
      "stem-secondary-wall",
      V(),
      0.19,
      2.55,
      0xb38a52,
      2.12,
      3.72,
      3,
    );
    const lignin = mesh(
      conduit,
      new T.TorusGeometry(0.195, 0.013, 5, 24),
      material(0x76542d),
      "stem-perforation",
    );
    lignin.rotation.x = Math.PI / 2;
    lignin.position.y = 0.86;
    const second = mesh(
      conduit,
      new T.TorusGeometry(0.195, 0.013, 5, 24),
      material(0x76542d),
      "stem-perforation",
    );
    second.rotation.x = Math.PI / 2;
    second.position.y = -0.86;
    for (let i = 0; i < 8; i++) {
      const angle = i % 2 ? 0.4 : -0.4,
        y = (i - 3.5) * 0.26;
      const pit = mesh(
        conduit,
        new T.TorusGeometry(0.038, 0.009, 6, 15),
        material(C.gold),
        "stem-pit",
      );
      pit.position.set(Math.sin(angle) * 0.18, y, 0.178);
      pit.scale.y = 1.35;
      // A pit retains a thin membrane; it is not a drilled opening through every wall.
      ball(
        conduit,
        "stem-pit",
        V(Math.sin(angle) * 0.18, y, 0.177),
        V(0.033, 0.044, 0.005),
        C.membrane,
        0.6,
      );
    }
    particles(
      conduit,
      "stem-lumen",
      40,
      0.014,
      C.water,
      (i, time, target) => {
        const a = i * 2.399,
          y = (((i / 40 + time * 0.16) % 1) + 1) % 1;
        target.set(Math.cos(a) * 0.12, (y - 0.5) * 2.5, Math.sin(a) * 0.12);
      },
      "upward-xylem-route",
    );
    particles(
      conduit,
      "stem-pit",
      8,
      0.009,
      0xb4edee,
      (i, time, target) => {
        const p = (((time * 0.11 + i / 8) % 1) + 1) % 1;
        // Cross the membrane of the retained pit at y=0.13, rather than
        // tracing an unrelated arc alongside the vessel wall.
        target.set(Math.sin(-0.4) * 0.18, 0.13, 0.112 + p * 0.13);
      },
      "lateral-pit-route",
    );
    cellPoint = V(0.6, 0, 0);
    componentPoint = V(0.6 + Math.sin(-0.4) * 0.18, 0.13, 0.177);
    cellRadius = 1.12;
    componentRadius = 0.17;
  } else if (branch === "anther") {
    tissueId = "anther-pollen-sac";
    cellId = "anther-pollen";
    componentId = "anther-aperture";
    shell(
      tissue,
      "anther-pollen-sac",
      V(),
      V(1.25, 0.95, 0.72),
      C.gold,
      1.28,
      2.85,
      0.83,
      2,
    );
    const grains = tag(
      new T.InstancedMesh(
        own(new T.IcosahedronGeometry(0.14, 1)),
        material(C.pollen),
        26,
      ),
      "anther-pollen-sac",
    );
    const matrix = new T.Matrix4();
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399,
        r = 0.62 + (i % 3) * 0.13;
      matrix.compose(
        V(
          Math.cos(a) * r,
          Math.sin(a) * r * 0.65,
          -0.22 + Math.sin(i * 2) * 0.17,
        ),
        new T.Quaternion(),
        V(1, 1, 1),
      );
      grains.setMatrixAt(i, matrix);
    }
    tissue.add(grains);
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      ball(
        tissue,
        "anther-tapetum",
        V(Math.cos(a) * 1.15, Math.sin(a) * 0.81, -0.22),
        V(0.1, 0.09, 0.09),
        0xbd996a,
      );
    }
    const pollen = group(tissue, "anther-pollen", V(0, 0, 0.24), 0.46, 3);
    pollen.userData.hierarchyLayer = "gametophyte";
    const exine = shell(
      pollen,
      "anther-exine",
      V(),
      V(0.36, 0.36, 0.36),
      C.pollen,
      2.12,
      3.63,
      0.87,
      3,
    );
    const spikeGeometry = own(new T.ConeGeometry(0.018, 0.051, 5));
    const spikeMaterial = material(0xc58d3a);
    const matrix2 = new T.Matrix4(),
      yAxis = V(0, 1, 0);
    for (let half = 0; half < 2; half++) {
      const spikes = tag(
        new T.InstancedMesh(spikeGeometry, spikeMaterial, 72),
        "anther-exine",
      );
      for (let i = 0; i < 72; i++) {
        const y = 1 - (2 * (i + 0.5)) / 72,
          a = i * 2.399,
          normal = V(
            Math.cos(a) * Math.sqrt(1 - y * y),
            y,
            Math.sin(a) * Math.sqrt(1 - y * y),
          );
        // Leave the front aperture region without exine ornamentation.
        const valid =
          normal.z < 0.9 && (half === 0 ? normal.x < 0 : normal.x >= 0);
        matrix2.compose(
          normal.clone().multiplyScalar(0.375),
          new T.Quaternion().setFromUnitVectors(yAxis, normal),
          V(valid ? 1 : 0.001, valid ? 1 : 0.001, valid ? 1 : 0.001),
        );
        spikes.setMatrixAt(i, matrix2);
      }
      // Ornamentation stays attached to its opening wall half.
      exine.children[half].add(spikes);
    }
    shell(
      pollen,
      "anther-intine",
      V(),
      V(0.315, 0.315, 0.315),
      C.ivory,
      2.53,
      3.83,
      0.35,
      4,
    );
    ball(
      pollen,
      "anther-vegetative",
      V(),
      V(0.294, 0.294, 0.294),
      C.membrane,
      0.1,
    );
    ball(
      pollen,
      "anther-vegetative",
      V(-0.075, 0.075, 0.01),
      V(0.095, 0.105, 0.09),
      C.nucleus,
      0.92,
    );
    ball(
      pollen,
      "anther-pollen",
      V(0.11, -0.035, 0.055),
      V(0.092, 0.15, 0.077),
      0xba7a9c,
      0.87,
    );
    const aperture = mesh(
      pollen,
      new T.TorusGeometry(0.093, 0.015, 7, 24),
      material(0x9f733a),
      "anther-aperture",
    );
    aperture.position.z = 0.345;
    const growth = curve(
      pollen,
      "anther-vegetative",
      [
        V(0, 0, 0.31),
        V(0.02, -0.05, 0.51),
        V(0.18, -0.15, 0.65),
        V(0.36, -0.11, 0.82),
      ],
      0.039,
      C.ivory,
    );
    growth.object.userData.dynamicKind = "pollen-tube-extension";
    const count = growth.object.geometry.index!.count;
    animated.push((d, time, activity) => {
      const fraction =
        continuousReveal(2.8, 4, d) *
        (0.48 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.18))) *
        (0.7 + 0.3 * activity);
      growth.object.geometry.setDrawRange(
        0,
        Math.floor((count * fraction) / 6) * 6,
      );
    });
    particles(
      pollen,
      "anther-vegetative",
      6,
      0.013,
      C.nucleus,
      (i, time, target) => {
        growth.path.getPoint((((time * 0.055 + i / 6) % 1) + 1) % 1, target);
      },
      "pollen-tube-contents",
    );
    cellPoint = V(0, 0, 0.24);
    componentPoint = V(0.015, -0.015, 0.58);
    cellRadius = 0.55;
    componentRadius = 0.26;
  } else {
    tissueId = "ovary-ovule";
    cellId = "ovary-embryo-sac";
    componentId = "ovary-egg-nucleus";
    const ovule = group(tissue, "ovary-ovule", V(), 1.35, 2);
    // Nested coverings remain attached while their halves open around the interior.
    shell(
      ovule,
      "ovary-integuments",
      V(),
      V(0.78, 1.13, 0.64),
      0xa5bd81,
      1.22,
      2.62,
      0.87,
      2,
    );
    shell(
      ovule,
      "ovary-nucellus",
      V(0, 0.05, 0.015),
      V(0.62, 0.93, 0.51),
      0xc3c89b,
      1.65,
      3.0,
      0.74,
      2,
    );
    const sac = group(ovule, "ovary-embryo-sac", V(0, 0.02, 0.04), 0.78, 3);
    sac.userData.hierarchyLayer = "gametophyte";
    shell(
      sac,
      "ovary-embryo-sac",
      V(),
      V(0.4, 0.77, 0.36),
      C.membrane,
      2.05,
      3.28,
      0.36,
      3,
    );
    // Common Polygonum-type teaching arrangement: seven cells. Counts vary in nature.
    shell(
      sac,
      "ovary-central-cell",
      V(0, 0.07, 0),
      V(0.3, 0.43, 0.27),
      0xc7b7b5,
      2.65,
      3.75,
      0.36,
      3,
    );
    for (const side of [-1, 1])
      ball(
        sac,
        "ovary-polar-nuclei",
        V(side * 0.075, 0.03, 0.07),
        V(0.052, 0.061, 0.047),
        C.nucleus,
      );
    const egg = group(sac, "ovary-egg", V(0, -0.48, 0.1), 0.21, 3);
    shell(
      egg,
      "ovary-egg",
      V(),
      V(0.125, 0.18, 0.135),
      C.rose,
      2.75,
      3.82,
      0.59,
      3,
    );
    const eggNucleus = shell(
      egg,
      "ovary-egg-nucleus",
      V(0, 0.01, 0.032),
      V(0.062, 0.079, 0.059),
      C.nucleus,
      3.45,
      4,
      0.66,
      4,
    );
    for (const side of [-1, 1]) {
      ball(
        sac,
        "ovary-synergids",
        V(side * 0.2, -0.48, 0.055),
        V(0.092, 0.18, 0.11),
        0xd9bc83,
        0.78,
      );
      for (let i = 0; i < 5; i++)
        curve(
          sac,
          "ovary-synergids",
          [
            V(side * 0.2 + (i - 2) * 0.014, -0.65, 0.14),
            V(side * 0.2 + (i - 2) * 0.021, -0.56, 0.15),
          ],
          0.005,
          C.ivory,
        );
    }
    for (let i = 0; i < 3; i++)
      ball(
        sac,
        "ovary-embryo-sac",
        V((i - 1) * 0.13, 0.56 + (i === 1 ? 0.045 : 0), 0.035),
        V(0.095, 0.12, 0.095),
        C.wall,
        0.84,
      );
    const incoming = curve(
      ovule,
      "ovary-synergids",
      [
        V(0.46, -1.38, 0.22),
        V(0.04, -1.17, 0.2),
        V(0.045, -0.87, 0.19),
        V(0.18, -0.57, 0.17),
      ],
      0.026,
      C.gold,
    );
    particles(
      ovule,
      "ovary-synergids",
      2,
      0.019,
      C.nucleus,
      (i, time, target) => {
        incoming.path.getPoint(
          (((time * 0.05 + i * 0.12) % 1) + 1) % 1,
          target,
        );
      },
      "illustrative-pollen-tube-reception",
    );
    const marks = tag(
      new T.InstancedMesh(
        own(new T.CapsuleGeometry(0.007, 0.025, 3, 5)),
        material(0x795493),
        6,
      ),
      "ovary-egg-nucleus",
    );
    const matrix = new T.Matrix4();
    for (let i = 0; i < 6; i++) {
      matrix.compose(
        V(
          Math.sin(i * 2.3) * 0.032,
          Math.cos(i * 2.3) * 0.045,
          Math.sin(i * 1.7) * 0.029,
        ),
        new T.Quaternion().setFromAxisAngle(V(0, 0, 1), i),
        V(1, 1, 1),
      );
      marks.setMatrixAt(i, matrix);
    }
    eggNucleus.add(marks);
    marks.userData.symbolicCounts = true;
    animated.push((_d, time) => {
      marks.rotation.y = Math.sin(time * 0.14) * 0.13;
    });
    cellPoint = V(0, 0.02, 0.08);
    componentPoint = V(0, -0.45, 0.182);
    cellRadius = 0.9;
    componentRadius = 0.15;
  }

  const reproductiveFloret =
    formId === "sunflower" && (branch === "anther" || branch === "ovary");
  const organRadius =
    branch === "petal"
      ? 0.75
      : branch === "stem"
        ? 0.42
        : reproductiveFloret
          ? 0.17
          : branch === "anther"
            ? 0.3
            : 0.43;
  const anchors: LivingAnchor[] = [
    {
      depth: 0,
      position: V(0, -0.25, 0),
      radius: 3.2,
      nodeId: formId === "sunflower" ? "sunflower-head" : "whole-plant",
    },
    {
      depth: 1,
      position: center.clone(),
      radius: organRadius,
      nodeId: reproductiveFloret
        ? "sunflower-disc-floret"
        : formId === "sunflower" && branch === "petal"
          ? "sunflower-ray"
          : branch,
    },
    {
      depth: 2,
      position: center.clone(),
      radius: scale * (branch === "stem" ? 2.1 : 1.65),
      nodeId: tissueId,
    },
    {
      depth: 3,
      position: localToRoot(cellPoint),
      radius: scale * cellRadius,
      nodeId: cellId,
    },
    {
      depth: 4,
      position: localToRoot(componentPoint),
      radius: scale * componentRadius,
      nodeId: componentId,
    },
  ];
  const botanicalSources: Record<LivingBranch, string[]> = {
    petal: [
      "https://pubmed.ncbi.nlm.nih.gov/17173704/",
      "https://pubmed.ncbi.nlm.nih.gov/12226425/",
      "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells",
    ],
    stem: [
      "https://openstax.org/books/biology-2e/pages/30-2-stems",
      "https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants",
    ],
    anther: [
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC2566931/",
      "https://pubmed.ncbi.nlm.nih.gov/28899962/",
      "https://openstax.org/books/biology-2e/pages/32-2-pollination-and-fertilization",
    ],
    ovary: [
      "https://pubmed.ncbi.nlm.nih.gov/17326723/",
      "https://www.nature.com/articles/s41467-025-58246-y",
      "https://openstax.org/books/biology-2e/pages/32-2-pollination-and-fertilization",
    ],
  };
  const teachingNote: Localized = {
    en:
      branch === "petal" && formId === "sunflower"
        ? "An original mesophyll-cell teaching model informed by xanthophyll-bearing globular chromoplasts reported in sunflower ray ligules. Organelle numbers, proportions and motion are illustrative, not measured cultivar anatomy or photophysics."
        : branch === "petal"
          ? "A generic anthocyanin-bearing petal cell is opened for comparison. It does not identify the pigments or cell shapes of this flower form. Particle counts and motion are illustrative."
          : branch === "anther" && formId === "orchid"
            ? "The flower retains an orchid column and pollinia. The enlarged single-grain interior is a comparative two-celled pollen model, not an orchid pollinium reconstruction."
            : branch === "ovary"
              ? "The nested interior is a common Polygonum-type teaching example before fertilization, not a species-specific ovule reconstruction. Chromosome marks and motion are symbolic."
              : "Authored three-dimensional teaching geometry. Internal proportions, counts and animation are illustrative, not specimen measurements or calibrated physiological rates.",
    es:
      branch === "petal" && formId === "sunflower"
        ? "Modelo didáctico original de mesófilo, basado en cromoplastos globulares con xantofilas descritos en lígulas de girasol. Cantidades, proporciones y movimiento son ilustrativos; no son anatomía medida ni fotofísica."
        : branch === "petal"
          ? "Se abre una célula genérica de pétalo con antocianinas para comparar. No identifica los pigmentos ni las formas celulares de esta flor. Cantidades y movimientos son ilustrativos."
          : branch === "anther" && formId === "orchid"
            ? "La flor conserva columna y polinios de orquídea. El interior ampliado de un grano es un modelo comparativo de polen bicelular, no la reconstrucción de un polinio."
            : branch === "ovary"
              ? "El interior anidado es un ejemplo didáctico común de tipo Polygonum antes de la fecundación, no una reconstrucción específica. Cromosomas y movimientos son simbólicos."
              : "Geometría didáctica tridimensional original. Proporciones, cantidades y animación son ilustrativas; no son medidas del ejemplar ni tasas fisiológicas calibradas.",
  };
  let disposed = false;
  // Only macro-owned materials become a subdued spatial reference after their
  // real surfaces open/retract. Tissue and organelle materials are never shared
  // with this map, and reversal restores each material's authored state.
  const macroMaterialState = new Map<
    T.Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();
  macro.traverse((object) => {
    if (object instanceof T.Mesh || object instanceof T.Line) {
      for (const mat of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!macroMaterialState.has(mat))
          macroMaterialState.set(mat, {
            opacity: mat.opacity,
            transparent: mat.transparent,
            depthWrite: mat.depthWrite,
          });
      }
    }
  });
  let lastSelected: string | undefined;
  const update = (state: LivingGeometryState) => {
    if (disposed) return;
    const depth = clamp(state.depth, 0, 4),
      time = Number.isFinite(state.time) ? state.time : 0;
    const activity = clamp(state.activity ?? 1),
      opening = clamp(state.opening ?? 1);
    for (const animate of animated) animate(depth, time, activity, opening);
    macro.rotation.z =
      Math.sin(time * 0.21) * 0.006 * (1 - continuousReveal(0, 1.15, depth));
    // Continue the physical cutaway by retracting enclosing macro structures
    // behind the embedded tissue. This keeps the connected context present
    // without placing an opaque petal/head across a microscopic camera ray.
    macro.position.z = -1.65 * continuousReveal(1.05, 2.6, depth) * opening;
    const contextOpacity = 1 - 0.94 * continuousReveal(1.35, 2.5, depth);
    for (const [mat, original] of macroMaterialState) {
      const transparent = original.transparent || contextOpacity < 0.999;
      if (mat.transparent !== transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
      }
      mat.opacity = original.opacity * contextOpacity;
      mat.depthWrite = original.depthWrite && contextOpacity > 0.999;
    }
    // Layers overlap throughout travel; no replacement, discrete level or global hide.
    tissue.visible = true;
    root.userData.depth = depth;
    root.userData.selectedNode = state.selectedNode ?? "";
    if (lastSelected !== (state.selectedNode ?? "")) {
      for (const [id, entries] of nodeMaterials)
        for (const entry of entries) {
          entry.emissive.setHex(
            id === state.selectedNode ? 0x47735a : 0x000000,
          );
          entry.emissiveIntensity = id === state.selectedNode ? 0.34 : 0;
        }
      lastSelected = state.selectedNode ?? "";
    }
    root.updateMatrixWorld(true);
  };
  const focusForNode = (nodeId: string): LivingAnchor | undefined => {
    const entry = selectable.get(nodeId);
    if (!entry) return undefined;
    root.updateMatrixWorld(true);
    const position = root.worldToLocal(entry.object.getWorldPosition(V()));
    const objectScale = entry.object.getWorldScale(V());
    const rootScale = root.getWorldScale(V());
    const radius =
      entry.radius *
      Math.max(
        objectScale.x / rootScale.x,
        objectScale.y / rootScale.y,
        objectScale.z / rootScale.z,
      );
    return {
      depth: entry.depth,
      position,
      radius: Math.max(0.001, radius),
      nodeId,
    };
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const instance of instances) instance.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const mat of materials) mat.dispose();
    root.clear();
    selectable.clear();
    nodeMaterials.clear();
    macroMaterialState.clear();
    animated.length = 0;
  };
  update({ depth: 0, time: 0 });
  return {
    root,
    anchors,
    formId,
    branch,
    teachingNote,
    sourceUrls: [
      ...floralSources,
      ...(formId === "sunflower" && branch === "petal"
        ? [
            "https://www.nature.com/articles/s41598-026-53788-7",
            "https://pubmed.ncbi.nlm.nih.gov/42225694/",
          ]
        : botanicalSources[branch]),
    ],
    update,
    focusForNode,
    dispose,
  };
}
