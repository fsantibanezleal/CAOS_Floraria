import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useShellLang, useThemeStore } from "@fasl-work/caos-app-shell";
import type { Catalog, Specimen } from "../lib/catalog.types";
import { resolveAssetUrl } from "../lib/catalog";
import type { AtlasState, CameraPreset } from "../lib/state";
import {
  createBotanicalModel,
  disposeObject,
  type BotanicalModel,
} from "./botany";

export interface ViewerHandle {
  home: () => void;
  focus: () => void;
  snapshot: () => string;
  rotate: () => void;
}
interface Props {
  catalog: Catalog;
  state: AtlasState;
  onSelect: (id: string) => void;
  handle: (value: ViewerHandle | null) => void;
}
type Runtime = {
  renderer: T.WebGLRenderer;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  controls: OrbitControls;
  content: T.Group;
  model: BotanicalModel | null;
  invalidate: () => void;
  fit: (preset?: CameraPreset, selected?: boolean) => void;
};

/** One demand-rendered scene shared by specimen comparison and explicit teaching geometry. */
export function Viewer({ catalog, state, onSelect, handle }: Props) {
  return (
    <ViewerBoundary>
      <SceneViewer
        catalog={catalog}
        state={state}
        onSelect={onSelect}
        handle={handle}
      />
    </ViewerBoundary>
  );
}
class ViewerBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fl-viewer-error" role="alert">
        <strong>3D view unavailable / Vista 3D no disponible</strong>
        <p>The field guide remains available. La guía sigue disponible.</p>
        <button onClick={() => location.reload()}>Reload / Recargar</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function SceneViewer({ catalog, state, onSelect, handle }: Props) {
  const container = useRef<HTMLDivElement>(null),
    runtime = useRef<Runtime | null>(null),
    latest = useRef(state),
    select = useRef(onSelect);
  const graphicsLost = useRef(false),
    currentError = useRef("");
  latest.current = state;
  select.current = onSelect;
  const theme = useThemeStore((s) => s.theme),
    lang = useShellLang();
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [hover, setHover] = useState(""),
    [label, setLabel] = useState<{ text: string; x: number; y: number } | null>(
      null,
    ),
    [revision, setRevision] = useState(0);
  currentError.current = error;
  const labels = useRef({ lang, catalog });
  labels.current = { lang, catalog };

  useEffect(() => {
    const host = container.current;
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
      setError("graphics");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.localClippingEnabled = true;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.testid = "atlas-canvas";
    host.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(36, 1, 0.02, 200),
      content = new T.Group();
    scene.add(content);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 30;
    controls.enablePan = true;
    const hemi = new T.HemisphereLight(0xfff4ea, 0x51736b, 1.05);
    scene.add(hemi);
    const key = new T.DirectionalLight(0xffebdc, 1.7);
    key.position.set(4, 7, 6);
    scene.add(key);
    const rim = new T.DirectionalLight(0xdfefff, 0.8);
    rim.position.set(-5, 2, -4);
    scene.add(rim);
    let env: T.WebGLRenderTarget;
    const environment = new RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer);
    try {
      env = pmrem.fromScene(environment, 0.04);
      scene.environment = env.texture;
      scene.environmentIntensity = 0.5;
    } catch {
      graphicsLost.current = true;
      setError("graphics");
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      environment.dispose();
      pmrem.dispose();
      return;
    }
    environment.dispose();
    pmrem.dispose();
    let frame = 0,
      disposed = false;
    const draw = () => {
      frame = 0;
      if (disposed || graphicsLost.current) return;
      renderer.render(scene, camera);
      host.dataset.rendered = String(renderer.info.render.triangles > 0);
      host.dataset.triangles = String(renderer.info.render.triangles);
      const s = latest.current;
      if (s.mode !== "specimen" && s.selected && s.labels) {
        const box = new T.Box3();
        runtime.current?.model?.parts
          .filter((p) => p.id === s.selected && p.object.visible)
          .forEach((p) => box.expandByObject(p.object));
        if (!box.isEmpty()) {
          const v = box.getCenter(new T.Vector3()).project(camera),
            name =
              labels.current.catalog.structures.find((p) => p.id === s.selected)
                ?.label[labels.current.lang] ?? s.selected;
          setLabel({
            text: name,
            x: ((v.x + 1) * host.clientWidth) / 2,
            y: ((1 - v.y) * host.clientHeight) / 2,
          });
        } else setLabel(null);
      } else setLabel(null);
    };
    const invalidate = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    };
    const fit = (
      preset: CameraPreset = latest.current.camera,
      selected = false,
    ) => {
      const box = new T.Box3();
      const expandVisible = (object: T.Object3D) => {
        object.updateWorldMatrix(true, true);
        object.traverseVisible((child) => {
          if (child instanceof T.Mesh || child instanceof T.Line) {
            child.geometry.computeBoundingBox();
            if (child.geometry.boundingBox)
              box.union(
                child.geometry.boundingBox
                  .clone()
                  .applyMatrix4(child.matrixWorld),
              );
          }
        });
      };
      if (selected && runtime.current?.model)
        runtime.current.model.parts
          .filter((p) => p.id === latest.current.selected && p.object.visible)
          .forEach((p) => expandVisible(p.object));
      if (box.isEmpty()) expandVisible(content);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3()),
        fov = (camera.fov * Math.PI) / 180;
      const diagram = latest.current.mode !== "specimen",
        directions = {
          front: new T.Vector3(0, diagram ? 0.52 : 0.09, 1),
          top: new T.Vector3(0, 1, 0.001),
          side: new T.Vector3(1, 0.25, 0.01),
          back: new T.Vector3(0, 0.1, -1),
        };
      const direction = directions[preset].normalize(),
        right = new T.Vector3().crossVectors(camera.up, direction).normalize(),
        up = new T.Vector3().crossVectors(direction, right);
      // Fit all eight projected corners, including camera-facing depth, after disassembly.
      let distance = 0.7;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const v = new T.Vector3(x, y, z).sub(center),
              depth = v.dot(direction);
            distance = Math.max(
              distance,
              Math.abs(v.dot(up)) / Math.tan(fov / 2) + depth,
              Math.abs(v.dot(right)) / (Math.tan(fov / 2) * camera.aspect) +
                depth,
            );
          }
      distance *= 1.17;
      camera.position.copy(center).addScaledVector(direction, distance);
      controls.target.copy(center);
      camera.near = Math.max(0.005, distance / 1000);
      camera.far = Math.max(100, distance * 20);
      camera.updateProjectionMatrix();
      controls.update();
      invalidate();
    };
    const rt: Runtime = {
      renderer,
      scene,
      camera,
      controls,
      content,
      model: null,
      invalidate,
      fit,
    };
    runtime.current = rt;
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      const previous = camera.aspect;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      if (Math.abs(previous - camera.aspect) > 0.2) fit();
      invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    controls.addEventListener("change", invalidate);
    const ray = new T.Raycaster(),
      point = new T.Vector2();
    const pick = (event: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      point.set(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        (-(event.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(point, camera);
      for (const hit of ray.intersectObject(content, true)) {
        let object: T.Object3D | null = hit.object,
          part = "",
          visible = true;
        while (object && object !== content) {
          if (!object.visible) visible = false;
          if (object.userData.part) part = object.userData.part;
          if (object.userData.specimen)
            part = "specimen:" + object.userData.specimen;
          object = object.parent;
        }
        if (!visible || !part) continue;
        if (latest.current.cutEnabled && latest.current.mode !== "specimen") {
          const axis = latest.current.cutAxis;
          if (hit.point[axis] < -latest.current.cut * 2.5) continue;
        }
        return part;
      }
      return "";
    };
    let down: { x: number; y: number } | null = null,
      activePointers = new Set<number>(),
      dragged = false,
      lastHover = 0;
    const onDown = (e: PointerEvent) => {
      activePointers.add(e.pointerId);
      if (activePointers.size > 1) dragged = true;
      else {
        down = { x: e.clientX, y: e.clientY };
        dragged = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)
        dragged = true;
      if (down || performance.now() - lastHover < 80) return;
      lastHover = performance.now();
      const id = pick(e);
      setHover(id);
      renderer.domElement.style.cursor = id ? "pointer" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (down && !dragged) {
        const id = pick(e);
        if (id) select.current(id);
      }
      down = null;
    };
    const onCancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      down = null;
      dragged = true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== host) return;
      if (e.key === "Home" || e.key === "Escape") {
        e.preventDefault();
        fit();
        return;
      }
      if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        camera.position
          .sub(controls.target)
          .multiplyScalar(e.key === "-" ? 1.15 : 0.87)
          .add(controls.target);
        controls.update();
        invalidate();
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const sph = new T.Spherical().setFromVector3(
          camera.position.clone().sub(controls.target),
        );
        sph.theta +=
          e.key === "ArrowLeft" ? 0.12 : e.key === "ArrowRight" ? -0.12 : 0;
        sph.phi += e.key === "ArrowUp" ? -0.1 : e.key === "ArrowDown" ? 0.1 : 0;
        sph.makeSafe();
        camera.position.setFromSpherical(sph).add(controls.target);
        controls.update();
        invalidate();
      }
    };
    const lost = (e: Event) => {
      e.preventDefault();
      graphicsLost.current = true;
      host.dataset.rendered = "false";
      setLoading(false);
      setError("graphics");
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onCancel);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    host.addEventListener("keydown", onKey);
    handle({
      home: () => fit(),
      focus: () => fit(latest.current.camera, true),
      snapshot: () => {
        if (
          graphicsLost.current ||
          currentError.current ||
          renderer.getContext().isContextLost() ||
          host.dataset.rendered !== "true" ||
          host.dataset.loading === "true"
        )
          throw new Error("The 3D view is not ready for export.");
        draw();
        const source = renderer.domElement,
          canvas = document.createElement("canvas"),
          scale = Math.min(devicePixelRatio, 2);
        canvas.width = source.width;
        canvas.height = source.height + Math.round(76 * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Image export is unavailable.");
        const dark = document.documentElement.dataset.theme === "dark",
          s = latest.current,
          es = labels.current.lang === "es";
        ctx.fillStyle = dark ? "#101d1b" : "#f5f0e7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0);
        ctx.fillStyle = dark ? "#e8e8db" : "#233d31";
        ctx.font = `${14 * scale}px sans-serif`;
        const names = [s.specimen, ...(s.compare ? [s.compare] : [])]
          .map(
            (id) => catalog.specimens.find((p) => p.id === id)?.scientificName,
          )
          .join(" / ");
        const title =
          s.mode === "specimen"
            ? names
            : s.model === "orchid"
              ? es
                ? "Modelo didáctico de orquídea"
                : "Orchid teaching model"
              : es
                ? "Modelo didáctico de flor general"
                : "General flower teaching model";
        const credit =
          s.mode === "specimen"
            ? "Smithsonian Gardens · CC0 · " +
              (es
                ? "Escaneo de superficie; escala no común"
                : "Surface scan; no common scale")
            : es
              ? "FLORARIA · Ilustración original; no es un escaneo ni una escala física"
              : "FLORARIA · Original illustration; not a scan or a physical scale";
        ctx.fillText(
          title,
          16 * scale,
          source.height + 26 * scale,
          canvas.width - 32 * scale,
        );
        ctx.font = `${10 * scale}px sans-serif`;
        ctx.fillText(
          credit,
          16 * scale,
          source.height + 50 * scale,
          canvas.width - 32 * scale,
        );
        return canvas.toDataURL("image/png");
      },
      rotate: () => {
        const offset = camera.position
          .clone()
          .sub(controls.target)
          .applyAxisAngle(new T.Vector3(0, 1, 0), 0.18);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        invalidate();
      },
    });
    resize();
    setRevision((v) => v + 1);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeObject(content);
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      host.removeEventListener("keydown", onKey);
      runtime.current = null;
      handle(null);
    };
  }, []);

  useEffect(() => {
    const r = runtime.current;
    if (!r || !revision) return;
    if (graphicsLost.current) {
      setError("graphics");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError("");
    setHover("");
    setLoading(true);
    setLabel(null);
    if (container.current) {
      container.current.dataset.rendered = "false";
      container.current.dataset.loading = "true";
    }
    r.content.children.slice().forEach((c) => {
      r.content.remove(c);
      disposeObject(c);
    });
    r.model = null;
    if (state.mode !== "specimen") {
      r.model = createBotanicalModel(
        state.mode === "lifecycle" ? "general" : state.model,
      );
      r.content.add(r.model.root);
      r.model.update(state);
      r.fit();
      setLoading(false);
      if (container.current) container.current.dataset.loading = "false";
      r.invalidate();
      return;
    }
    const draco = new DRACOLoader()
        .setDecoderPath(import.meta.env.BASE_URL + "draco/")
        .setWorkerLimit(2),
      loader = new GLTFLoader().setDRACOLoader(draco);
    const ids = state.compare
      ? [state.specimen, state.compare]
      : [state.specimen];
    Promise.allSettled(
      ids.map(async (id, index) => {
        const specimen = catalog.specimens.find((s) => s.id === id) as Specimen;
        const asset = specimen[state.quality];
        const gltf = await loader.loadAsync(resolveAssetUrl(asset));
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        const object = gltf.scene;
        const box = new T.Box3().setFromObject(object),
          size = box.getSize(new T.Vector3()),
          center = box.getCenter(new T.Vector3()),
          scale = 3.6 / Math.max(size.x, size.y, size.z);
        // Independent normalisation is deliberate; scans are never claimed to share botanical scale.
        object.position.copy(center).multiplyScalar(-scale);
        object.scale.setScalar(scale);
        const specimenGroup = new T.Group();
        specimenGroup.userData.specimen = id;
        specimenGroup.add(object);
        specimenGroup.position.x =
          ids.length === 2 ? (index === 0 ? -2.05 : 2.05) : 0;
        r.content.add(specimenGroup);
        r.fit();
        r.invalidate();
      }),
    )
      .then((results) => {
        if (cancelled) return;
        if (results.some((result) => result.status === "rejected")) {
          r.content.children.slice().forEach((c) => {
            r.content.remove(c);
            disposeObject(c);
          });
          setError("asset");
        }
        setLoading(false);
        if (container.current) container.current.dataset.loading = "false";
        r.invalidate();
      })
      .finally(() => draco.dispose());
    return () => {
      cancelled = true;
    };
  }, [
    state.mode,
    state.model,
    state.specimen,
    state.compare,
    state.quality,
    revision,
    catalog,
  ]);

  useEffect(() => {
    const r = runtime.current;
    if (!r) return;
    r.model?.update(state);
    const normal = new T.Vector3(
      state.cutAxis === "x" ? 1 : 0,
      state.cutAxis === "y" ? 1 : 0,
      state.cutAxis === "z" ? 1 : 0,
    );
    r.content.traverse((o) => {
      if (o instanceof T.Mesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.clippingPlanes =
            state.cutEnabled && state.mode !== "specimen"
              ? [new T.Plane(normal, state.cut * 2.5)]
              : [];
          m.needsUpdate = true;
        }
      }
    });
    r.invalidate();
  }, [state, theme, lang, revision]);
  useEffect(() => {
    runtime.current?.fit(state.camera);
  }, [state.camera]);
  useEffect(() => {
    runtime.current?.fit(state.camera, state.isolate);
  }, [state.explode, state.isolate]);
  useEffect(() => {
    if (state.isolate) runtime.current?.fit(state.camera, true);
  }, [state.selected]);
  useEffect(() => {
    const r = runtime.current;
    if (!r) return;
    r.renderer.setClearColor(theme === "dark" ? 0x101d1b : 0xf5f0e7, 0);
    r.scene.environmentIntensity = 0.4;
    r.invalidate();
  }, [theme, revision]);
  const hovered = hover.startsWith("specimen:")
    ? catalog.specimens.find((s) => s.id === hover.slice(9))?.scientificName
    : catalog.structures.find((s) => s.id === hover)?.label[lang];
  return (
    <div
      className="fl-viewer"
      ref={container}
      tabIndex={0}
      role="group"
      aria-label={
        lang === "en"
          ? "Interactive flower. Arrow keys rotate, plus and minus zoom, Home resets. Use the structure list for text navigation."
          : "Flor interactiva. Las flechas giran; más y menos acercan; Inicio restablece. Use la lista de estructuras para navegar por texto."
      }
    >
      {loading && (
        <div className="fl-loading" role="status">
          <span className="fl-loader" />
          {lang === "en"
            ? "Preparing your specimen…"
            : "Preparando el ejemplar…"}
        </div>
      )}
      {error && (
        <div className="fl-viewer-error" role="alert">
          <strong>
            {lang === "en"
              ? "The 3D view is unavailable"
              : "La vista 3D no está disponible"}
          </strong>
          <p>
            {lang === "en"
              ? "The field guide, specimen records and structure descriptions remain available. Reload to retry the local model."
              : "La guía, las fichas y las descripciones siguen disponibles. Recargue para volver a intentar."}
          </p>
          <button onClick={() => window.location.reload()}>
            {lang === "en" ? "Reload viewer" : "Recargar visor"}
          </button>
        </div>
      )}
      {label && label.x > 0 && label.y > 0 && (
        <div
          className="fl-object-label"
          style={{
            left:
              Math.min(
                92,
                Math.max(
                  8,
                  (label.x / (container.current?.clientWidth || 1)) * 100,
                ),
              ) + "%",
            top:
              Math.min(
                85,
                Math.max(
                  15,
                  (label.y / (container.current?.clientHeight || 1)) * 100,
                ),
              ) + "%",
          }}
        >
          {label.text}
        </div>
      )}
      {hovered && (
        <div className="fl-hover" aria-live="off">
          {hovered}
        </div>
      )}
    </div>
  );
}
