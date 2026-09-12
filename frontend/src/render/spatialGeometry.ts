import * as T from "three";
import type { Region } from "../lib/spatialAtlas";

export interface SpatialModel {
  region: Region;
  root: T.Group;
  shell: T.Group;
  tissue: T.Group;
  cell: T.Group;
  interior: T.Group;
  alternateCell: T.Group;
  alternateInterior: T.Group;
  anchor: T.Vector3;
  tint: number;
}

const PALETTE: Record<Region, number> = {
  root: 0xc39b71,
  stem: 0x5f9565,
  branch: 0x82a36d,
  leaf: 0x5eb889,
  sepal: 0x3f9676,
  petal: 0xff8d94,
  stamen: 0xf3be53,
  pistil: 0xa88ac5,
};
const ANCHORS: Record<Region, [number, number, number]> = {
  root: [0, -1.75, 0],
  stem: [0, -0.1, 0],
  branch: [0.75, 0.55, 0],
  leaf: [-1.5, 0.5, 0],
  sepal: [0, 1.62, 0],
  petal: [0, 2.13, 0],
  stamen: [0.32, 2.11, 0.22],
  pistil: [0, 2.08, 0],
};
const mat = (color: number, opacity = 1, metalness = 0) => {
  void metalness;
  const material = new T.MeshPhongMaterial({
    color,
    shininess: 28,
    specular: 0x2d3931,
    transparent: true,
    opacity,
    side: T.DoubleSide,
    depthWrite: opacity === 1,
  });
  material.userData.baseOpacity = opacity;
  return material;
};
function mesh(
  parent: T.Group,
  geometry: T.BufferGeometry,
  color: number,
  at: [number, number, number] = [0, 0, 0],
  opacity = 1,
  part = "",
) {
  const object = new T.Mesh(geometry, mat(color, opacity));
  object.position.set(...at);
  object.userData.partId = part;
  parent.add(object);
  return object;
}
function ball(
  parent: T.Group,
  color: number,
  at: [number, number, number],
  size: [number, number, number],
  opacity = 1,
  part = "",
) {
  const object = mesh(
    parent,
    new T.SphereGeometry(1, 20, 12),
    color,
    at,
    opacity,
    part,
  );
  object.scale.set(...size);
  return object;
}
function rod(
  parent: T.Group,
  color: number,
  start: T.Vector3,
  end: T.Vector3,
  radius: number,
  part = "",
) {
  const delta = end.clone().sub(start);
  const object = mesh(
    parent,
    new T.CylinderGeometry(radius * 0.75, radius, delta.length(), 12, 1),
    color,
    [0, 0, 0],
    1,
    part,
  );
  object.position.copy(start).addScaledVector(delta, 0.5);
  object.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return object;
}
function tube(
  parent: T.Group,
  color: number,
  points: [number, number, number][],
  radius: number,
  part = "",
) {
  const curve = new T.CatmullRomCurve3(
    points.map((point) => new T.Vector3(...point)),
  );
  return mesh(
    parent,
    new T.TubeGeometry(curve, 28, radius, 7, false),
    color,
    [0, 0, 0],
    1,
    part,
  );
}
function leafSurface(
  parent: T.Group,
  color: number,
  width: number,
  length: number,
  part: string,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 18; row++) {
    const t = row / 18;
    const span =
      width * Math.sin(Math.PI * Math.pow(t, 0.87)) * (0.84 + 0.16 * t);
    for (let col = 0; col <= 10; col++) {
      const u = col / 5 - 1;
      vertices.push(
        u * span,
        t * length - length / 2,
        0.08 * Math.sin(Math.PI * t) * (1 - u * u) + 0.075 * u * u,
      );
      if (row && col) {
        const a = (row - 1) * 11 + col - 1,
          b = a + 11;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const surface = mesh(parent, geometry, color, [0, 0, 0], 1, part);
  tube(
    parent,
    new T.Color(color).multiplyScalar(0.7).getHex(),
    [
      [0, -length / 2, 0.11],
      [0, 0, 0.14],
      [0, length / 2, 0.06],
    ],
    0.014,
    `${part}-vein`,
  );
  for (const side of [-1, 1])
    for (let i = 1; i <= 5; i++) {
      const y = -length / 2 + (length * i) / 6;
      const t = i / 6;
      tube(
        parent,
        new T.Color(color).multiplyScalar(0.75).getHex(),
        [
          [0, y, 0.15],
          [side * width * 0.38, y + length * 0.08, 0.12],
          [
            side * width * Math.sin(Math.PI * t) * 0.82,
            y + length * 0.13,
            0.09,
          ],
        ],
        0.005,
        `${part}-vein`,
      );
    }
  return surface;
}
function macro(region: Region, shell: T.Group) {
  switch (region) {
    case "root": {
      tube(
        shell,
        0xa78262,
        [
          [0, 1.1, 0],
          [0, 0.35, 0],
          [-0.04, -0.4, 0],
          [0.06, -1.65, 0],
        ],
        0.11,
        "primary-root",
      );
      for (let i = 0; i < 14; i++) {
        const side = i % 2 ? 1 : -1,
          y = 0.3 - i * 0.13;
        tube(
          shell,
          0xc6a17b,
          [
            [side * 0.035, y, 0],
            [side * (0.23 + i * 0.013), y - 0.18, 0.05],
            [side * (0.53 + i * 0.02), y - 0.48, 0.04],
          ],
          0.025 + (i % 3) * 0.002,
          "lateral-root",
        );
        for (let h = 0; h < 4; h++)
          rod(
            shell,
            0xd8c4a6,
            new T.Vector3(side * (0.25 + h * 0.07), y - 0.22 - h * 0.04, 0.05),
            new T.Vector3(side * (0.31 + h * 0.08), y - 0.15 - h * 0.04, 0.14),
            0.004,
            "root-hair",
          );
      }
      break;
    }
    case "stem":
      tube(
        shell,
        0x4f986e,
        [
          [0, -1.22, 0],
          [0.01, -0.3, 0],
          [-0.02, 0.7, 0],
          [0, 1.55, 0],
        ],
        0.09,
        "stem-axis",
      );
      for (const y of [-0.52, 0.52, 1.12])
        ball(shell, 0x75b47c, [0, y, 0], [0.13, 0.08, 0.13], 1, "node");
      break;
    case "branch":
      tube(
        shell,
        0x638f62,
        [
          [-0.74, -0.5, 0],
          [-0.35, -0.22, 0],
          [0.1, 0.05, 0],
          [0.78, 0.38, 0],
        ],
        0.055,
        "branch-axis",
      );
      ball(
        shell,
        0x8cbb77,
        [0.73, 0.39, 0],
        [0.12, 0.13, 0.09],
        1,
        "axillary-bud",
      );
      break;
    case "leaf": {
      const leaf = new T.Group();
      shell.add(leaf);
      leaf.rotation.z = 0.85;
      leafSurface(leaf, 0x53b887, 0.46, 1.85, "leaf-blade");
      rod(
        shell,
        0x4d9674,
        new T.Vector3(1.5, -0.64, 0),
        new T.Vector3(0.7, -0.6, 0),
        0.025,
        "petiole",
      );
      for (const [x, y, rotation, scale] of [
        [2.47, 0.79, 0.78, 0.75],
        [2.15, -0.87, 0.83, 0.66],
        [-0.01, -1.12, 0.76, 0.57],
      ] as const) {
        const other = new T.Group();
        shell.add(other);
        other.position.set(x, y, -0.1);
        other.rotation.z = rotation;
        other.scale.setScalar(scale);
        leafSurface(
          other,
          y > 0 ? 0x48aa79 : 0x68bf85,
          0.46,
          1.85,
          "leaf-blade",
        );
      }
      rod(
        shell,
        0x4d9674,
        new T.Vector3(2.64, 0.22, 0),
        new T.Vector3(2.96, 0.27, 0),
        0.025,
        "petiole",
      );
      rod(
        shell,
        0x4d9674,
        new T.Vector3(1.5, -0.75, 0),
        new T.Vector3(2.61, -1.28, 0),
        0.022,
        "petiole",
      );
      rod(
        shell,
        0x4d9674,
        new T.Vector3(1.5, -0.8, 0),
        new T.Vector3(0.34, -1.5, 0),
        0.018,
        "petiole",
      );
      break;
    }
    case "sepal":
      for (let i = 0; i < 5; i++) {
        const group = new T.Group();
        shell.add(group);
        group.rotation.z = (i - 2) * 0.43;
        group.rotation.y = i * 1.26;
        group.position.set((i - 2) * 0.08, -0.25, -0.08);
        leafSurface(group, 0x3e9b74, 0.17, 0.78, "sepal-blade");
      }
      break;
    case "petal":
      for (let i = 0; i < 5; i++) {
        const group = new T.Group();
        shell.add(group);
        const theta = (i * Math.PI * 2) / 5;
        group.position.set(
          Math.sin(theta) * 0.46,
          Math.cos(theta) * 0.35,
          Math.sin(theta) * 0.16,
        );
        group.rotation.z = -theta;
        group.rotation.x = -0.22;
        leafSurface(
          group,
          i % 2 ? 0xffa29c : 0xf47d9e,
          0.34,
          0.9,
          "petal-lamina",
        );
      }
      break;
    case "stamen":
      for (let i = 0; i < 7; i++) {
        const theta = (i * Math.PI * 2) / 7;
        const x = Math.sin(theta) * 0.28,
          z = Math.cos(theta) * 0.28;
        rod(
          shell,
          0xe5ba72,
          new T.Vector3(x, -0.5, z),
          new T.Vector3(x * 1.25, 0.45, z * 1.25),
          0.012,
          "filament",
        );
        ball(
          shell,
          0xf4c75f,
          [x * 1.25, 0.53, z * 1.25],
          [0.055, 0.18, 0.07],
          1,
          "anther",
        );
      }
      break;
    case "pistil":
      ball(shell, 0x8bb875, [0, -0.31, 0], [0.25, 0.33, 0.22], 1, "ovary");
      rod(
        shell,
        0x9ebf8b,
        new T.Vector3(0, -0.06, 0),
        new T.Vector3(0, 0.58, 0),
        0.045,
        "style",
      );
      ball(shell, 0xb5c898, [0, 0.63, 0], [0.14, 0.08, 0.13], 1, "stigma");
      break;
  }
}
function tissue(region: Region, group: T.Group) {
  const ring = (
    radius: number,
    color: number,
    tubeRadius = 0.018,
    part = "",
  ) => {
    const object = mesh(
      group,
      new T.TorusGeometry(radius, tubeRadius, 9, 50),
      color,
      [0, 0, 0],
      1,
      part,
    );
    object.rotation.x = 0.18;
  };
  switch (region) {
    case "root":
      ring(0.72, 0xc9aa83, 0.04, "epidermis");
      ring(0.52, 0x9baa7a, 0.08, "cortex");
      ring(0.28, 0xdeb38b, 0.03, "endodermis");
      for (let i = 0; i < 5; i++) {
        const a = i * 1.256;
        ball(
          group,
          i % 2 ? 0xd6bd7b : 0x77bdc5,
          [Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0],
          [0.12, 0.09, 0.08],
          1,
          i % 2 ? "phloem" : "xylem",
        );
      }
      for (let i = 0; i < 18; i++) {
        const a = i * 0.349;
        rod(
          group,
          0xe2cdb0,
          new T.Vector3(Math.cos(a) * 0.73, Math.sin(a) * 0.73, 0),
          new T.Vector3(Math.cos(a) * 0.91, Math.sin(a) * 0.91, 0.02),
          0.006,
          "root-hair",
        );
      }
      break;
    case "stem":
    case "branch":
      ring(0.76, 0x66ac80, 0.055, "epidermis");
      ring(0.57, 0xc7c18d, 0.04, "cortex");
      ball(group, 0xe1d5a1, [0, 0, -0.09], [0.35, 0.35, 0.06], 1, "pith");
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        ball(
          group,
          0x80b9bd,
          [Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.1],
          [0.085, 0.12, 0.085],
          1,
          "xylem",
        );
        ball(
          group,
          0xdcb277,
          [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.13],
          [0.06, 0.08, 0.06],
          1,
          "phloem",
        );
      }
      break;
    case "leaf":
    case "sepal":
      mesh(
        group,
        new T.BoxGeometry(1.6, 0.08, 0.25),
        0x6db98e,
        [0, 0.55, 0],
        0.82,
        "upper-epidermis",
      );
      mesh(
        group,
        new T.BoxGeometry(1.6, 0.08, 0.25),
        0x68ac84,
        [0, -0.54, 0],
        0.82,
        "lower-epidermis",
      );
      for (let i = 0; i < 8; i++)
        ball(
          group,
          0x75bd78,
          [-0.69 + i * 0.2, 0.25, 0],
          [0.085, 0.24, 0.09],
          1,
          "palisade-mesophyll",
        );
      for (let i = 0; i < 11; i++)
        ball(
          group,
          0x91c9a1,
          [-0.72 + (i % 6) * 0.27, -0.14 - Math.floor(i / 6) * 0.17, 0],
          [0.12, 0.09, 0.09],
          1,
          "spongy-mesophyll",
        );
      ball(group, 0x78b9bf, [0, -0.2, 0.15], [0.13, 0.1, 0.11], 1, "vein");
      if (region === "leaf") {
        ball(
          group,
          0x54ad78,
          [0.4, -0.56, 0.13],
          [0.085, 0.06, 0.05],
          1,
          "guard-cell",
        );
        ball(
          group,
          0x54ad78,
          [0.62, -0.56, 0.13],
          [0.085, 0.06, 0.05],
          1,
          "guard-cell",
        );
      }
      break;
    case "petal":
      mesh(
        group,
        new T.BoxGeometry(1.65, 0.12, 0.2),
        0xe887a2,
        [0, -0.33, 0],
        0.75,
        "inner-tissue",
      );
      for (let i = 0; i < 12; i++) {
        const x = -0.71 + i * 0.13;
        ball(
          group,
          i % 2 ? 0xf1a2b3 : 0xd65e9e,
          [x, 0.1, 0],
          [0.07, 0.29 + (i % 3) * 0.03, 0.08],
          1,
          "epidermal-papilla",
        );
      }
      break;
    case "stamen":
      for (const x of [-0.36, 0.36])
        for (const y of [-0.34, 0.34]) {
          ball(
            group,
            0xe5ad5f,
            [x, y, -0.1],
            [0.32, 0.28, 0.12],
            0.58,
            "pollen-sac",
          );
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05;
            ball(
              group,
              0xf6d473,
              [x + Math.cos(a) * 0.18, y + Math.sin(a) * 0.15, 0.1],
              [0.045, 0.045, 0.045],
              1,
              "pollen-grain",
            );
          }
        }
      break;
    case "pistil":
      ball(
        group,
        0xaac68f,
        [0, 0, -0.12],
        [0.68, 0.76, 0.24],
        0.28,
        "ovary-wall",
      );
      for (const x of [-0.3, 0.3])
        for (const y of [-0.33, 0.24]) {
          ball(group, 0xd7bd9b, [x, y, 0.1], [0.16, 0.22, 0.1], 1, "ovule");
          ball(
            group,
            0xc895b6,
            [x, y, 0.2],
            [0.07, 0.11, 0.035],
            1,
            "embryo-sac",
          );
        }
      break;
  }
}
function cell(region: Region, group: T.Group) {
  switch (region) {
    case "root":
      ball(group, 0xdebda2, [0, 0, 0], [0.43, 0.63, 0.32], 0.28, "cell-wall");
      tube(
        group,
        0xc7a57e,
        [
          [0.34, 0.25, 0],
          [0.58, 0.39, 0.03],
          [0.93, 0.43, 0.05],
        ],
        0.055,
        "root-hair",
      );
      ball(
        group,
        0x9bbdab,
        [-0.04, 0, 0.08],
        [0.31, 0.43, 0.23],
        0.45,
        "vacuole",
      );
      ball(
        group,
        0x88a3b8,
        [-0.2, -0.36, 0.19],
        [0.075, 0.075, 0.06],
        1,
        "nucleus",
      );
      break;
    case "stem":
      mesh(
        group,
        new T.CylinderGeometry(0.41, 0.41, 1.25, 26, 1, true),
        0xc69e76,
        [0, 0, 0],
        0.5,
        "secondary-wall",
      );
      for (const y of [-0.52, -0.18, 0.18, 0.52]) {
        const r = mesh(
          group,
          new T.TorusGeometry(0.42, 0.047, 8, 32),
          0xb77f60,
          [0, y, 0],
          1,
          "secondary-wall",
        );
        r.rotation.x = Math.PI / 2;
      }
      break;
    case "branch":
      mesh(
        group,
        new T.CylinderGeometry(0.35, 0.35, 1.2, 24, 1, true),
        0xd2b88d,
        [0, 0, 0],
        0.36,
        "sieve-tube",
      );
      ball(
        group,
        0x9fc29a,
        [0.47, 0, 0],
        [0.16, 0.51, 0.18],
        0.8,
        "companion-cell",
      );
      for (const y of [-0.55, 0.55]) {
        const disk = mesh(
          group,
          new T.CircleGeometry(0.35, 30),
          0xe5ca95,
          [0, y, 0],
          0.63,
          "sieve-plate",
        );
        disk.rotation.x = Math.PI / 2;
      }
      break;
    case "leaf":
    case "sepal":
      ball(group, 0x8dcaa2, [0, 0, 0], [0.55, 0.68, 0.36], 0.27, "cell-wall");
      ball(group, 0xa8d2ba, [0, 0, 0.05], [0.38, 0.5, 0.23], 0.3, "vacuole");
      for (let i = 0; i < 14; i++) {
        const a = (i * Math.PI * 2) / 14;
        ball(
          group,
          0x3eaa74,
          [Math.cos(a) * 0.42, Math.sin(a) * 0.52, 0.12],
          [0.065, 0.035, 0.025],
          1,
          "chloroplast",
        );
      }
      break;
    case "petal":
      ball(
        group,
        0xf3afc3,
        [0, -0.05, 0],
        [0.49, 0.62, 0.32],
        0.36,
        "cell-wall",
      );
      ball(
        group,
        0xc25b9e,
        [0, -0.04, 0.1],
        [0.33, 0.41, 0.2],
        0.67,
        "vacuole",
      );
      const tip = mesh(
        group,
        new T.ConeGeometry(0.27, 0.43, 18),
        0xef95bb,
        [0, 0.65, 0],
        0.72,
        "papilla-tip",
      );
      tip.rotation.z = 0.07;
      break;
    case "stamen":
      ball(group, 0xf2ca68, [0, 0, 0], [0.53, 0.57, 0.46], 0.32, "exine");
      ball(group, 0xf8dd8d, [0, 0, 0], [0.42, 0.46, 0.35], 0.68, "intine");
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4,
          y = 1 - (2 * (i + 0.5)) / 26,
          r = Math.sqrt(1 - y * y);
        ball(
          group,
          0xe5a94b,
          [Math.cos(a) * r * 0.53, y * 0.57, Math.sin(a) * r * 0.46],
          [0.03, 0.03, 0.03],
          1,
          "exine-ornament",
        );
      }
      break;
    case "pistil":
      ball(group, 0xd7c3aa, [0, 0, 0], [0.51, 0.68, 0.36], 0.31, "integument");
      ball(
        group,
        0xb881b6,
        [0, 0, 0.09],
        [0.3, 0.48, 0.25],
        0.44,
        "embryo-sac",
      );
      ball(
        group,
        0xf2c5ba,
        [0, -0.29, 0.27],
        [0.12, 0.11, 0.08],
        1,
        "egg-cell",
      );
      ball(
        group,
        0xf3d5ac,
        [0, 0.05, 0.26],
        [0.19, 0.17, 0.08],
        1,
        "central-cell",
      );
      break;
  }
}
function interior(region: Region, group: T.Group) {
  switch (region) {
    case "root":
      ball(group, 0xc59f7b, [0, 0, 0], [0.66, 0.75, 0.2], 0.23, "cell-wall");
      ball(group, 0x95b8aa, [0, 0, 0.12], [0.43, 0.54, 0.15], 0.55, "vacuole");
      ball(
        group,
        0x7c97b4,
        [-0.38, -0.42, 0.23],
        [0.1, 0.1, 0.07],
        1,
        "nucleus",
      );
      break;
    case "stem":
      mesh(
        group,
        new T.CylinderGeometry(0.57, 0.57, 0.35, 32, 1, true),
        0xb77d5f,
        [0, 0, -0.15],
        0.55,
        "wall",
      );
      for (let i = 0; i < 11; i++) {
        const a = (i * Math.PI * 2) / 11;
        ball(
          group,
          0x68bdd4,
          [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.16],
          [0.045, 0.045, 0.04],
          1,
          "water-route",
        );
      }
      break;
    case "branch":
      ball(
        group,
        0xd4bb8f,
        [-0.19, 0, 0],
        [0.37, 0.6, 0.21],
        0.32,
        "sieve-tube",
      );
      ball(
        group,
        0x91bd8d,
        [0.44, 0, 0],
        [0.25, 0.48, 0.2],
        0.8,
        "companion-cell",
      );
      for (let i = 0; i < 10; i++) {
        const a = i * 0.628;
        ball(
          group,
          0xb2946b,
          [-0.2 + Math.cos(a) * 0.27, Math.sin(a) * 0.48, 0.22],
          [0.035, 0.035, 0.025],
          1,
          "sieve-pore",
        );
      }
      break;
    case "leaf":
    case "sepal":
      ball(group, 0x9acbaa, [0, 0, 0], [0.75, 0.68, 0.16], 0.24, "cell-wall");
      ball(group, 0xb0d9bb, [0, 0, 0.11], [0.42, 0.42, 0.12], 0.42, "vacuole");
      for (let i = 0; i < 18; i++) {
        const a = (i * Math.PI * 2) / 18;
        const o = ball(
          group,
          0x3aa66e,
          [Math.cos(a) * 0.59, Math.sin(a) * 0.48, 0.15],
          [0.09, 0.05, 0.025],
          1,
          "chloroplast",
        );
        o.rotation.z = a;
      }
      break;
    case "petal":
      ball(group, 0xe8a7c1, [0, 0, 0], [0.75, 0.68, 0.17], 0.22, "tonoplast");
      ball(
        group,
        0xa64286,
        [0, 0, 0.12],
        [0.55, 0.48, 0.11],
        0.65,
        "pigment-compartment",
      );
      for (let i = 0; i < 20; i++) {
        const a = i * 2.4;
        ball(
          group,
          0xcf4d96,
          [
            Math.cos(a) * (0.13 + (i % 5) * 0.08),
            Math.sin(a) * (0.13 + (i % 4) * 0.07),
            0.25,
          ],
          [0.024, 0.024, 0.02],
          1,
          "pigment-marker",
        );
      }
      break;
    case "stamen":
      ball(group, 0xe8bc66, [0, 0, 0], [0.7, 0.69, 0.17], 0.22, "exine");
      ball(group, 0xf7da8b, [0, 0, 0.1], [0.56, 0.55, 0.13], 0.3, "intine");
      ball(
        group,
        0xb8a1ba,
        [-0.2, 0.08, 0.25],
        [0.15, 0.18, 0.08],
        1,
        "vegetative-nucleus",
      );
      ball(
        group,
        0xc89992,
        [0.23, -0.1, 0.25],
        [0.1, 0.12, 0.06],
        1,
        "generative-cell",
      );
      break;
    case "pistil":
      ball(group, 0xbc8bb5, [0, 0, 0], [0.72, 0.58, 0.17], 0.22, "embryo-sac");
      ball(group, 0xf0bdb6, [0, -0.31, 0.2], [0.16, 0.14, 0.08], 1, "egg-cell");
      ball(
        group,
        0xf3d7ac,
        [0, 0.06, 0.21],
        [0.26, 0.22, 0.08],
        1,
        "central-cell",
      );
      for (const x of [-0.25, 0.25])
        ball(
          group,
          0xf5c7c2,
          [x, -0.27, 0.19],
          [0.08, 0.09, 0.06],
          1,
          "synergid",
        );
      break;
  }
}
function alternateCell(region: Region, group: T.Group) {
  if (["root", "branch", "sepal", "petal"].includes(region)) {
    cell("stem", group);
    return;
  }
  if (region === "stem") {
    cell("branch", group);
    return;
  }
  if (region === "leaf") {
    for (const side of [-1, 1]) {
      const guard = ball(
        group,
        0x5eb985,
        [side * 0.3, 0, 0],
        [0.23, 0.6, 0.19],
        0.8,
        "guard-cell",
      );
      guard.rotation.z = side * -0.16;
      for (let i = 0; i < 5; i++)
        ball(
          group,
          0x29845a,
          [side * 0.3 + Math.sin(i * 1.8) * 0.08, -0.39 + i * 0.19, 0.2],
          [0.035, 0.03, 0.018],
          1,
          "guard-chloroplast",
        );
    }
    return;
  }
  if (region === "stamen") {
    ball(group, 0xe1b681, [0, 0, 0], [0.56, 0.63, 0.32], 0.38, "tapetal-wall");
    ball(group, 0xcaa68f, [0, 0, 0.07], [0.39, 0.45, 0.2], 0.55, "cytoplasm");
    ball(
      group,
      0x967aaf,
      [-0.12, 0.06, 0.26],
      [0.13, 0.15, 0.06],
      1,
      "nucleus",
    );
    return;
  }
  ball(
    group,
    0xb0bc92,
    [0, 0, 0],
    [0.43, 0.69, 0.33],
    0.36,
    "transmitting-cell",
  );
  ball(group, 0x99ab83, [0, 0, 0.09], [0.28, 0.52, 0.21], 0.46, "vacuole");
  tube(
    group,
    0xe7ae7c,
    [
      [-0.8, -0.48, 0.25],
      [-0.45, -0.2, 0.28],
      [0, 0.02, 0.3],
      [0.55, 0.45, 0.25],
    ],
    0.045,
    "pollen-tube-path",
  );
}
function alternateInterior(region: Region, group: T.Group) {
  if (["root", "branch", "sepal", "petal"].includes(region)) {
    interior("stem", group);
    return;
  }
  if (region === "stem") {
    interior("branch", group);
    return;
  }
  if (region === "leaf") {
    for (const side of [-1, 1]) {
      const guard = ball(
        group,
        0x72bf91,
        [side * 0.37, 0, 0],
        [0.29, 0.67, 0.17],
        0.82,
        "guard-cell",
      );
      guard.rotation.z = side * -0.17;
    }
    tube(
      group,
      0x8dd7bd,
      [
        [0, -0.72, 0.16],
        [0, 0, 0.16],
        [0, 0.72, 0.16],
      ],
      0.008,
      "stomatal-aperture",
    );
    return;
  }
  if (region === "stamen") {
    ball(group, 0xe3bd90, [0, 0, 0], [0.72, 0.65, 0.15], 0.28, "tapetal-wall");
    ball(
      group,
      0xb99ab1,
      [-0.14, 0.06, 0.19],
      [0.17, 0.18, 0.07],
      1,
      "nucleus",
    );
    for (let i = 0; i < 13; i++) {
      const a = i * 2.2;
      ball(
        group,
        0xe7c984,
        [Math.cos(a) * 0.42, Math.sin(a) * 0.39, 0.2],
        [0.045, 0.035, 0.02],
        1,
        "cytoplasmic-compartment",
      );
    }
    return;
  }
  for (let i = -3; i <= 3; i++)
    ball(
      group,
      0x98b58f,
      [i * 0.2, i % 2 ? 0.19 : -0.2, 0],
      [0.12, 0.31, 0.12],
      0.72,
      "transmitting-tissue",
    );
  tube(
    group,
    0xe7a477,
    [
      [-0.83, -0.62, 0.24],
      [-0.44, -0.31, 0.23],
      [0, 0.08, 0.24],
      [0.38, 0.31, 0.22],
      [0.83, 0.65, 0.24],
    ],
    0.055,
    "pollen-tube-path",
  );
}
export function createSpatialModel(region: Region): SpatialModel {
  const root = new T.Group();
  root.userData.region = region;
  const shell = new T.Group(),
    tissueGroup = new T.Group(),
    cellGroup = new T.Group(),
    interiorGroup = new T.Group(),
    altCellGroup = new T.Group(),
    altInteriorGroup = new T.Group();
  for (const group of [
    shell,
    tissueGroup,
    cellGroup,
    interiorGroup,
    altCellGroup,
    altInteriorGroup,
  ])
    root.add(group);
  macro(region, shell);
  tissue(region, tissueGroup);
  cell(region, cellGroup);
  interior(region, interiorGroup);
  alternateCell(region, altCellGroup);
  alternateInterior(region, altInteriorGroup);
  const anchor = new T.Vector3(...ANCHORS[region]);
  root.position.copy(anchor);
  return {
    region,
    root,
    shell,
    tissue: tissueGroup,
    cell: cellGroup,
    interior: interiorGroup,
    alternateCell: altCellGroup,
    alternateInterior: altInteriorGroup,
    anchor,
    tint: PALETTE[region],
  };
}
export function setLayerOpacity(group: T.Group, opacity: number) {
  group.visible = opacity > 0.005;
  group.traverse((object) => {
    if (object instanceof T.Mesh) {
      const material = object.material as T.MeshPhongMaterial;
      material.opacity = (material.userData.baseOpacity as number) * opacity;
      material.depthWrite = material.opacity > 0.97;
    }
  });
}
export function disposeSpatialModel(model: SpatialModel) {
  model.root.traverse((object) => {
    if (object instanceof T.Mesh) {
      object.geometry.dispose();
      (object.material as T.Material).dispose();
    }
  });
}
