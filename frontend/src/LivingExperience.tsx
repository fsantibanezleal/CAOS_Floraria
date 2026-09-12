import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Flower2,
  Info,
  Maximize2,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Share2,
  Sun,
  X,
} from "lucide-react";
import {
  useLangStore,
  useShellLang,
  useThemeStore,
} from "@fasl-work/caos-app-shell";
import { LivingScene, type LivingSceneHandle } from "./render/LivingScene";
import {
  normalizeLiving,
  readLiving,
  livingSearch,
  PATHS,
  clamp,
  type LivingForm,
  type LivingState,
} from "./lib/living";
import { loadMicroAtlas, type MicroAtlas } from "./lib/micro";
import { loadLivingContent, type LivingContent } from "./lib/livingContent";
import { notebookText, parseLivingNotebook } from "./lib/livingNotebook";
import "./living.css";

const FORMS: {
  id: LivingForm;
  name: [string, string];
  title: [string, string];
  body: [string, string];
  url: string;
  accent: string;
}[] = [
  {
    id: "sunflower",
    name: ["Sunflower head", "Capítulo de girasol"],
    title: ["One head. Many flowers.", "Un capítulo. Muchas flores."],
    body: [
      "The outer rays and the small spiral-arranged disc florets are different flowers. Move closer to discover the construction of the head.",
      "Las lígulas externas y las pequeñas flores del disco en espiral son flores diferentes. Acércate para descubrir la construcción del capítulo.",
    ],
    url: "https://www.kew.org/plants/sunflower",
    accent: "#e9bd60",
  },
  {
    id: "radial",
    name: ["Radial bloom", "Flor radial"],
    title: ["A flower built in whorls.", "Una flor hecha de verticilos."],
    body: [
      "Petals surround the stamens and the central carpel. Follow the flower's surface, its water route, or the structures that make reproduction possible.",
      "Los pétalos rodean los estambres y el carpelo central. Sigue la superficie floral, la ruta del agua o las estructuras que posibilitan la reproducción.",
    ],
    url: "https://extension.oregonstate.edu/catalog/em-9900-reproductive-plant-parts",
    accent: "#e892b5",
  },
  {
    id: "orchid",
    name: ["Bilateral orchid", "Orquídea bilateral"],
    title: ["A different architecture.", "Una arquitectura diferente."],
    body: [
      "Three sepals, two petals and a differentiated lip frame the column. The reproductive organs are joined in this orchid teaching form.",
      "Tres sépalos, dos pétalos y un labelo diferenciado enmarcan la columna. Los órganos reproductivos se reúnen en este modelo de orquídea.",
    ],
    url: "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000046-2/general-information",
    accent: "#b9a6e7",
  },
];
const DEPTH_LABELS = [
  ["Garden", "Jardín"],
  ["Structure", "Estructura"],
  ["Tissue", "Tejido"],
  ["Cell", "Célula"],
  ["Inside", "Interior"],
];

