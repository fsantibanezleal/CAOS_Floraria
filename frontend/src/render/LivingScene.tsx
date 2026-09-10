import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createLivingGeometry } from "./livingGeometry";
import {
  approach,
  clamp,
  smooth,
  wheelDepth,
  type LivingState,
  type LivingForm,
  type LivingPath,
} from "../lib/living";

export interface LivingSceneHandle {
  snapshot(): string;
  resetView(): void;
}
interface Props {
  state: LivingState;
  dark: boolean;
  es: boolean;
  onChange(value: Partial<LivingState>): void;
  onDepth(value: number, nodeId: string): void;
  onHover(value: string): void;
  handle(value: LivingSceneHandle | null): void;
}
const POSITIONS: Record<LivingForm, T.Vector3> = {
  sunflower: new T.Vector3(-4.2, 0, 0),
  radial: new T.Vector3(0, -0.15, 0.7),
  orchid: new T.Vector3(4.1, 0.25, -0.25),
};
const FORMS: LivingForm[] = ["sunflower", "radial", "orchid"];
const partBranch = (id: string): LivingPath =>
  /stem|xylem|vessel|water|leaf|root/.test(id)
    ? "stem"
    : /anther|pollen|pollini|filament/.test(id)
      ? "anther"
      : /ovary|ovule|seed|stigma|style|column|embryo/.test(id)
        ? "ovary"
        : "petal";

