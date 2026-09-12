import { useEffect, useRef, useState } from "react";
import * as T from "three";
import {
  createSpatialModel,
  disposeSpatialModel,
  setLayerOpacity,
} from "./spatialGeometry";
import { REGIONS, routeFromPart, type Region } from "../lib/spatialAtlas";

export interface SpatialView {
  focus: Region | null;
  depth: number;
  part: string | null;
  route: "primary" | "alternate";
}
export interface SpatialSceneHandle {
  snapshot(): string;
  reset(): void;
}
interface Props {
  view: SpatialView;
  onChange(change: Partial<SpatialView>): void;
  onHover(region: Region | null, part: string | null): void;
  onReady(handle: SpatialSceneHandle | null): void;
  dark: boolean;
  es: boolean;
}
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const smooth = (n: number) => {
  const x = clamp(n, 0, 1);
  return x * x * (3 - 2 * x);
};
const spread: Record<Region, T.Vector3> = {
  root: new T.Vector3(-2.8, -1.45, 0),
  stem: new T.Vector3(-0.95, -1.45, 0),
  branch: new T.Vector3(0.92, -1.45, 0),
  leaf: new T.Vector3(2.7, -1.45, 0),
  sepal: new T.Vector3(-2.8, 1.1, 0),
  petal: new T.Vector3(-0.95, 1.1, 0),
  stamen: new T.Vector3(0.92, 1.1, 0),
  pistil: new T.Vector3(2.7, 1.1, 0),
};
const PIN_NAMES: Record<string, [string, string]> = {
  root: ["ROOT", "RAÍZ"],
  stem: ["STEM", "TALLO"],
  leaf: ["LEAF", "HOJA"],
  petal: ["FLOWER", "FLOR"],
  "primary-root": ["PRIMARY ROOT", "RAÍZ PRIMARIA"],
  "lateral-root": ["LATERAL ROOT", "RAÍZ LATERAL"],
  "root-hair": ["ROOT HAIR", "PELO RADICAL"],
  "stem-axis": ["STEM AXIS", "EJE DEL TALLO"],
  node: ["NODE", "NUDO"],
  "branch-axis": ["BRANCH", "RAMA"],
  "axillary-bud": ["AXILLARY BUD", "YEMA AXILAR"],
  "leaf-blade": ["BLADE", "LÁMINA"],
  "leaf-blade-vein": ["VEIN", "NERVADURA"],
  petiole: ["PETIOLE", "PECÍOLO"],
  "sepal-blade": ["SEPAL", "SÉPALO"],
  "sepal-blade-vein": ["VEIN", "NERVADURA"],
  "petal-lamina": ["PETAL", "PÉTALO"],
  "petal-lamina-vein": ["VEIN", "NERVADURA"],
  anther: ["ANTHER", "ANTERA"],
  filament: ["FILAMENT", "FILAMENTO"],
  ovary: ["OVARY", "OVARIO"],
  style: ["STYLE", "ESTILO"],
  stigma: ["STIGMA", "ESTIGMA"],
  epidermis: ["EPIDERMIS", "EPIDERMIS"],
  cortex: ["CORTEX", "CORTEZA"],
  xylem: ["XYLEM", "XILEMA"],
  phloem: ["PHLOEM", "FLOEMA"],
  "upper-epidermis": ["UPPER SKIN", "EPIDERMIS SUPERIOR"],
  "palisade-mesophyll": ["PALISADE", "EMPALIZADA"],
  "spongy-mesophyll": ["SPONGY LAYER", "CAPA ESPONJOSA"],
  "epidermal-papilla": ["PAPILLA", "PAPILA"],
  "inner-tissue": ["INNER TISSUE", "TEJIDO INTERNO"],
  "pollen-sac": ["POLLEN SAC", "SACO POLÍNICO"],
  "pollen-grain": ["POLLEN", "POLEN"],
  ovule: ["OVULE", "ÓVULO"],
  "embryo-sac": ["EMBRYO SAC", "SACO EMBRIONARIO"],
  "cell-wall": ["CELL WALL", "PARED CELULAR"],
  vacuole: ["VACUOLE", "VACUOLA"],
  chloroplast: ["CHLOROPLAST", "CLOROPLASTO"],
  nucleus: ["NUCLEUS", "NÚCLEO"],
  "root-hair-cell": ["ROOT HAIR", "PELO RADICAL"],
  "secondary-wall": ["VESSEL WALL", "PARED DEL VASO"],
  "sieve-tube": ["SIEVE TUBE", "TUBO CRIBOSO"],
  "companion-cell": ["COMPANION CELL", "CÉLULA ACOMPAÑANTE"],
  "papilla-tip": ["PAPILLA TIP", "PUNTA DE PAPILA"],
  exine: ["EXINE", "EXINA"],
  intine: ["INTINE", "INTINA"],
  integument: ["INTEGUMENT", "TEGUMENTO"],
  "egg-cell": ["EGG CELL", "OVOCÉLULA"],
  wall: ["VESSEL WALL", "PARED DEL VASO"],
  "water-route": ["WATER ROUTE", "RUTA DEL AGUA"],
  "sieve-pore": ["SIEVE PORE", "PORO CRIBOSO"],
  "pigment-compartment": ["PIGMENT VACUOLE", "VACUOLA PIGMENTADA"],
  "vegetative-nucleus": ["VEGETATIVE NUCLEUS", "NÚCLEO VEGETATIVO"],
  "central-cell": ["CENTRAL CELL", "CÉLULA CENTRAL"],
  "guard-cell": ["GUARD CELL", "CÉLULA OCLUSIVA"],
  "stomatal-aperture": ["STOMA", "ESTOMA"],
  "pollen-tube-path": ["POLLEN TUBE", "TUBO POLÍNICO"],
};
const PINS: Record<Region, [string[], string[], string[], string[]]> = {
  root: [
    ["primary-root", "lateral-root", "root-hair"],
    ["epidermis", "cortex", "xylem"],
    ["cell-wall", "root-hair", "vacuole"],
    ["cell-wall", "vacuole", "nucleus"],
  ],
  stem: [
    ["stem-axis", "node"],
    ["epidermis", "xylem", "phloem"],
    ["secondary-wall"],
    ["water-route"],
  ],
  branch: [
    ["branch-axis", "axillary-bud"],
    ["epidermis", "xylem", "phloem"],
    ["sieve-tube", "companion-cell"],
    ["sieve-tube", "companion-cell", "sieve-pore"],
  ],
  leaf: [
    ["leaf-blade", "leaf-blade-vein", "petiole"],
    ["upper-epidermis", "palisade-mesophyll", "spongy-mesophyll"],
    ["cell-wall", "vacuole", "chloroplast"],
    ["cell-wall", "vacuole", "chloroplast"],
  ],
  sepal: [
    ["sepal-blade", "sepal-blade-vein"],
    ["upper-epidermis", "palisade-mesophyll"],
    ["cell-wall", "vacuole", "chloroplast"],
    ["cell-wall", "vacuole", "chloroplast"],
  ],
  petal: [
    ["petal-lamina", "petal-lamina-vein"],
    ["epidermal-papilla", "inner-tissue"],
    ["cell-wall", "vacuole", "papilla-tip"],
    ["pigment-compartment"],
  ],
  stamen: [
    ["anther", "filament"],
    ["pollen-sac", "pollen-grain"],
    ["exine", "intine"],
    ["exine", "vegetative-nucleus"],
  ],
  pistil: [
    ["ovary", "style", "stigma"],
    ["ovule", "embryo-sac"],
    ["integument", "embryo-sac", "egg-cell"],
    ["embryo-sac", "egg-cell", "central-cell"],
  ],
};
const ALT_PINS: Partial<Record<Region, [string[], string[]]>> = {
  root: [["secondary-wall"], ["wall", "water-route"]],
  branch: [["secondary-wall"], ["wall", "water-route"]],
  leaf: [["guard-cell"], ["guard-cell", "stomatal-aperture"]],
  sepal: [["secondary-wall"], ["wall", "water-route"]],
  petal: [["secondary-wall"], ["wall", "water-route"]],
  stamen: [["nucleus"], ["nucleus"]],
  pistil: [["pollen-tube-path"], ["pollen-tube-path"]],
  stem: [
    ["sieve-tube", "companion-cell"],
    ["sieve-tube", "sieve-pore"],
  ],
};
export function SpatialScene(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.domElement.dataset.testid = "spatial-canvas";
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.002, 120);
    const ambient = new T.HemisphereLight(0xf7f4dd, 0x314b45, 0.9);
    const key = new T.DirectionalLight(0xffecd7, 1.65);
    key.position.set(3, 7, 8);
    const rim = new T.DirectionalLight(0x92d4d2, 0.7);
    rim.position.set(-6, 2, -4);
    scene.add(ambient, key, rim);
    const models = Object.fromEntries(
      REGIONS.map((region) => [region, createSpatialModel(region)]),
    ) as Record<Region, ReturnType<typeof createSpatialModel>>;
    for (const region of REGIONS) scene.add(models[region].root);
    const ray = new T.Raycaster(),
      pointer = new T.Vector2();
    const pinElements = [
      ...(pinsRef.current?.querySelectorAll<HTMLElement>(".spatial-pin") ?? []),
    ];
    const tagged = (group: T.Group, part: string) => {
      let found: T.Object3D | null = null;
      group.traverse((object) => {
        if (!found && object.userData.partId === part) found = object;
      });
      return found;
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let drag = false,
      start = { x: 0, y: 0 },
      lastPinch = 0,
      angle = 0.18,
      tilt = 0.16;
    let lastHover: { region: Region; part: string | null } | null = null;
    let currentDepth = latest.current.view.depth,
      last = performance.now(),
      frame = 0,
      disposed = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const ndc = (x: number, y: number) => {
      const rect = host.getBoundingClientRect();
      pointer.set(
        ((x - rect.left) / rect.width) * 2 - 1,
        1 - ((y - rect.top) / rect.height) * 2,
      );
    };
    const hit = () => {
      ray.setFromCamera(pointer, camera);
      const targets = REGIONS.flatMap((region) => {
        const model = models[region];
        if (!model.root.visible) return [];
        const focused = latest.current.view.focus === region;
        if (!focused) return [model.shell];
        if (latest.current.view.depth > 2.35)
          return [
            model.interior,
            model.alternateInterior,
            model.cell,
            model.alternateCell,
          ];
        if (latest.current.view.depth > 1.05)
          return [model.tissue, model.cell, model.alternateCell];
        return [model.shell, model.tissue];
      });
      for (const contact of ray.intersectObjects(targets, true)) {
        let obj: T.Object3D | null = contact.object,
          region: Region | null = null,
          part: string | null = null;
        let hidden = false;
        while (obj) {
          if (!obj.visible) hidden = true;
          if (
            !part &&
            typeof obj.userData.partId === "string" &&
            obj.userData.partId
          )
            part = obj.userData.partId;
          if (obj.userData.region) region = obj.userData.region as Region;
          obj = obj.parent;
        }
        if (!hidden && region) return { region, part };
      }
      return null;
    };
    const zoom = (amount: number, select: boolean) => {
      const view = latest.current.view;
      const under = select && amount > 0 ? (hit() ?? lastHover) : null;
      host.dataset.lastWheelHit = under?.region ?? "none";
      const focus = under?.region ?? view.focus;
      const next = clamp(view.depth + amount, 0, focus ? 3.75 : 1.12);
      const route =
        under && view.depth < 2.1
          ? routeFromPart(under.region, under.part)
          : view.route;
      latest.current.onChange({
        focus,
        depth: next,
        route,
        ...(under ? { part: under.part } : {}),
      });
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      ndc(event.clientX, event.clientY);
      const pixels =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? host.clientHeight
            : 1);
      zoom(-pixels * 0.00165, true);
    };
    const down = (event: PointerEvent) => {
      host.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      start = { x: event.clientX, y: event.clientY };
      drag = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
        ndc((a.x + b.x) / 2, (a.y + b.y) / 2);
      } else ndc(event.clientX, event.clientY);
    };
    const move = (event: PointerEvent) => {
      const old = pointers.get(event.pointerId);
      ndc(event.clientX, event.clientY);
      if (!old) {
        const target = hit();
        lastHover = target;
        latest.current.onHover(target?.region ?? null, target?.part ?? null);
        host.style.cursor = target ? "zoom-in" : "grab";
        return;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        ndc((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (lastPinch > 4 && distance > 4)
          zoom(Math.log(distance / lastPinch) * 1.7, true);
        lastPinch = distance;
        drag = true;
      } else {
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5)
          drag = true;
        angle -= (event.clientX - old.x) * 0.006;
        tilt = clamp(tilt + (event.clientY - old.y) * 0.005, -0.85, 0.95);
      }
    };
    const up = (event: PointerEvent) => {
      ndc(event.clientX, event.clientY);
      if (!drag && pointers.size === 1) {
        const target = hit();
        if (target)
          latest.current.onChange({
            focus: target.region,
            depth: Math.max(latest.current.view.depth, 0.3),
            part: target.part,
            route: routeFromPart(target.region, target.part),
          });
        else if (latest.current.view.depth < 1.15)
          latest.current.onChange({
            focus: null,
            part: null,
            route: "primary",
          });
      }
      pointers.delete(event.pointerId);
      if (host.hasPointerCapture(event.pointerId))
        host.releasePointerCapture(event.pointerId);
      if (pointers.size < 2) lastPinch = 0;
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        !["+", "=", "-", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === "Home" || event.key === "Escape")
        latest.current.onChange({
          focus: null,
          depth: 0,
          part: null,
          route: "primary",
        });
      else
        zoom(["+", "=", "ArrowUp"].includes(event.key) ? 0.22 : -0.22, false);
    };
    const resize = () => {
      const width = Math.max(host.clientWidth, 1),
        height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    host.addEventListener("wheel", wheel, { passive: false });
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);
    host.addEventListener("keydown", keydown);
    latest.current.onReady({
      snapshot: () => renderer.domElement.toDataURL("image/png"),
      reset: () =>
        latest.current.onChange({
          focus: null,
          depth: 0,
          part: null,
          route: "primary",
        }),
    });
    const draw = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < 25) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const { view, dark } = latest.current;
      currentDepth = motion.matches
        ? view.depth
        : currentDepth +
          (view.depth - currentDepth) * (1 - Math.exp(-dt * 7.5));
      if (Math.abs(currentDepth - view.depth) < 0.0003)
        currentDepth = view.depth;
      const focus = view.focus;
      const unfold = smooth(currentDepth / 1.05);
      for (const region of REGIONS) {
        const model = models[region],
          active = region === focus;
        const target = focus
          ? active
            ? new T.Vector3(0, 0, 0)
            : spread[region].clone().multiplyScalar(1.6)
          : spread[region];
        model.root.position.copy(model.anchor).lerp(target, unfold);
        model.root.visible = !focus || active || currentDepth < 1.55;
        const otherFade =
          focus && !active ? 1 - smooth((currentDepth - 0.48) / 0.9) : 1;
        const shell =
          focus && active ? 1 - smooth((currentDepth - 0.95) / 1.42) : 1;
        setLayerOpacity(model.shell, shell * otherFade);
        setLayerOpacity(
          model.tissue,
          active
            ? smooth((currentDepth - 0.45) / 0.95) *
                (1 - smooth((currentDepth - 1.86) / 1.12))
            : 0,
        );
        const cellOpacity = active
          ? smooth((currentDepth - 1.25) / 0.88) *
            (1 - smooth((currentDepth - 2.68) / 0.94))
          : 0;
        setLayerOpacity(model.cell, view.route === "primary" ? cellOpacity : 0);
        setLayerOpacity(
          model.alternateCell,
          view.route === "alternate" ? cellOpacity : 0,
        );
        const interiorOpacity = active
          ? smooth((currentDepth - 2.28) / 0.9)
          : 0;
        setLayerOpacity(
          model.interior,
          view.route === "primary" ? interiorOpacity : 0,
        );
        setLayerOpacity(
          model.alternateInterior,
          view.route === "alternate" ? interiorOpacity : 0,
        );
        model.tissue.scale.setScalar(
          0.43 + 0.78 * smooth((currentDepth - 0.48) / 1.28),
        );
        model.cell.scale.setScalar(
          0.28 + 1.12 * smooth((currentDepth - 1.36) / 1.18),
        );
        model.interior.scale.setScalar(
          0.22 + 1.3 * smooth((currentDepth - 2.38) / 1.2),
        );
        model.alternateCell.scale.copy(model.cell.scale);
        model.alternateInterior.scale.copy(model.interior.scale);
        model.tissue.position.z =
          0.18 + 0.24 * smooth((currentDepth - 0.5) / 1.3);
        model.cell.position.z =
          0.38 + 0.19 * smooth((currentDepth - 1.3) / 1.2);
        model.interior.position.z =
          0.55 + 0.12 * smooth((currentDepth - 2.4) / 1.1);
        model.alternateCell.position.copy(model.cell.position);
        model.alternateInterior.position.copy(model.interior.position);
      }
      const radius = focus
        ? Math.exp(
            Math.log(9.9) * (1 - currentDepth / 3.75) +
              Math.log(4.25) * (currentDepth / 3.75),
          )
        : 9.9 + currentDepth * 0.15;
      const distance = radius / Math.min(1, camera.aspect * 1.1);
      const center = focus
        ? new T.Vector3(0, 0, 0.08)
        : new T.Vector3(0, 0.08, 0);
      const direction = new T.Vector3(
        Math.sin(angle) * Math.cos(tilt),
        Math.sin(tilt),
        Math.cos(angle) * Math.cos(tilt),
      );
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.lookAt(center);
      ambient.intensity = dark ? 0.75 : 0.9;
      renderer.render(scene, camera);
      const pinTargets: { key: string; object: T.Object3D }[] = [];
      if (!focus) {
        for (const region of ["root", "stem", "leaf", "petal"] as const)
          pinTargets.push({ key: region, object: models[region].root });
      } else {
        const stage =
          currentDepth < 1.15
            ? 0
            : currentDepth < 2.12
              ? 1
              : currentDepth < 3.0
                ? 2
                : 3;
        const model = models[focus];
        const group =
          stage === 0
            ? model.shell
            : stage === 1
              ? model.tissue
              : stage === 2
                ? view.route === "alternate"
                  ? model.alternateCell
                  : model.cell
                : view.route === "alternate"
                  ? model.alternateInterior
                  : model.interior;
        const keys =
          view.route === "alternate" && stage >= 2
            ? (ALT_PINS[focus]?.[stage - 2] ?? PINS[focus][stage])
            : PINS[focus][stage];
        for (const part of keys) {
          const object = tagged(group, part);
          if (object) pinTargets.push({ key: part, object });
        }
      }
      pinElements.forEach((element, index) => {
        const target = pinTargets[index];
        if (!target) {
          element.style.display = "none";
          return;
        }
        const point = target.object
          .getWorldPosition(new T.Vector3())
          .project(camera);
        if (
          point.z < -1 ||
          point.z > 1 ||
          Math.abs(point.x) > 0.91 ||
          Math.abs(point.y) > 0.86
        ) {
          element.style.display = "none";
          return;
        }
        element.style.display = "flex";
        element.style.left = `${((point.x + 1) * 50).toFixed(2)}%`;
        element.style.top = `${((1 - point.y) * 50).toFixed(2)}%`;
        element.textContent =
          PIN_NAMES[target.key]?.[latest.current.es ? 1 : 0] ??
          target.key.replaceAll("-", " ").toUpperCase();
      });
      host.dataset.focus = focus ?? "overview";
      host.dataset.route = view.route;
      host.dataset.depth = currentDepth.toFixed(3);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.visible = REGIONS.filter(
        (region) => models[region].root.visible,
      ).join(",");
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("wheel", wheel);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("keydown", keydown);
      latest.current.onReady(null);
      for (const region of REGIONS) disposeSpatialModel(models[region]);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={hostRef}
      className="spatial-canvas"
      tabIndex={0}
      role="region"
      aria-label="Interactive plant. Point and scroll or pinch to explore a part; drag to orbit; Home resets."
    >
      <div ref={pinsRef} className="spatial-pin-layer" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="spatial-pin" />
        ))}
      </div>
      {error && (
        <div className="spatial-graphics-error" role="alert">
          3D graphics are unavailable. The anatomy descriptions and organ
          navigation remain accessible.
        </div>
      )}
    </div>
  );
}