function saveFile(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LivingExperience() {
  const lang = useShellLang(),
    es = lang === "es";
  const setLang = useLangStore((s) => s.setLang);
  const theme = useThemeStore((s) => s.theme),
    setTheme = useThemeStore((s) => s.setTheme);
  const dark = theme === "dark";
  const say = (en: string, spanish: string) => (es ? spanish : en);
  const [state, setState] = useState<LivingState>(() => {
    const s = readLiving(location.search);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      s.playing = false;
    return s;
  });
  const [displayDepth, setDisplayDepth] = useState(state.depth);
  const [focusedNode, setFocusedNode] = useState("");
  const followDepth = useCallback((depth: number, nodeId: string) => {
    setDisplayDepth(depth);
    setFocusedNode(nodeId);
  }, []);
  const [micro, setMicro] = useState<MicroAtlas | null>(null);
  const [livingContent, setLivingContent] = useState<LivingContent | null>(
    null,
  );
  const [compact, setCompact] = useState(() => innerWidth < 700);
  const [sourceError, setSourceError] = useState(false);
  const [hover, setHover] = useState("");
  const [panel, setPanel] = useState<"" | "sources" | "notebook" | "help">("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [tour, setTour] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importBackup, setImportBackup] = useState(() => {
    try {
      return !!localStorage.getItem("floraria.living.before-import");
    } catch {
      return false;
    }
  });
  const handleRef = useRef<LivingSceneHandle | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const patch = useCallback(
    (value: Partial<LivingState>) =>
      setState((s) => normalizeLiving({ ...s, ...value })),
    [],
  );
  const sceneHandle = useCallback((v: LivingSceneHandle | null) => {
    handleRef.current = v;
  }, []);
  const userPatch = useCallback(
    (value: Partial<LivingState>) => {
      setTour(false);
      patch(value);
    },
    [patch],
  );
  const reloadContent = () => {
    setSourceError(false);
    loadMicroAtlas()
      .then(setMicro)
      .catch(() => setSourceError(true));
    loadLivingContent()
      .then(setLivingContent)
      .catch(() => setSourceError(true));
  };
  useEffect(() => {
    let live = true;
    loadMicroAtlas()
      .then((v) => {
        if (live) setMicro(v);
      })
      .catch(() => {
        if (live) setSourceError(true);
      });
    loadLivingContent()
      .then((v) => {
        if (live) setLivingContent(v);
      })
      .catch(() => {
        if (live) setSourceError(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(max-width: 699px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    try {
      const preference = localStorage.getItem("floraria.studio.theme");
      setTheme(preference === "light" ? "light" : "dark");
      setSaved(!!localStorage.getItem("floraria.living.v1"));
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("floraria.studio.theme", theme);
    } catch {}
  }, [theme, lang]);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      if (preference.matches) {
        patch({ playing: false });
        setTour(false);
      }
    };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, [patch]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (panel) dialogRef.current?.showModal();
  }, [panel]);
  useEffect(() => {
    if (!tour) return;
    let prior = performance.now();
    const id = setInterval(() => {
      const now = performance.now(),
        elapsed = Math.min((now - prior) / 1000, 0.2);
      prior = now;
      if (document.hidden) return;
      const current = stateRef.current;
      if (current.depth >= 4) {
        setTour(false);
        return;
      }
      patch({ depth: clamp(current.depth + elapsed * 0.13, 0, 4) });
    }, 60);
    return () => clearInterval(id);
  }, [tour, patch]);
  const form = FORMS.find((f) => f.id === state.form)!;
  const otherForms = FORMS.filter((f) => f.id !== state.form);
  const displayedForms = compact ? [otherForms[0], form, otherForms[1]] : FORMS;
  const path = PATHS.find((p) => p.id === state.branch)!;
  const level = Math.max(0, Math.min(4, Math.floor(displayDepth + 0.3)));
  const node =
    livingContent?.nodes.find((n) => n.id === focusedNode) ??
    micro?.nodes.find((n) => n.id === focusedNode);
  const sunflowerColour =
    state.form === "sunflower" && state.branch === "petal";
  const branch = sunflowerColour
    ? undefined
    : micro?.branches.find((b) => b.id === state.branch);
  const sunflowerFloret =
    state.form === "sunflower" &&
    ["anther", "ovary"].includes(state.branch) &&
    level === 1;
  const contextTitle =
    level === 0
      ? form.title[es ? 1 : 0]
      : sunflowerFloret
        ? say("Inside one disc floret", "Dentro de una flor del disco")
        : (node?.label[lang] ?? path.name[es ? 1 : 0]);
  const contextBody =
    level === 0
      ? form.body[es ? 1 : 0]
      : sunflowerFloret
        ? say(
            "The camera follows one of the small flowers at the center of the head. Its own reproductive structures remain the anchor for your journey inside.",
            "La cámara sigue una de las pequeñas flores en el centro del capítulo. Sus propias estructuras reproductivas siguen siendo el punto de referencia del recorrido interior.",
          )
        : (node?.summary[lang] ??
          say(
            "Move closer to reveal the structure inside.",
            "Acércate para revelar la estructura interior.",
          ));
  const sources = [
    ...(livingContent?.sources ?? []),
    ...(micro?.sources ?? []),
  ].filter((s) => node?.sourceIds.includes(s.id));
  const reset = () => {
    setTour(false);
    patch({ depth: 0 });
    handleRef.current?.resetView();
  };
  const share = async () => {
    const url = location.origin + location.pathname + livingSearch(state);
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        say(
          "Exploration link copied. Personal notes stay here.",
          "Enlace copiado. Las notas personales se quedan aquí.",
        ),
      );
    } catch {
      saveFile("floraria-link.txt", url, "text/plain");
      setNotice(
        say(
          "Exploration link downloaded.",
          "Enlace de exploración descargado.",
        ),
      );
    }
  };
  const saveNotebook = () => {
    try {
      localStorage.setItem("floraria.living.v1", notebookText(state, note));
      setSaved(true);
      setNotice(say("Saved on this device.", "Guardado en este dispositivo."));
    } catch {
      setNotice(
        say(
          "Device storage is unavailable. Export your notebook to keep it.",
          "El almacenamiento no está disponible. Exporta el cuaderno para conservarlo.",
        ),
      );
    }
  };
  const restoreNotebook = () => {
    try {
      const raw = localStorage.getItem("floraria.living.v1");
      if (!raw) throw Error();
      const v = parseLivingNotebook(raw);
      setState(v.state);
      setNote(v.note);
      setTour(false);
      setPanel("");
      setNotice(
        say("Saved exploration restored.", "Exploración guardada restaurada."),
      );
    } catch {
      setNotice(
        say(
          "The saved notebook could not be read.",
          "No se pudo leer el cuaderno guardado.",
        ),
      );
    }
  };
  return (
    <div
      className="living-app"
      data-testid="living-app"
      style={{ "--living-path": path.color } as React.CSSProperties}
    >
      <header className="living-header">
        <button
          className="living-brand"
          onClick={reset}
          aria-label={say(
            "Floraria: return to garden",
            "Floraria: volver al jardín",
          )}
        >
          <Flower2 size={25} />
          <span>
            floraria<span className="living-brand-dot">.</span>
          </span>
        </button>
        <span className="living-header-note">
          {say("A garden, from the inside", "Un jardín, desde dentro")}
        </span>
        <div className="living-header-tools">
          <button
            className="living-text-button"
            onClick={() => setPanel("notebook")}
          >
            <BookOpen size={16} />
            <span>{say("Notebook", "Cuaderno")}</span>
          </button>
          <button
            className="living-icon"
            onClick={share}
            aria-label={say("Share exploration", "Compartir exploración")}
          >
            <Share2 size={17} />
          </button>
          <button
            className="living-icon"
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label={say("Change theme", "Cambiar tema")}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="living-lang"
            onClick={() => setLang(es ? "en" : "es")}
            aria-label={say("Switch to Spanish", "Cambiar a inglés")}
          >
            {es ? "EN" : "ES"}
          </button>
          <button
            className="living-icon"
            onClick={() => setPanel("help")}
            aria-label={say("How to explore", "Cómo explorar")}
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <section
        className="living-specimen-bar"
        aria-label={say("Choose one specimen", "Elige un ejemplar")}
      >
        <div className="living-specimen-heading">
          <span className="living-eyebrow">
            {say("SPECIMEN LAB", "LABORATORIO DE EJEMPLARES")}
          </span>
          <strong>
            {say("One specimen on the table", "Un ejemplar sobre la mesa")}
          </strong>
          <small>
            {say(
              "Switching specimen changes the evidence and the parts you can inspect.",
              "Cambiar de ejemplar cambia la evidencia y las partes que puedes inspeccionar.",
            )}
          </small>
        </div>
        <div className="living-specimen-options" role="tablist">
          {FORMS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={state.form === f.id}
              className={state.form === f.id ? "active" : ""}
              onClick={() =>
                userPatch({
                  form: f.id,
                  branch: "petal",
                  depth: 0,
                  playing: false,
                })
              }
            >
              <span className="specimen-dot" style={{ background: f.accent }} />
              <span>
                <strong>{f.name[es ? 1 : 0]}</strong>
                <small>{f.title[es ? 1 : 0]}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <main className="living-stage" data-level={level}>
        <LivingScene
          state={state}
          dark={dark}
          es={es}
          onChange={userPatch}
          onDepth={followDepth}
          onNode={({ branch, nodeId }) => {
            userPatch({
              branch,
              depth: Math.max(state.depth, 0.65),
              playing: false,
            });
            setFocusedNode(nodeId);
          }}
          onHover={setHover}
          handle={sceneHandle}
        />
        <div
          className={"living-intro" + (displayDepth > 0.4 ? " is-away" : "")}
          aria-hidden={displayDepth > 0.4}
        >
          <span className="living-eyebrow">
            <span />
            {say(
              "The living architecture of flowers",
              "La arquitectura viva de las flores",
            )}
          </span>
          <h1>
            {say("There is a whole world", "Hay todo un mundo")}
            <br />
            <em>{say("inside a flower.", "dentro de una flor.")}</em>
          </h1>
          <p>
            {say(
              "Point at a structure and scroll into it. Surfaces open. Cells emerge. Life keeps moving.",
              "Apunta a una estructura y acércate. Las superficies se abren. Aparecen células. La vida sigue moviéndose.",
            )}
          </p>
        </div>
        <div
          className="living-breadcrumb"
          aria-label={say("Current depth", "Profundidad actual")}
        >
          {displayDepth > 0.4 && (
            <button onClick={reset}>
              <ArrowLeft size={15} />
              {say("Garden", "Jardín")}
            </button>
          )}
          <span>{form.name[es ? 1 : 0]}</span>
          {level > 0 && (
            <>
              <span className="living-slash">/</span>
              <strong>{path.name[es ? 1 : 0]}</strong>
            </>
          )}
        </div>
        <aside
          className="living-scale"
          aria-label={say(
            "Continuous depth control",
            "Control continuo de profundidad",
          )}
        >
          <button
            onClick={() =>
              userPatch({ depth: clamp(state.depth + 0.35, 0, 4) })
            }
            aria-label={say("Explore deeper", "Explorar más dentro")}
          >
            <Plus size={17} />
          </button>
          <div className="living-scale-track">
            <input
              type="range"
              min="0"
              max="4"
              step="0.01"
              value={state.depth}
              onChange={(e) => userPatch({ depth: Number(e.target.value) })}
              aria-label={say(
                "Exploration depth",
                "Profundidad de exploración",
              )}
            />
            <div className="living-scale-labels">
              {[...DEPTH_LABELS].reverse().map((l, i) => (
                <span key={l[0]} className={level === 4 - i ? "active" : ""}>
                  {l[es ? 1 : 0]}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() =>
              userPatch({ depth: clamp(state.depth - 0.35, 0, 4) })
            }
            aria-label={say("Return outward", "Volver hacia afuera")}
          >
            <Minus size={17} />
          </button>
        </aside>
        <aside
          className="living-anatomy-map"
          aria-label={say(
            "Plant parts and investigation steps",
            "Partes de la planta y pasos de investigación",
          )}
        >
          <div className="living-map-heading">
            <span>{say("INSPECT THE PARTS", "INSPECCIONA LAS PARTES")}</span>
            <small>{level + 1}/5</small>
          </div>
          <div className="living-map-steps">
            {DEPTH_LABELS.map((label, index) => (
              <button
                key={label[0]}
                className={level === index ? "active" : ""}
                aria-pressed={level === index}
                onClick={() => userPatch({ depth: index, playing: false })}
              >
                <span className="living-step-number">0{index + 1}</span>
                <span>
                  <strong>{label[es ? 1 : 0]}</strong>
                  <small>
                    {index === 0
                      ? say("whole specimen", "ejemplar completo")
                      : index === 1
                        ? say("named organs", "órganos nombrados")
                        : index === 2
                          ? say("working tissue", "tejido funcional")
                          : index === 3
                            ? say("cell example", "ejemplo celular")
                            : say(
                                "inside the structure",
                                "interior de la estructura",
                              )}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="living-map-actions">
            <button
              onClick={() =>
                userPatch({ depth: Math.max(0, level - 1), playing: false })
              }
              disabled={level === 0}
            >
              <Minus size={15} />
              {say("Out", "Fuera")}
            </button>
            <button
              onClick={() =>
                userPatch({ depth: Math.min(4, level + 1), playing: false })
              }
              disabled={level === 4}
            >
              {say("In", "Dentro")}
              <Plus size={15} />
            </button>
          </div>
        </aside>
        <article
          className="living-context"
          data-testid="living-context"
          data-node={node?.id ?? state.form}
        >
          <div className="living-context-top">
            <span className="living-eyebrow">
              {DEPTH_LABELS[level][es ? 1 : 0]}{" "}
              <span className="living-coordinate">
                {displayDepth.toFixed(2)}
              </span>
            </span>
            <button
              onClick={() => setPanel("sources")}
              aria-label={say(
                "Sources for this structure",
                "Fuentes de esta estructura",
              )}
            >
              <ArrowUpRight size={17} />
            </button>
          </div>
          <h2>{contextTitle}</h2>
          <p>{contextBody}</p>
          {level > 1 && (
            <span className="living-evidence">
              {say(
                sunflowerColour
                  ? "Source-informed teaching model"
                  : state.form === "orchid" || state.form === "sunflower"
                    ? "Comparative cell model"
                    : "Illustrated internal anatomy",
                sunflowerColour
                  ? "Modelo didáctico basado en fuentes"
                  : state.form === "orchid" || state.form === "sunflower"
                    ? "Modelo celular comparativo"
                    : "Anatomía interna ilustrada",
              )}
            </span>
          )}
        </article>
        <div
          className={
            "living-form-labels" + (displayDepth > 0.45 ? " is-away" : "")
          }
          aria-hidden={displayDepth > 0.45}
        >
          {displayedForms.map((f) => (
            <button
              key={f.id}
              tabIndex={displayDepth > 0.45 ? -1 : 0}
              onClick={() => userPatch({ form: f.id, depth: 0.7 })}
              style={{ "--form-color": f.accent } as React.CSSProperties}
            >
              <span />
              <strong>{f.name[es ? 1 : 0]}</strong>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        <div className="living-gesture">
          <span className="living-scroll-mark" />
          <span>
            {hover && displayDepth < 0.5
              ? say(
                  "Scroll here to discover what is inside",
                  "Acércate aquí para descubrir el interior",
                )
              : say(
                  "Scroll / pinch to travel · Drag to orbit",
                  "Rueda / pellizca para viajar · Arrastra para girar",
                )}
          </span>
        </div>
        <div className="living-stage-tools">
          <button
            className="living-icon"
            onClick={reset}
            aria-label={say(
              "Reset camera and depth",
              "Restablecer cámara y profundidad",
            )}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="living-icon"
            onClick={() => {
              const image = handleRef.current?.snapshot();
              if (image) {
                const a = document.createElement("a");
                a.href = image;
                a.download = "floraria-exploration.png";
                a.click();
              }
            }}
            aria-label={say("Save scene image", "Guardar imagen de la escena")}
          >
            <ArrowDownToLine size={17} />
          </button>
          <button
            className="living-icon"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() =>
                    setNotice(
                      say(
                        "Fullscreen is unavailable.",
                        "La pantalla completa no está disponible.",
                      ),
                    ),
                  );
            }}
            aria-label={say("Fullscreen", "Pantalla completa")}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </main>
      <footer className="living-dock">
        <div
          className="living-paths"
          role="group"
          aria-label={say("Follow a process", "Sigue un proceso")}
        >
          {PATHS.map((p) => (
            <button
              key={p.id}
              aria-pressed={state.branch === p.id}
              onClick={() =>
                userPatch({ branch: p.id, depth: Math.min(state.depth, 0.7) })
              }
              style={{ "--path-color": p.color } as React.CSSProperties}
            >
              <span />
              <span>{p.verb[es ? 1 : 0]}</span>
            </button>
          ))}
        </div>
        <div className="living-controls">
          <button
            className="living-play"
            aria-label={
              state.playing
                ? say("Pause motion", "Pausar movimiento")
                : say("Play motion", "Reproducir movimiento")
            }
            onClick={() => patch({ playing: !state.playing })}
          >
            {state.playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <label className="living-range">
            <span>{say("Flower opening", "Apertura floral")}</span>
            <input
              aria-label={say("Flower opening", "Apertura floral")}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.opening}
              onChange={(e) => patch({ opening: Number(e.target.value) })}
            />
          </label>
          <label className="living-range">
            <span>{say("Process emphasis", "Énfasis del proceso")}</span>
            <input
              aria-label={say("Process emphasis", "Énfasis del proceso")}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.activity}
              onChange={(e) => patch({ activity: Number(e.target.value) })}
            />
          </label>
          <button
            className="living-tour"
            aria-pressed={tour}
            onClick={() => {
              if (tour) setTour(false);
              else {
                if (state.depth > 3.9) patch({ depth: 0 });
                setTour(true);
              }
            }}
          >
            {tour ? <Pause size={15} /> : <ChevronDown size={15} />}
            <span>
              {tour
                ? say("Pause journey", "Pausar recorrido")
                : say("Follow inside", "Seguir al interior")}
            </span>
          </button>
        </div>
      </footer>
      {notice && (
        <div className="living-toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      {panel && (
        <dialog
          ref={dialogRef}
          className="living-dialog"
          onCancel={() => setPanel("")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanel("");
          }}
          aria-labelledby="living-dialog-title"
        >
          <header>
            <h2 id="living-dialog-title">
              {panel === "sources"
                ? say("What you are seeing", "Qué estás viendo")
                : panel === "notebook"
                  ? say(
                      "Your exploration notebook",
                      "Tu cuaderno de exploración",
                    )
                  : say("Go inside the garden", "Entra en el jardín")}
            </h2>
            <button
              className="living-icon"
              onClick={() => setPanel("")}
              aria-label={say("Close", "Cerrar")}
            >
              <X size={20} />
            </button>
          </header>
          <div className="living-dialog-content">
            {panel === "sources" && (
              <>
                <p className="living-dialog-lead">{contextTitle}</p>
                <p>{node?.detail[lang] ?? form.body[es ? 1 : 0]}</p>
                <p>
                  {say(
                    "The flowers and their internal structures are authored teaching geometry. The original museum scans are surface evidence; they do not supply these cells. Movement explains location and sequence, without measured speeds or predicted biology.",
                    "Las flores y sus estructuras internas son geometría didáctica propia. Los escaneos originales del museo aportan superficies; no estas células. El movimiento explica ubicación y secuencia, sin velocidades medidas ni predicciones biológicas.",
                  )}
                </p>
                {level > 1 && state.form !== "radial" && !sunflowerColour && (
                  <p>
                    {say(
                      "This internal pathway is a comparative botanical example. It is not microscopy of this particular orchid or sunflower. Pollen organization, pigmentation and ovule details vary across species.",
                      "Esta ruta interna es un ejemplo botánico comparativo. No es microscopía de esta orquídea o girasol. La organización del polen, los pigmentos y los óvulos varían entre especies.",
                    )}
                  </p>
                )}
                {branch && (
                  <>
                    <h3>{say("The process", "El proceso")}</h3>
                    <p>{branch.process[lang]}</p>
                    {branch.assumptions.map((a, i) => (
                      <p key={i}>{a[lang]}</p>
                    ))}
                  </>
                )}
                <h3>{say("Sources", "Fuentes")}</h3>
                <a href={form.url} target="_blank" rel="noreferrer">
                  {form.name[es ? 1 : 0]} :{" "}
                  {say("botanical structure", "estructura botánica")}{" "}
                  <ArrowUpRight size={13} />
                </a>
                {sources.map((s) => (
                  <p key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                    <small>{s.citation}</small>
                  </p>
                ))}
                {sourceError && (
                  <p role="alert">
                    {say(
                      "Detailed source content did not load.",
                      "No se cargó el contenido detallado de fuentes.",
                    )}{" "}
                    <button onClick={reloadContent}>
                      {say("Retry", "Reintentar")}
                    </button>
                  </p>
                )}
                <a className="living-dialog-link" href="/?archive=1">
                  {say(
                    "Original specimens, field guide & previous explorations",
                    "Ejemplares originales, guía y exploraciones anteriores",
                  )}{" "}
                  <ArrowUpRight size={16} />
                </a>
              </>
            )}
            {panel === "notebook" && (
              <>
                <p>
                  {say(
                    "Keep the view and what you noticed. Notes stay on this device and are excluded from shared links.",
                    "Conserva la vista y tus observaciones. Las notas quedan en este dispositivo y no se incluyen en los enlaces compartidos.",
                  )}
                </p>
                <label className="living-note-label">
                  {say("What did you discover?", "¿Qué descubriste?")}
                  <textarea
                    maxLength={12000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={7}
                  />
                </label>
                <div className="living-dialog-actions">
                  <button onClick={saveNotebook}>
                    {say("Save here", "Guardar aquí")}
                  </button>
                  {saved && (
                    <button onClick={restoreNotebook}>
                      {say("Restore saved view", "Restaurar vista guardada")}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      saveFile(
                        "floraria-notebook.json",
                        notebookText(state, note),
                        "application/json",
                      )
                    }
                  >
                    {say("Export notebook", "Exportar cuaderno")}
                  </button>
                  <button onClick={() => importRef.current?.click()}>
                    {say("Import notebook", "Importar cuaderno")}
                  </button>
                  {importBackup && (
                    <button
                      onClick={() => {
                        try {
                          const previous = parseLivingNotebook(
                            localStorage.getItem(
                              "floraria.living.before-import",
                            ) || "",
                          );
                          setState(previous.state);
                          setNote(previous.note);
                          setTour(false);
                          setNotice(
                            say(
                              "Previous view restored.",
                              "Vista anterior restaurada.",
                            ),
                          );
                        } catch {
                          setNotice(
                            say(
                              "The previous view could not be restored.",
                              "No se pudo restaurar la vista anterior.",
                            ),
                          );
                        }
                      }}
                    >
                      {say("Restore previous view", "Restaurar vista anterior")}
                    </button>
                  )}
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 64000) throw Error();
                        const imported = parseLivingNotebook(await file.text());
                        // Preserve the current in-progress view before an explicit import replaces it.
                        try {
                          localStorage.setItem(
                            "floraria.living.before-import",
                            notebookText(state, note),
                          );
                          setImportBackup(true);
                        } catch {
                          saveFile(
                            "floraria-before-import.json",
                            notebookText(state, note),
                            "application/json",
                          );
                        }
                        setState(imported.state);
                        setNote(imported.note);
                        setTour(false);
                        setNotice(
                          say(
                            "Notebook imported. The previous view was backed up.",
                            "Cuaderno importado. Se respaldó la vista anterior.",
                          ),
                        );
                      } catch {
                        setNotice(
                          say(
                            "This is not a valid living notebook. Your current work is unchanged.",
                            "Este cuaderno no es válido. Tu trabajo actual se conserva.",
                          ),
                        );
                      }
                    }}
                  />
                </div>
                <a className="living-dialog-link" href="/?archive=1">
                  {say(
                    "Open earlier notebooks and imports",
                    "Abrir cuadernos e importaciones anteriores",
                  )}{" "}
                  <ArrowUpRight size={16} />
                </a>
              </>
            )}
            {panel === "help" && (
              <>
                <p className="living-dialog-lead">
                  {say(
                    "The scene is your navigation.",
                    "La escena es tu navegación.",
                  )}
                </p>
                <p>
                  {say(
                    "Point at a flower or one of its organs and scroll inward. On touch screens, spread two fingers. The enclosing surfaces open as you approach; tissue, cells and their contents stay connected in the same scene.",
                    "Apunta a una flor o uno de sus órganos y acércate con la rueda. En pantallas táctiles, separa dos dedos. Las superficies se abren al acercarte; tejidos, células y contenido permanecen conectados en la misma escena.",
                  )}
                </p>
                <p>
                  {say(
                    "Reverse the gesture to return. Drag to look around. The depth rail and + / − buttons offer the same continuous travel. With the scene focused, use ↑ / ↓, Home / End, and ← / → to orbit.",
                    "Invierte el gesto para volver. Arrastra para mirar alrededor. La escala y los botones + / − ofrecen el mismo recorrido continuo. Con foco en la escena, usa ↑ / ↓, Inicio / Fin y ← / → para girar.",
                  )}
                </p>
                <p>
                  {say(
                    "Follow a process along the bottom, adjust flower opening, or pause motion to inspect an intermediate state. Follow inside takes a continuous guided trip along the selected pathway; any camera gesture returns control to you.",
                    "Sigue un proceso desde abajo, ajusta la apertura floral o pausa el movimiento para examinar un estado intermedio. Seguir al interior recorre continuamente la ruta elegida; cualquier gesto de cámara te devuelve el control.",
                  )}
                </p>
                <a className="living-dialog-link" href="/?archive=1">
                  {say(
                    "Museum collection & full field guide",
                    "Colección de museo y guía completa",
                  )}{" "}
                  <ArrowUpRight size={16} />
                </a>
                <a
                  href="https://github.com/fsantibanezleal/CAOS_Floraria"
                  target="_blank"
                  rel="noreferrer"
                >
                  {say(
                    "Open source · How the app is built",
                    "Código abierto · Cómo se construye la app",
                  )}
                </a>
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
