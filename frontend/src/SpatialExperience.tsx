import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Focus,
  Globe2,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Share2,
  Sun,
} from "lucide-react";
import {
  useLangStore,
  useShellLang,
  useThemeStore,
} from "@fasl-work/caos-app-shell";
import {
  SpatialScene,
  type SpatialSceneHandle,
  type SpatialView,
} from "./render/SpatialScene";
import {
  atlasNode,
  loadSpatialAtlas,
  REGIONS,
  type Region,
  type SpatialAtlas,
} from "./lib/spatialAtlas";
import "./spatial.css";

const labels: Record<Region, [string, string]> = {
  root: ["Root system", "Raíces"],
  stem: ["Stem", "Tallo"],
  branch: ["Branch", "Rama"],
  leaf: ["Leaf", "Hoja"],
  sepal: ["Sepal", "Sépalo"],
  petal: ["Petal", "Pétalo"],
  stamen: ["Stamen", "Estambre"],
  pistil: ["Pistil", "Pistilo"],
};
const depthNames = [
  ["Whole plant", "Planta completa"],
  ["Organ", "Órgano"],
  ["Tissue", "Tejido"],
  ["Cell", "Célula"],
  ["Inside cell", "Interior celular"],
];
const colors: Record<Region, string> = {
  root: "#ba8b63",
  stem: "#76a486",
  branch: "#8aaa75",
  leaf: "#53b58a",
  sepal: "#499f80",
  petal: "#ec7fa1",
  stamen: "#d4aa51",
  pistil: "#b09ccc",
};
function parseView(): SpatialView {
  const params = new URLSearchParams(location.search);
  const raw = params.get("focus");
  const focus = REGIONS.find((region) => region === raw) ?? null;
  const depthValue = Number(params.get("scale"));
  return {
    focus,
    depth: Number.isFinite(depthValue)
      ? Math.min(focus ? 3.75 : 1.12, Math.max(0, depthValue))
      : 0,
    part: null,
    route: params.get("route") === "alternate" ? "alternate" : "primary",
  };
}
export default function SpatialExperience() {
  const lang = useShellLang(),
    es = lang === "es";
  const setLang = useLangStore((state) => state.setLang);
  const theme = useThemeStore((state) => state.theme),
    setTheme = useThemeStore((state) => state.setTheme);
  const [view, setView] = useState<SpatialView>(parseView);
  const [atlas, setAtlas] = useState<SpatialAtlas | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hover, setHover] = useState<{
    region: Region | null;
    part: string | null;
  }>({ region: null, part: null });
  const [toast, setToast] = useState("");
  const handle = useRef<SpatialSceneHandle | null>(null);
  const contextScroll = useRef<HTMLDivElement>(null);
  const say = (en: string, spanish: string) => (es ? spanish : en);
  const update = useCallback(
    (change: Partial<SpatialView>) =>
      setView((current) => {
        const focus = change.focus === undefined ? current.focus : change.focus;
        return {
          focus,
          depth: Math.max(
            0,
            Math.min(focus ? 3.75 : 1.12, change.depth ?? current.depth),
          ),
          part: change.part === undefined ? current.part : change.part,
          route: change.route ?? current.route,
        };
      }),
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    const search = new URLSearchParams(location.search);
    if (view.focus) search.set("focus", view.focus);
    else search.delete("focus");
    if (view.depth > 0.001) search.set("scale", view.depth.toFixed(3));
    else search.delete("scale");
    if (view.route === "alternate") search.set("route", "alternate");
    else search.delete("route");
    history.replaceState(
      null,
      "",
      location.pathname + (search.size ? `?${search}` : ""),
    );
  }, [theme, lang, view.focus, view.depth, view.route]);
  useEffect(() => {
    let alive = true;
    loadSpatialAtlas()
      .then((value) => {
        if (alive) {
          setAtlas(value);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const node = atlas
    ? atlasNode(atlas, view.focus, view.depth, view.route)
    : null;
  useEffect(() => {
    if (contextScroll.current) contextScroll.current.scrollTop = 0;
  }, [node?.id]);
  const refs =
    atlas && node
      ? atlas.sources.filter((source) => node.sourceIds.includes(source.id))
      : [];
  const selectedPart = atlas?.parts.find(
    (item) => item.region === view.focus && item.id === view.part,
  );
  const depthIndex = view.focus ? Math.min(4, 1 + Math.floor(view.depth)) : 0;
  const viewStatus = view.focus
    ? `${labels[view.focus][es ? 1 : 0]} · ${depthNames[depthIndex][es ? 1 : 0]}`
    : say("Whole plant · spatial overview", "Planta completa · vista espacial");
  const download = () => {
    const data = handle.current?.snapshot();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `floraria-${view.focus ?? "plant"}.png`;
    a.click();
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setToast(say("Exploration link copied", "Enlace de exploración copiado"));
    } catch {
      setToast(
        say(
          "Copy the current address to share this view",
          "Copia la dirección actual para compartir esta vista",
        ),
      );
    }
  };
  return (
    <main className="spatial-app">
      <header className="spatial-header">
        <a className="spatial-brand" href="/" aria-label="Floraria home">
          <span className="spatial-brand-mark">✳</span> FLORARIA
          <span className="spatial-brand-period">.</span>
        </a>
        <span className="spatial-header-rule" />
        <span className="spatial-header-caption">
          {say(
            "A living atlas of plant form",
            "Un atlas vivo de formas vegetales",
          )}
        </span>
        <nav
          className="spatial-header-actions"
          aria-label={say("Application links", "Enlaces de la aplicación")}
        >
          <a className="spatial-header-link" href="/?archive=1">
            <BookOpen size={16} />
            {say("Collection", "Colección")}
          </a>
          <button
            type="button"
            className="spatial-icon-button"
            onClick={() => setLang(es ? "en" : "es")}
            aria-label={say("Change language", "Cambiar idioma")}
          >
            <Globe2 size={17} />
            <span>{es ? "ES" : "EN"}</span>
          </button>
          <button
            type="button"
            className="spatial-icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={say("Change theme", "Cambiar tema")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </header>
      <section
        className="spatial-workspace"
        aria-label={say(
          "Spatial plant explorer",
          "Explorador espacial de plantas",
        )}
      >
        <div className="spatial-field">
          <SpatialScene
            view={view}
            onChange={update}
            onHover={(region, part) => setHover({ region, part })}
            onReady={(value) => {
              handle.current = value;
            }}
            dark={theme === "dark"}
            es={es}
          />
          <div
            className={`spatial-field-heading${view.depth > 1.45 ? " quiet" : ""}`}
            aria-hidden="true"
          >
            <span className="spatial-kicker">
              <i />
              {say("EXPLORE BY MOVING CLOSER", "EXPLORA AL ACERCARTE")}
            </span>
            <h1>
              {view.focus
                ? labels[view.focus][es ? 1 : 0]
                : say("One plant. Many worlds.", "Una planta. Muchos mundos.")}
            </h1>
            <p>
              {view.focus
                ? say(
                    "The structure changes as you travel inward. Turn, move, and follow what interests you.",
                    "La estructura cambia mientras entras. Gira, muévete y sigue lo que te interese.",
                  )
                : say(
                    "Point at any part and scroll in. Scroll on open space to unfold the entire plant.",
                    "Apunta a cualquier parte y acércate. Haz zoom en el espacio libre para desplegar toda la planta.",
                  )}
            </p>
          </div>
          <div className="spatial-crosshair" aria-hidden="true" />
          <div className="spatial-hover" aria-live="polite">
            {hover.region ? (
              <>
                <span style={{ backgroundColor: colors[hover.region] }} />
                {labels[hover.region][es ? 1 : 0]}
                {hover.part && <em> / {hover.part.replaceAll("-", " ")}</em>}
              </>
            ) : (
              say("Aim at a structure", "Apunta a una estructura")
            )}
          </div>
          <div className="spatial-field-tools">
            <button
              type="button"
              onClick={() => update({ depth: view.depth + 0.23 })}
              aria-label={say("Move inward", "Acercar")}
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              onClick={() => update({ depth: view.depth - 0.23 })}
              aria-label={say("Move outward", "Alejar")}
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              onClick={() => handle.current?.reset()}
              aria-label={say(
                "Return to whole plant",
                "Volver a la planta completa",
              )}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="spatial-field-hint">
            {say(
              "DRAG TO TURN  ·  SCROLL / PINCH TO ENTER  ·  CLICK A PART TO FOCUS",
              "ARRASTRA PARA GIRAR  ·  RUEDA / PELLIZCA PARA ENTRAR  ·  TOCA UNA PARTE PARA ENFOCAR",
            )}
          </div>
        </div>
        <aside
          className="spatial-context"
          aria-label={say("Live anatomy context", "Contexto anatómico activo")}
        >
          <div className="spatial-context-top">
            <span className="spatial-context-index">
              {say("FIELD NOTES / 01", "NOTAS DE CAMPO / 01")}
            </span>
            <Focus size={18} />
          </div>
          <div className="spatial-context-scroll" ref={contextScroll}>
            <div className="spatial-scale">
              <span
                className="spatial-scale-dot"
                style={{
                  backgroundColor: view.focus
                    ? colors[view.focus]
                    : "var(--sp-accent)",
                }}
              />
              {viewStatus}
            </div>
            <h2>
              {node
                ? node.label[es ? "es" : "en"]
                : say("Opening the atlas", "Abriendo el atlas")}
            </h2>
            <p className="spatial-context-body">
              {node
                ? node.body[es ? "es" : "en"]
                : loadError
                  ? say(
                      "The sourced anatomy library could not load. Check your connection and reload; the 3D model remains available.",
                      "No se pudo cargar la biblioteca anatómica. Revisa la conexión y recarga; el modelo 3D sigue disponible.",
                    )
                  : say(
                      "Loading sourced anatomy…",
                      "Cargando anatomía documentada…",
                    )}
            </p>
            {selectedPart && (
              <div className="spatial-part">
                <span>
                  {say("SELECTED STRUCTURE", "ESTRUCTURA SELECCIONADA")}
                </span>
                <strong>{selectedPart.label[es ? "es" : "en"]}</strong>
                <p>{selectedPart.body[es ? "es" : "en"]}</p>
              </div>
            )}
            <div className="spatial-context-divider" />
            <p className="spatial-context-section">
              {say("MOVE THROUGH THE PLANT", "RECORRE LA PLANTA")}
            </p>
            <div
              className="spatial-regions"
              role="group"
              aria-label={say(
                "Keyboard-accessible organ focus",
                "Enfoque de órganos accesible por teclado",
              )}
            >
              {REGIONS.map((region) => (
                <button
                  type="button"
                  key={region}
                  className={view.focus === region ? "on" : ""}
                  onClick={() => {
                    setHover({ region: null, part: null });
                    update({
                      focus: region,
                      depth: Math.max(0.65, view.depth),
                      part: null,
                      route: "primary",
                    });
                  }}
                >
                  <span
                    className="spatial-region-mark"
                    style={{ backgroundColor: colors[region] }}
                  />
                  {labels[region][es ? 1 : 0]}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
            <div className="spatial-context-divider" />
            <p className="spatial-context-section">
              {say("EVIDENCE & SCOPE", "FUENTES Y ALCANCE")}
            </p>
            <p className="spatial-provenance">
              {say(
                "Authored botanical teaching geometry. The levels are illustrative, not measured microscopy or a segmented individual specimen.",
                "Geometría botánica didáctica de autoría propia. Los niveles son ilustrativos, no microscopía medida ni un ejemplar segmentado.",
              )}
            </p>
            <div className="spatial-sources">
              {refs.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.label}
                  <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
            <a className="spatial-classic" href="/?living-archive=1">
              {say(
                "Explore the preserved floral pathways",
                "Explora las rutas florales preservadas",
              )}{" "}
              <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="spatial-context-actions">
            <button type="button" onClick={share}>
              <Share2 size={15} />
              {say("Share view", "Compartir vista")}
            </button>
            <button type="button" onClick={download}>
              <ArrowDownToLine size={15} />
              {say("Save image", "Guardar imagen")}
            </button>
          </div>
        </aside>
      </section>
      <footer className="spatial-footer">
        <span>
          {say(
            "AN INTERACTIVE BOTANICAL FIELD",
            "UN CAMPO BOTÁNICO INTERACTIVO",
          )}
        </span>
        <span className="spatial-footer-middle">
          {say(
            "Illustrated anatomy · EN / ES · no account",
            "Anatomía ilustrada · EN / ES · sin cuenta",
          )}
        </span>
        <a
          href="https://github.com/fsantibanezleal/CAOS_Floraria"
          target="_blank"
          rel="noopener noreferrer"
        >
          {say("SOURCE & METHODS", "CÓDIGO Y MÉTODOS")}{" "}
          <ArrowUpRight size={14} />
        </a>
      </footer>
      {toast && (
        <div className="spatial-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