/** One WebGL canvas for every continuous depth. Camera gestures reveal geometry. */
export function LivingScene(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.localClippingEnabled = true;
    renderer.domElement.dataset.testid = "living-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.0003, 150);
    const ambient = new T.HemisphereLight(0xe8ffeb, 0x29453e, 0.65);
    const key = new T.DirectionalLight(0xffecd0, 2.0);
    key.position.set(3, 6, 8);
    const rim = new T.DirectionalLight(0x9be1d6, 1.1);
    rim.position.set(-5, 2, -5);
    scene.add(ambient, key, rim);
    const environment = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    const env = pmrem.fromScene(environment, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.35;
    environment.dispose();
    pmrem.dispose();
    const cache = new Map<string, ReturnType<typeof createLivingGeometry>>();
    const get = (form: LivingForm, branch: LivingPath) => {
      const id = form + ":" + branch;
      if (!cache.has(id)) {
        const model = createLivingGeometry(form, branch);
        model.root.position.copy(POSITIONS[form]);
        model.root.userData.formId = form;
        scene.add(model.root);
        cache.set(id, model);
      }
      return cache.get(id)!;
    };
    FORMS.forEach((form) => get(form, "petal"));
    let depth = latest.current.state.depth;
    let angle = 0.05,
      tilt = 0.3,
      time = 0,
      frame = 0,
      prior = performance.now(),
      notified = 0;
    let disposed = false,
      lost = false;
    let lastFrameSignature = "";
    const pointers = new Map<number, { x: number; y: number }>();
    const pointer = new T.Vector2(0, 0);
    const raycaster = new T.Raycaster();
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    const pointerNdc = (x: number, y: number) => {
      const rect = host.getBoundingClientRect();
      pointer.set(
        ((x - rect.left) / rect.width) * 2 - 1,
        1 - ((y - rect.top) / rect.height) * 2,
      );
    };
    const hit = () => {
      raycaster.setFromCamera(pointer, camera);
      const targets = [...cache.values()]
        .filter((model) => model.root.visible)
        .map((model) => model.root);
      for (const result of raycaster.intersectObjects(targets, true)) {
        let obj: T.Object3D | null = result.object;
        let form: LivingForm | undefined,
          branch: LivingPath | undefined,
          id = "";
        let hidden = false;
        while (obj) {
          if (!obj.visible) hidden = true;
          form ??= obj.userData.formId as LivingForm | undefined;
          branch ??= obj.userData.branch as LivingPath | undefined;
          id ||= String(obj.userData.nodeId || "");
          obj = obj.parent;
        }
        if (!hidden && form && FORMS.includes(form))
          return { form, branch: branch ?? partBranch(id), id };
      }
      return null;
    };
    const changeDepth = (next: number, targetUnderPointer = true) => {
      const pointed = targetUnderPointer && depth < 0.55 ? hit() : null;
      latest.current.onChange({
        depth: clamp(next, 0, 4),
        ...(pointed ? { form: pointed.form, branch: pointed.branch } : {}),
      });
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      pointerNdc(event.clientX, event.clientY);
      const next = wheelDepth(
        latest.current.state.depth,
        event.deltaY,
        event.deltaMode,
        host.clientHeight,
      );
      changeDepth(next);
    };
    const down = (event: PointerEvent) => {
      host.focus({ preventScroll: true });
      latest.current.onChange({});
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      host.setPointerCapture(event.pointerId);
      pointerNdc(event.clientX, event.clientY);
    };
    const move = (event: PointerEvent) => {
      pointerNdc(event.clientX, event.clientY);
      const before = pointers.get(event.pointerId);
      if (!before) {
        if (depth < 0.65) {
          const target = hit();
          latest.current.onHover(target ? target.id || target.form : "");
          host.style.cursor = target ? "zoom-in" : "grab";
        }
        return;
      }
      if (pointers.size === 2) {
        const other = [...pointers.entries()].find(
          ([id]) => id !== event.pointerId,
        )![1];
        const oldDistance = Math.hypot(before.x - other.x, before.y - other.y);
        const distance = Math.hypot(
          event.clientX - other.x,
          event.clientY - other.y,
        );
        if (oldDistance > 4 && distance > 4)
          changeDepth(
            latest.current.state.depth + Math.log(distance / oldDistance) * 2.1,
          );
      } else {
        angle -= (event.clientX - before.x) * 0.006;
        tilt = clamp(tilt + (event.clientY - before.y) * 0.005, -0.9, 1.2);
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (host.hasPointerCapture(event.pointerId))
        host.releasePointerCapture(event.pointerId);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "Home",
          "End",
          "ArrowLeft",
          "ArrowRight",
        ].includes(event.key)
      ) {
        event.preventDefault();
        if (event.key === "Home") changeDepth(0, false);
        else if (event.key === "End") changeDepth(4, false);
        else if (event.key === "ArrowLeft" || event.key === "ArrowRight")
          angle += event.key === "ArrowLeft" ? 0.16 : -0.16;
        else
          changeDepth(
            latest.current.state.depth +
              (["ArrowUp", "+", "="].includes(event.key) ? 0.18 : -0.18),
            false,
          );
      }
    };
    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(Math.max(w, 1), Math.max(h, 1));
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    host.addEventListener("wheel", wheel, { passive: false });
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);
    host.addEventListener("keydown", keyboard);
    latest.current.handle({
      snapshot: () => renderer.domElement.toDataURL("image/png"),
      resetView: () => {
        angle = 0.05;
        tilt = 0.3;
      },
    });
    const draw = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      const dt = Math.min((now - prior) / 1000, 0.05);
      prior = now;
      if (lost || document.hidden) return;
      const { state, dark } = latest.current;
      if (state.playing && !motionPreference.matches) time += dt;
      depth = motionPreference.matches
        ? state.depth
        : approach(depth, state.depth, dt);
      if (Math.abs(depth - state.depth) < 0.0002) depth = state.depth;
      const frameSignature = [
        state.form,
        state.branch,
        depth,
        time,
        state.opening,
        state.activity,
        dark,
        angle,
        tilt,
        host.clientWidth,
        host.clientHeight,
      ].join(":");
      if (frameSignature === lastFrameSignature) return;
      lastFrameSignature = frameSignature;
      const active = get(state.form, state.branch);
      const compact = host.clientWidth < 700;
      const otherForms = FORMS.filter((form) => form !== state.form);
      for (const [id, model] of cache) {
        const form = id.split(":")[0] as LivingForm;
        model.root.position.copy(
          compact
            ? form === state.form
              ? new T.Vector3(0, 0, 0.6)
              : new T.Vector3(
                  otherForms.indexOf(form) === 0 ? -2.8 : 2.8,
                  0.2,
                  -2.2,
                )
            : POSITIONS[form],
        );
      }
      for (const [id, model] of cache) {
        const [form, branch] = id.split(":");
        model.root.visible =
          form === state.form
            ? model === active
            : branch === "petal" && depth < 1.25;
        if (model.root.visible)
          model.update({
            depth: form === state.form ? depth : 0,
            time,
            opening: state.opening,
            activity: state.activity,
          });
      }
      const i = Math.min(3, Math.floor(depth));
      const fraction = smooth(depth - i);
      const a = active.anchors[i],
        b = active.anchors[i + 1];
      const start = a.position.clone().add(active.root.position);
      const end = b.position.clone().add(active.root.position);
      let radiusA = a.radius;
      if (i === 0) {
        start.set(0, compact ? 0.2 : -0.1, 0);
        radiusA = compact ? 2.8 : 5.0;
      }
      const center = start.lerp(end, fraction);
      const radius = Math.exp(
        Math.log(radiusA) * (1 - fraction) + Math.log(b.radius) * fraction,
      );
      const distance =
        (radius /
          Math.sin(T.MathUtils.degToRad(camera.fov / 2)) /
          Math.min(1, camera.aspect)) *
        1.05;
      const direction = new T.Vector3(
        Math.sin(angle) * Math.cos(tilt),
        Math.sin(tilt),
        Math.cos(angle) * Math.cos(tilt),
      );
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.near = Math.max(0.00002, distance / 1000);
      camera.far = Math.max(30, distance * 12);
      camera.updateProjectionMatrix();
      camera.lookAt(center);
      ambient.intensity = dark ? 0.65 : 0.8;
      renderer.render(scene, camera);
      if (
        now - notified > 110 ||
        (depth === state.depth && host.dataset.depth !== depth.toFixed(4))
      ) {
        notified = now;
        latest.current.onDepth(
          depth,
          active.anchors[Math.min(4, Math.floor(depth + 0.3))].nodeId,
        );
        host.dataset.depth = depth.toFixed(4);
        host.dataset.form = state.form;
        host.dataset.branch = state.branch;
        host.dataset.triangles = String(renderer.info.render.triangles);
        host.dataset.rendered = String(renderer.info.render.triangles > 0);
        host.dataset.time = time.toFixed(3);
        host.dataset.cameraDistance = distance.toFixed(6);
      }
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
      host.removeEventListener("keydown", keyboard);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      latest.current.handle(null);
      cache.forEach((model) => model.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={hostRef}
      className="living-canvas"
      tabIndex={0}
      role="region"
      aria-label={
        props.es
          ? "Jardín interactivo. Rueda o pellizca para explorar dentro; arrastra para girar. Flechas arriba y abajo cambian la profundidad."
          : "Interactive garden. Scroll or pinch to explore inside; drag to orbit. Up and down arrows change depth."
      }
      data-testid="living-scene"
    >
      {error && (
        <div className="living-error" role="alert">
          <h2>
            {props.es
              ? "No se pudo iniciar la vista 3D"
              : "The 3D view could not start"}
          </h2>
          <p>
            {props.es
              ? "Recarga para volver a intentar. La colección y sus fuentes siguen disponibles."
              : "Reload to try again. The collection and its sources remain available."}
          </p>
          <button onClick={() => location.reload()}>
            {props.es ? "Recargar" : "Reload"}
          </button>
          <a href="/?archive=1">
            {props.es ? "Abrir colección" : "Open collection"}
          </a>
        </div>
      )}
    </div>
  );
}
