import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import {
  CitationsProvider,
  useLangStore,
  useShellLang,
  useThemeStore,
} from "@fasl-work/caos-app-shell";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Eye,
  Flower2,
  Focus,
  Info,
  Layers3,
  Leaf,
  Maximize2,
  Microscope,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { loadCatalog, type Catalog, type Localized } from "./lib/catalog";
import { DEFAULT_STATE, normalizeState, type AtlasState } from "./lib/state";
import {
  branchForPart,
  explorationSearch,
  exportExploration,
  importExploration,
  normalizeExploration,
  readExploration,
  type Branch,
  type Depth,
  type Exploration,
} from "./lib/exploration";
import { Viewer, type ViewerHandle } from "./render/Viewer";
import { MicroViewer } from "./render/MicroViewer";
import { GuidePage } from "./GuidePages";
import "./studio.css";

type Panel = "" | "journeys" | "library" | "notebook" | "tools" | "about";
const DEPTHS = [
  ["Flower", "Flor"],
  ["Organs", "Órganos"],
  ["Tissue", "Tejido"],
  ["Cell", "Célula"],
  ["Subcellular", "Subcelular"],
];
const BRANCHES: {
  id: Branch;
  en: string;
  es: string;
  question: [string, string];
  explanation: [string, string];
}[] = [
  {
    id: "petal",
    en: "Colour & surface",
    es: "Color y superficie",
    question: [
      "Where does a petal keep its colour?",
      "¿Dónde guarda su color un pétalo?",
    ],
    explanation: [
      "Follow a petal surface into an epidermal cell and its pigment-storing vacuole. This path explains an anthocyanin example; flower colours have several mechanisms.",
      "Sigue la superficie de un pétalo hasta una célula epidérmica y su vacuola con pigmentos. Esta ruta explica un ejemplo de antocianinas; el color floral tiene varios mecanismos.",
    ],
  },
  {
    id: "anther",
    en: "Pollen & protection",
    es: "Polen y protección",
    question: [
      "What travels inside a pollen grain?",
      "¿Qué viaja dentro de un grano de polen?",
    ],
    explanation: [
      "Enter a pollen sac, inspect the cells of the male gametophyte, and distinguish the protective pollen wall from the cells inside it.",
      "Entra en un saco polínico, observa las células del gametófito masculino y distingue la pared protectora del polen de las células que contiene.",
    ],
  },
  {
    id: "ovary",
    en: "Ovules & new life",
    es: "Óvulos y nueva vida",
    question: [
      "How can an ovule become a seed?",
      "¿Cómo puede un óvulo convertirse en semilla?",
    ],
    explanation: [
      "Follow an ovule into the female gametophyte and an egg cell. The illustrated arrangement is a common angiosperm teaching example, not a reconstruction of the orchid scan.",
      "Sigue un óvulo hasta el gametófito femenino y una oósfera. La disposición ilustrada es un ejemplo didáctico de angiosperma, no una reconstrucción del escaneo de orquídea.",
    ],
  },
  {
    id: "stem",
    en: "Water & support",
    es: "Agua y soporte",
    question: [
      "How does water reach a flower?",
      "¿Cómo llega el agua a una flor?",
    ],
    explanation: [
      "Trace a vascular tissue into a xylem vessel element and its reinforced wall. Mature conducting vessel elements are dead cells; the open lumen is not a vacuole.",
      "Recorre un tejido vascular hasta un elemento de vaso del xilema y su pared reforzada. Los elementos conductores maduros son células muertas; la luz abierta no es una vacuola.",
    ],
  },
];

function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close(): void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={"fs-dialog" + (wide ? " wide" : "")}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="fs-icon" aria-label="Close / Cerrar" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <div className="fs-dialog-body">{children}</div>
    </dialog>
  );
}

export default function Studio() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(false);
  const [state, setState] = useState<Exploration>(() =>
    readExploration(location.search),
  );
  const [panel, setPanel] = useState<Panel>(""),
    [guide, setGuide] = useState("introduction");
  const [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [playing, setPlaying] = useState(false),
    [focus, setFocus] = useState(false);
  const [saved, setSaved] = useState<Exploration | null>(null);
  const lang = useShellLang(),
    es = lang === "es",
    theme = useThemeStore((s) => s.theme),
    setTheme = useThemeStore((s) => s.setTheme),
    setLang = useLangStore((s) => s.setLang);
  const route = useLocation(),
    navigate = useNavigate(),
    viewer = useRef<ViewerHandle | null>(null),
    file = useRef<HTMLInputElement>(null);
  const t = (v: Localized) => v[lang];
  const say = (en: string, spanish: string) => (es ? spanish : en);
  const patch = useCallback(
    (next: Partial<Exploration>) =>
      setState((s) => normalizeExploration({ ...s, ...next })),
    [],
  );
  const patchView = useCallback(
    (next: Partial<AtlasState>) =>
      setState((s) =>
        normalizeExploration({ ...s, view: { ...s.view, ...next } }),
      ),
    [],
  );
  const handle = useCallback((v: ViewerHandle | null) => {
    viewer.current = v;
  }, []);
  useEffect(() => {
    let active = true;
    loadCatalog()
      .then((c) => {
        if (active) setCatalog(c);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    try {
      setTheme(
        localStorage.getItem("floraria.studio.theme") === "dark"
          ? "dark"
          : "light",
      );
      const old =
        localStorage.getItem("floraria.notebook.v2") ??
        localStorage.getItem("floraria.bookmark.v1");
      if (old) setSaved(importExploration(old));
    } catch {
      /* Optional local persistence. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("floraria.studio.theme", theme);
    } catch {}
  }, [theme, lang]);
  useEffect(() => {
    const path = route.pathname.replace(/\/+$/, "") || "/";
    if (
      [
        "/introduction",
        "/methodology",
        "/benchmark",
        "/implementation",
      ].includes(path)
    ) {
      setGuide(path.slice(1));
      setPanel("library");
    } else if (path === "/experiments") setPanel("journeys");
    if (route.search) setState(readExploration(route.search));
  }, [route.pathname, route.search]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (document.hidden) {
        setPlaying(false);
        return;
      }
      if (state.depth >= 2)
        setState((s) => ({
          ...s,
          progress: s.progress >= 1 ? 0 : Math.min(1, s.progress + 0.01),
        }));
      else if (state.view.mode === "lifecycle")
        setState((s) => ({
          ...s,
          view: { ...s.view, stage: Math.min(1, s.view.stage + 0.007) },
        }));
      else viewer.current?.rotate();
    }, 100);
    return () => clearInterval(timer);
  }, [playing, state.depth, state.view.mode]);
  useEffect(() => {
    if (state.view.mode === "lifecycle" && state.view.stage >= 1)
      setPlaying(false);
  }, [state.view.stage]);
  useEffect(() => {
    setPlaying(false);
  }, [state.depth, state.view.mode]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", stop);
    return () => preference.removeEventListener("change", stop);
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  function depth(d: Depth, branch = state.branch) {
    patch({
      depth: d,
      branch,
      microSelected: "",
      progress: 0,
      journey: "",
      view: {
        ...state.view,
        mode: d === 0 ? "specimen" : "anatomy",
        model: d >= 2 ? "general" : state.view.model,
        selected: d >= 2 ? branch : state.view.selected,
        isolate: false,
        hidden: [],
      },
    });
  }
  function selectPart(id: string) {
    if (id.startsWith("specimen:")) {
      patchView({ specimen: id.slice(9) });
      return;
    }
    patch({
      view: {
        ...state.view,
        selected: id,
        hidden: state.view.hidden.filter((x) => x !== id),
      },
      branch: branchForPart(id) ?? state.branch,
    });
  }
  function openAnatomy(model: "general" | "orchid" = "orchid") {
    patch({
      depth: 1,
      journey: "",
      view: {
        ...state.view,
        mode: "anatomy",
        model,
        selected: model === "orchid" ? "lip" : "petal",
        compare: "",
        isolate: false,
        hidden: [],
      },
      branch: "petal",
    });
  }
  function applyJourney(id: string, step = 0) {
    const j = catalog?.journeys.find((x) => x.id === id);
    if (!j) return;
    const i = Math.max(0, Math.min(step, j.steps.length - 1));
    patch({
      view: normalizeState({ ...DEFAULT_STATE, ...j.steps[i].view }),
      depth: j.steps[i].view.mode === "specimen" ? 0 : 1,
      journey: id,
      step: i,
      branch: branchForPart(j.steps[i].view.selected ?? "") ?? "petal",
    });
    setPanel("");
    setPlaying(false);
  }
  function exploreLegacy(view: Record<string, unknown>) {
    setState(normalizeExploration({ view: { ...DEFAULT_STATE, ...view } }));
    closePanel();
  }
  function closePanel() {
    setPanel("");
    if (route.pathname !== "/")
      navigate("/" + explorationSearch(state), { replace: true });
  }
  function save() {
    try {
      localStorage.setItem("floraria.notebook.v2", exportExploration(state));
      setSaved(state);
      setNotice(
        say(
          "Exploration and notes saved on this device.",
          "Exploración y notas guardadas en este dispositivo.",
        ),
      );
    } catch {
      setNotice(
        say(
          "Storage unavailable. Export a file to keep your work.",
          "Almacenamiento no disponible. Exporta un archivo para conservar tu trabajo.",
        ),
      );
    }
  }
  async function share() {
    const url = new URL(import.meta.env.BASE_URL, window.location.origin);
    url.search = explorationSearch(state);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice(
        say(
          "Exploration link copied. Personal notes stay private.",
          "Enlace copiado. Tus notas personales quedan privadas.",
        ),
      );
    } catch {
      download("floraria-link.txt", url.href, "text/plain");
    }
  }
  async function importFile(f?: File) {
    if (!f) return;
    try {
      if (f.size > 65536) throw new Error();
      setState(importExploration(await f.text()));
      setNotice(say("Exploration restored.", "Exploración restaurada."));
    } catch {
      setNotice(
        say(
          "Invalid exploration. Choose a FLORARIA JSON file under 64 KB.",
          "Exploración inválida. Elige un archivo JSON de FLORARIA de menos de 64 KB.",
        ),
      );
    }
    if (file.current) file.current.value = "";
  }
  function snapshot() {
    try {
      if (state.depth < 2) {
        if (!viewer.current) throw new Error();
        const a = document.createElement("a");
        a.download = "floraria-observation.png";
        a.href = viewer.current.snapshot();
        a.click();
      } else {
        const svg = document.querySelector(
          ".fs-stage [data-micro-branch] > svg",
        ) as SVGSVGElement | null;
        if (!svg) throw new Error();
        const clone = svg.cloneNode(true) as SVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const title = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "title",
        );
        title.textContent =
          "FLORARIA original educational diagram; not a microscope image or measured specimen. See the accompanying exploration JSON and sources.";
        clone.prepend(title);
        const { width, height } = svg.viewBox.baseVal;
        clone.setAttribute("viewBox", `0 0 ${width} ${height + 50}`);
        clone.style.cssText = `display:block;width:${width}px;height:${height + 50}px`;
        const background = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        background.setAttribute("width", String(width));
        background.setAttribute("height", String(height + 50));
        background.setAttribute(
          "fill",
          theme === "dark" ? "#161f1c" : "#f8f7f2",
        );
        clone.prepend(background);
        const credit = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        credit.setAttribute("x", "16");
        credit.setAttribute("y", String(height + 22));
        credit.setAttribute("fill", theme === "dark" ? "#edf0e4" : "#233e36");
        credit.setAttribute("font-family", "Arial, sans-serif");
        credit.setAttribute("font-size", "12");
        credit.textContent = say(
          "FLORARIA · Educational illustration, not to scale · floraria.fasl-work.com",
          "FLORARIA · Ilustración educativa, sin escala métrica · floraria.fasl-work.com",
        );
        clone.append(credit);
        download(
          "floraria-micro-observation.svg",
          new XMLSerializer().serializeToString(clone),
          "image/svg+xml",
        );
      }
    } catch {
      setNotice(
        say(
          "Wait until the view is ready before exporting.",
          "Espera a que la vista esté lista antes de exportar.",
        ),
      );
    }
  }
  const icon = (
    label: string,
    child: ReactNode,
    action: () => void,
    active = false,
  ) => (
    <button
      className={"fs-icon" + (active ? " active" : "")}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      onClick={action}
    >
      {child}
    </button>
  );
  if (error)
    return (
      <main className="fs-boot">
        <Flower2 size={48} />
        <h1>FLORARIA</h1>
        <p>
          {say(
            "The collection could not load.",
            "No se pudo cargar la colección.",
          )}
        </p>
        <button onClick={() => location.reload()}>
          {say("Reload collection", "Recargar colección")}
        </button>
      </main>
    );
  if (!catalog)
    return (
      <main className="fs-boot" role="status">
        <Flower2 size={48} />
        <h1>FLORARIA</h1>
        <p>
          {say(
            "Opening the botanical collection",
            "Abriendo la colección botánica",
          )}
        </p>
      </main>
    );
  const specimen = catalog.specimens.find((s) => s.id === state.view.specimen)!;
  const selected = catalog.structures.find((s) => s.id === state.view.selected);
  const branch = BRANCHES.find((b) => b.id === state.branch)!;
  const journey = catalog.journeys.find((j) => j.id === state.journey);
  const step = journey?.steps[Math.min(state.step, journey.steps.length - 1)];
  const micro = state.depth >= 2;
  const sourceIds =
    state.depth === 0
      ? specimen.sourceIds
      : (selected?.sourceIds ?? ["osu-reproductive"]);
  const compare = catalog.specimens.find((s) => s.id === state.view.compare);
  const range = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    min = 0,
    max = 1,
  ) => (
    <label className="fs-range">
      <span>
        {label}
        <output>{Math.round(((value - min) / (max - min)) * 100)}%</output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step="0.01"
        value={value}
        onChange={(e) => {
          setPlaying(false);
          onChange(Number(e.target.value));
        }}
      />
    </label>
  );

  return (
    <CitationsProvider items={catalog.sources}>
      <div className={"fs-app" + (focus ? " fs-focus" : "")}>
        <header className="fs-masthead">
          <button
            className="fs-brand"
            onClick={() => {
              depth(0);
              setFocus(false);
            }}
            aria-label={say("FLORARIA collection", "Colección FLORARIA")}
          >
            <Flower2 size={31} strokeWidth={1.2} />
            <span>
              FLORARIA
              <small>
                {say("THE BOTANICAL EXPLORER", "EL EXPLORADOR BOTÁNICO")}
              </small>
            </span>
          </button>
          <nav aria-label={say("Main navigation", "Navegación principal")}>
            <button
              className={panel === "" ? "active" : ""}
              onClick={() => setPanel("")}
            >
              <Compass size={16} />
              {say("Explore", "Explorar")}
            </button>
            <button onClick={() => setPanel("journeys")}>
              <Leaf size={16} />
              {say("Investigations", "Recorridos")}
            </button>
            <button onClick={() => setPanel("library")}>
              <BookOpen size={16} />
              {say("Field guide", "Guía")}
            </button>
          </nav>
          <div className="fs-header-tools">
            <button
              className="fs-lang"
              aria-label={say("Switch to Spanish", "Cambiar a inglés")}
              onClick={() => setLang(es ? "en" : "es")}
            >
              {es ? "EN" : "ES"}
            </button>
            {icon(
              say("Change colour theme", "Cambiar tema"),
              theme === "dark" ? <Sun size={18} /> : <Moon size={18} />,
              () => setTheme(theme === "dark" ? "light" : "dark"),
            )}
            {icon(
              say("Field notebook", "Cuaderno de campo"),
              <Bookmark size={18} />,
              () => setPanel("notebook"),
            )}
            {icon(
              say("About this collection", "Acerca de la colección"),
              <Info size={18} />,
              () => setPanel("about"),
            )}
          </div>
        </header>
        <div className="fs-workspace">
          <aside
            className="fs-collection"
            aria-label={say("Specimen collection", "Colección de ejemplares")}
          >
            <div className="fs-collection-head">
              <span className="fs-eyebrow">
                01 / {say("COLLECTION", "COLECCIÓN")}
              </span>
              <h2>
                {say("Five flowers.", "Cinco flores.")}
                <em>{say("Countless questions.", "Infinitas preguntas.")}</em>
              </h2>
              <p>
                {say(
                  "Real orchid specimens, digitised by the Smithsonian.",
                  "Orquídeas reales, digitalizadas por el Smithsonian.",
                )}
              </p>
            </div>
            <div className="fs-specimens">
              {catalog.specimens.map((s, i) => (
                <button
                  key={s.id}
                  className={
                    "fs-specimen" +
                    (s.id === state.view.specimen ? " active" : "")
                  }
                  aria-pressed={s.id === state.view.specimen}
                  onClick={() => {
                    patch({
                      depth: 0,
                      journey: "",
                      view: {
                        ...state.view,
                        mode: "specimen",
                        specimen: s.id,
                        compare:
                          s.id === state.view.compare ? "" : state.view.compare,
                      },
                    });
                  }}
                >
                  <span className="fs-thumb">
                    <img
                      src={`${import.meta.env.BASE_URL}specimens/${s.id}.webp`}
                      alt=""
                    />
                  </span>
                  <span>
                    <small>0{i + 1}</small>
                    <strong>{s.scientificName.split(" ")[0]}</strong>
                    <em>{t(s.commonName)}</em>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
            <button
              className="fs-collection-link"
              onClick={() => {
                setGuide("benchmark");
                setPanel("library");
              }}
            >
              {say("Collection records", "Fichas de la colección")}
              <ArrowRight size={15} />
            </button>
            <div className="fs-collection-foot">
              <span className="fs-live-dot" />
              {say(
                "Open collection · No account",
                "Colección abierta · Sin cuenta",
              )}
            </div>
          </aside>

          <main className="fs-instrument">
            <div
              className="fs-breadcrumb"
              aria-label={say("Exploration path", "Ruta de exploración")}
            >
              <button onClick={() => depth(0)}>
                {specimen.scientificName.split(" ")[0]}
              </button>
              {state.depth > 0 && (
                <>
                  <ChevronRight size={12} />
                  <button onClick={() => depth(1)}>
                    {say("Flower anatomy", "Anatomía floral")}
                  </button>
                </>
              )}
              {micro && (
                <>
                  <ChevronRight size={12} />
                  <span>{es ? branch.es : branch.en}</span>
                </>
              )}
              <span className="fs-evidence">
                {state.depth === 0
                  ? "SMITHSONIAN · CC0"
                  : say("TEACHING MODEL", "MODELO DIDÁCTICO")}
              </span>
            </div>
            <section
              className={"fs-stage" + (micro ? " is-micro" : "")}
              aria-label={say("Botanical observation", "Observación botánica")}
              data-depth={state.depth}
            >
              <div className="fs-stage-heading">
                <span className="fs-eyebrow">
                  {micro
                    ? say("BEYOND THE VISIBLE", "MÁS ALLÁ DE LO VISIBLE")
                    : state.depth === 1
                      ? say("THE PARTS & THE WHOLE", "LAS PARTES Y EL TODO")
                      : say("LOOK CLOSER", "MIRA MÁS CERCA")}
                </span>
                <h1>
                  {micro
                    ? branch.question[es ? 1 : 0]
                    : state.depth === 0
                      ? t(specimen.commonName)
                      : state.view.mode === "lifecycle"
                        ? say("From pollen to seed", "Del polen a la semilla")
                        : say(
                            "The architecture of a flower",
                            "La arquitectura de una flor",
                          )}
                </h1>
                {!micro && (
                  <p>
                    {state.depth === 0
                      ? specimen.scientificName
                      : state.view.model === "orchid"
                        ? say(
                            "Orchid morphology · original 3D illustration",
                            "Morfología de orquídea · ilustración 3D original",
                          )
                        : say(
                            "General angiosperm · original 3D illustration",
                            "Angiosperma general · ilustración 3D original",
                          )}
                  </p>
                )}
              </div>
              {micro ? (
                <MicroViewer
                  branch={state.branch}
                  depth={
                    state.depth === 2
                      ? "tissue"
                      : state.depth === 3
                        ? "cell"
                        : "organelle"
                  }
                  selected={state.microSelected}
                  onSelect={(id) => patch({ microSelected: id })}
                  onDrill={(id, nextDepth) =>
                    patch({
                      microSelected: id,
                      depth:
                        nextDepth === "tissue"
                          ? 2
                          : nextDepth === "cell"
                            ? 3
                            : 4,
                    })
                  }
                  lang={lang}
                  theme={theme}
                  progress={state.progress}
                />
              ) : (
                <Viewer
                  catalog={catalog}
                  state={state.view}
                  onSelect={selectPart}
                  handle={handle}
                />
              )}
              <div className="fs-stage-tools">
                {!micro && (
                  <>
                    {icon(
                      say("Reset camera", "Restablecer cámara"),
                      <RotateCcw size={17} />,
                      () => viewer.current?.home(),
                    )}
                    {icon(
                      say("Focus selection", "Enfocar selección"),
                      <Focus size={17} />,
                      () => viewer.current?.focus(),
                    )}
                  </>
                )}
                {icon(
                  playing
                    ? say("Pause motion", "Pausar movimiento")
                    : say("Play motion", "Animar"),
                  playing ? <Pause size={17} /> : <Play size={17} />,
                  () => {
                    if (
                      !playing &&
                      state.view.mode === "lifecycle" &&
                      state.view.stage >= 1
                    )
                      patchView({ stage: 0 });
                    setPlaying(!playing);
                  },
                  playing,
                )}
                {icon(
                  say("View controls", "Controles de vista"),
                  <SlidersHorizontal size={17} />,
                  () => setPanel("tools"),
                )}
                {icon(
                  focus
                    ? say("Exit focus", "Salir de enfoque")
                    : say("Focus view", "Vista enfocada"),
                  <Maximize2 size={17} />,
                  () => setFocus(!focus),
                  focus,
                )}
              </div>
              {!micro && (
                <div className="fs-stage-hint">
                  <span className="fs-drag-glyph">↔</span>
                  {say(
                    "Drag to orbit · Scroll to magnify",
                    "Arrastra para girar · Desplaza para ampliar",
                  )}
                </div>
              )}
              {state.depth === 0 && (
                <button className="fs-enter" onClick={() => openAnatomy()}>
                  <span>
                    {say("What lies beneath?", "¿Qué hay bajo la superficie?")}
                  </span>
                  <strong>
                    {say("Explore its anatomy", "Explora su anatomía")}
                    <ArrowRight size={18} />
                  </strong>
                </button>
              )}
              {compare && state.depth === 0 && (
                <div className="fs-compare-caption">
                  <span>{specimen.scientificName}</span>
                  <span>{compare.scientificName}</span>
                </div>
              )}
            </section>
            <div className="fs-depth-strip">
              <span className="fs-depth-label">
                <Layers3 size={16} />
                {say("Go deeper", "Ve más allá")}
              </span>
              <nav aria-label={say("Detail level", "Nivel de detalle")}>
                {DEPTHS.map((names, i) => (
                  <button
                    key={i}
                    aria-current={state.depth === i ? "step" : undefined}
                    className={
                      state.depth === i
                        ? "active"
                        : state.depth > i
                          ? "visited"
                          : ""
                    }
                    onClick={() => depth(i as Depth)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {names[es ? 1 : 0]}
                    {i < 4 && <ChevronRight size={12} />}
                  </button>
                ))}
              </nav>
            </div>
            {step && journey && (
              <section className="fs-journey-player">
                <button
                  className="fs-icon"
                  aria-label={say("Previous step", "Paso anterior")}
                  disabled={state.step === 0}
                  onClick={() => applyJourney(journey.id, state.step - 1)}
                >
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <small>
                    {t(journey.title)} · {state.step + 1}/{journey.steps.length}
                  </small>
                  <strong>{t(step.title)}</strong>
                  <p>{t(step.body)}</p>
                </div>
                <button
                  className="fs-icon"
                  aria-label={say("Next step", "Paso siguiente")}
                  disabled={state.step === journey.steps.length - 1}
                  onClick={() => applyJourney(journey.id, state.step + 1)}
                >
                  <ArrowRight size={17} />
                </button>
                <button
                  className="fs-icon"
                  aria-label={say("End investigation", "Terminar recorrido")}
                  onClick={() => patch({ journey: "" })}
                >
                  <X size={16} />
                </button>
              </section>
            )}
          </main>

          <aside
            className="fs-context"
            aria-label={say("Observation details", "Detalles de observación")}
          >
            <div className="fs-context-title">
              <span className="fs-eyebrow">
                {String(state.depth + 1).padStart(2, "0")} /{" "}
                {DEPTHS[state.depth][es ? 1 : 0].toUpperCase()}
              </span>
              {icon(
                say("Copy exploration link", "Copiar enlace"),
                <Share2 size={16} />,
                share,
              )}
            </div>
            <div className="fs-context-body">
              {state.depth === 0 ? (
                <>
                  <h2>
                    {say("A flower is a system.", "Una flor es un sistema.")}
                  </h2>
                  <p>{t(specimen.description)}</p>
                  <dl className="fs-facts">
                    {specimen.facts.map((f, i) => (
                      <div key={i}>
                        <dt>{t(f.label)}</dt>
                        <dd>{t(f.value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <label className="fs-select-label">
                    {say("Compare another specimen", "Compara otro ejemplar")}
                    <select
                      aria-label={say("Compare specimen", "Comparar ejemplar")}
                      value={state.view.compare}
                      onChange={(e) => patchView({ compare: e.target.value })}
                    >
                      <option value="">
                        {say("Choose a second flower", "Elige otra flor")}
                      </option>
                      {catalog.specimens
                        .filter((s) => s.id !== state.view.specimen)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.scientificName}
                          </option>
                        ))}
                    </select>
                  </label>
                  {compare && (
                    <p className="fs-note">
                      {say(
                        "Both scans are fitted independently. Compare form, not physical size.",
                        "Ambos escaneos se ajustan por separado. Compara la forma, no el tamaño físico.",
                      )}
                    </p>
                  )}
                  <div className="fs-question">
                    <span>
                      {say("FOLLOW A QUESTION", "SIGUE UNA PREGUNTA")}
                    </span>
                    {BRANCHES.map((b) => (
                      <button key={b.id} onClick={() => depth(2, b.id)}>
                        {b.question[es ? 1 : 0]}
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                </>
              ) : state.depth === 1 ? (
                <>
                  <div className="fs-model-toggle">
                    <button
                      className={
                        state.view.model === "orchid" &&
                        state.view.mode !== "lifecycle"
                          ? "active"
                          : ""
                      }
                      onClick={() => openAnatomy("orchid")}
                    >
                      {say("Orchid", "Orquídea")}
                    </button>
                    <button
                      className={
                        state.view.model === "general" &&
                        state.view.mode !== "lifecycle"
                          ? "active"
                          : ""
                      }
                      onClick={() => openAnatomy("general")}
                    >
                      {say("General flower", "Flor general")}
                    </button>
                  </div>
                  <label className="fs-search">
                    <Search size={15} />
                    <input
                      aria-label={say("Find an organ", "Buscar un órgano")}
                      placeholder={say("Find an organ…", "Busca un órgano…")}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="fs-parts">
                    {catalog.structures
                      .filter(
                        (s) =>
                          s.models.includes(state.view.model) &&
                          (t(s.label) + s.id)
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((s) => (
                        <button
                          key={s.id}
                          aria-pressed={state.view.selected === s.id}
                          className={
                            state.view.selected === s.id ? "active" : ""
                          }
                          onClick={() => selectPart(s.id)}
                        >
                          {t(s.label)}
                          {state.view.selected === s.id && <Check size={13} />}
                        </button>
                      ))}
                  </div>
                  <h2>
                    {selected
                      ? t(selected.label)
                      : say("Select an organ", "Selecciona un órgano")}
                  </h2>
                  <p>
                    {selected
                      ? t(selected.detail)
                      : say(
                          "Click a part of the flower or choose a name above. Its role and connections appear here.",
                          "Haz clic en una parte de la flor o elige un nombre. Aquí aparecen su función y conexiones.",
                        )}
                  </p>
                  {selected && (
                    <div className="fs-inline-actions">
                      <button
                        onClick={() =>
                          patchView({
                            isolate: !state.view.isolate,
                            hidden: state.view.hidden.filter(
                              (id) => id !== selected.id,
                            ),
                          })
                        }
                      >
                        <Focus size={15} />
                        {state.view.isolate
                          ? say("Restore flower", "Restaurar flor")
                          : say("Isolate part", "Aislar parte")}
                      </button>
                      <button
                        onClick={() =>
                          patchView({
                            isolate: false,
                            hidden: state.view.hidden.includes(selected.id)
                              ? state.view.hidden.filter(
                                  (x) => x !== selected.id,
                                )
                              : [...state.view.hidden, selected.id],
                          })
                        }
                      >
                        <Eye size={15} />
                        {state.view.hidden.includes(selected.id)
                          ? say("Show", "Mostrar")
                          : say("Hide", "Ocultar")}
                      </button>
                    </div>
                  )}
                  {selected && branchForPart(selected.id) && (
                    <button
                      className="fs-primary"
                      onClick={() => depth(2, branchForPart(selected.id)!)}
                    >
                      <Microscope size={18} />
                      {say(
                        "Explore related tissue",
                        "Explorar el tejido relacionado",
                      )}
                      <ArrowDown size={16} />
                    </button>
                  )}
                  {range(
                    say("Separate organs", "Separar órganos"),
                    state.view.explode,
                    (v) => patchView({ explode: v }),
                  )}
                  <button
                    className="fs-secondary"
                    onClick={() =>
                      patch({
                        depth: 1,
                        view: {
                          ...DEFAULT_STATE,
                          mode: "lifecycle",
                          model: "general",
                          selected: "pollen",
                          stage: 0,
                        },
                      })
                    }
                  >
                    {say(
                      "Follow pollen to seed",
                      "Sigue del polen a la semilla",
                    )}
                    <ArrowRight size={16} />
                  </button>
                  {state.view.mode === "lifecycle" && (
                    <>
                      {range(
                        say("Reproductive sequence", "Secuencia reproductiva"),
                        state.view.stage,
                        (v) => patchView({ stage: v }),
                      )}
                      <p className="fs-note">
                        {say(
                          "A conceptual sequence, not a growth-rate or elapsed-time simulation.",
                          "Secuencia conceptual, no simulación de velocidad de crecimiento ni tiempo transcurrido.",
                        )}
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2>{es ? branch.es : branch.en}</h2>
                  <p>{branch.explanation[es ? 1 : 0]}</p>
                  <div className="fs-micro-route">
                    {DEPTHS.slice(2).map((names, i) => (
                      <button
                        key={i}
                        className={state.depth === i + 2 ? "active" : ""}
                        onClick={() => depth((i + 2) as Depth)}
                      >
                        <span>{i + 1}</span>
                        <div>
                          <strong>{names[es ? 1 : 0]}</strong>
                          <small>
                            {i === 0
                              ? say(
                                  "How cells are organised",
                                  "Cómo se organizan las células",
                                )
                              : i === 1
                                ? say("What a cell does", "Qué hace una célula")
                                : say(
                                    "The structures behind the function",
                                    "Las estructuras que permiten la función",
                                  )}
                          </small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                  {range(
                    say("Explore the process", "Explora el proceso"),
                    state.progress,
                    (v) => patch({ progress: v }),
                  )}
                  {state.depth < 4 && (
                    <button
                      className="fs-primary"
                      onClick={() => depth((state.depth + 1) as Depth)}
                    >
                      {say("Continue inside", "Continúa al interior")}
                      <ArrowDown size={17} />
                    </button>
                  )}
                  <h3>{say("Choose another pathway", "Elige otra ruta")}</h3>
                  <div className="fs-branch-list">
                    {BRANCHES.filter((b) => b.id !== state.branch).map((b) => (
                      <button key={b.id} onClick={() => depth(2, b.id)}>
                        {es ? b.es : b.en}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {!micro && (
                <details className="fs-sources">
                  <summary>
                    {say(
                      "Sources & observation limits",
                      "Fuentes y límites de observación",
                    )}
                  </summary>
                  <p>
                    {state.depth === 0
                      ? say(
                          "This is a digitised outer surface. Its internal tissues and cells were not captured by this scan.",
                          "Es una superficie externa digitalizada. Este escaneo no capturó sus tejidos ni células internos.",
                        )
                      : say(
                          "This is an original explanatory model. Colour and proportions distinguish structures; they are not measurements from the selected specimen.",
                          "Es un modelo explicativo original. El color y las proporciones distinguen estructuras; no son mediciones del ejemplar elegido.",
                        )}
                  </p>
                  {sourceIds.map((id) => {
                    const s = catalog.sources.find((x) => x.id === id);
                    return s ? (
                      <a key={id} href={s.url} target="_blank" rel="noreferrer">
                        {s.label} ↗
                      </a>
                    ) : null;
                  })}
                </details>
              )}
            </div>
            <button
              className="fs-note-action"
              onClick={() => setPanel("notebook")}
            >
              <Bookmark size={17} />
              {say("Keep an observation", "Guarda una observación")}
              <ArrowRight size={15} />
            </button>
          </aside>
        </div>
        <footer className="fs-footer">
          <span>
            FLORARIA <b>·</b>{" "}
            {say(
              "An open botanical collection",
              "Una colección botánica abierta",
            )}
          </span>
          <span>
            {say(
              "Original teaching models + Smithsonian CC0 scans",
              "Modelos didácticos originales + escaneos Smithsonian CC0",
            )}
          </span>
          <a
            href="https://github.com/fsantibanezleal/CAOS_Floraria"
            target="_blank"
            rel="noreferrer"
          >
            {say("Source & data", "Código y datos")} ↗
          </a>
        </footer>
        {notice && (
          <div className="fs-toast" role="status">
            <Check size={16} />
            {notice}
          </div>
        )}
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void importFile(e.target.files?.[0])}
        />

        {panel === "journeys" && (
          <Modal
            title={say("Follow your curiosity", "Sigue tu curiosidad")}
            close={closePanel}
            wide
          >
            <p className="fs-modal-intro">
              {say(
                "Twelve guided investigations. Every step changes the view and gives you something specific to observe.",
                "Doce recorridos guiados. Cada paso cambia la vista y propone algo concreto que observar.",
              )}
            </p>
            <div className="fs-journeys">
              {catalog.journeys.map((j, i) => (
                <button key={j.id} onClick={() => applyJourney(j.id)}>
                  <span>
                    {String(i + 1).padStart(2, "0")}
                    <Leaf size={20} />
                  </span>
                  <h3>{t(j.title)}</h3>
                  <p>{t(j.question)}</p>
                  <small>
                    {j.steps.length}{" "}
                    {say("connected observations", "observaciones conectadas")}
                    <ArrowRight size={17} />
                  </small>
                </button>
              ))}
            </div>
          </Modal>
        )}
        {panel === "library" && (
          <Modal
            title={say("The field guide", "La guía de campo")}
            close={closePanel}
            wide
          >
            <nav className="fs-library-nav">
              {[
                ["introduction", "Observation", "Observación"],
                ["methodology", "Morphology", "Morfología"],
                ["benchmark", "Collection", "Colección"],
                ["implementation", "Methods & data", "Métodos y datos"],
              ].map(([id, en, spanish]) => (
                <button
                  key={id}
                  className={guide === id ? "active" : ""}
                  onClick={() => setGuide(id)}
                >
                  {es ? spanish : en}
                </button>
              ))}
            </nav>
            <GuidePage
              page={guide}
              catalog={catalog}
              onExplore={exploreLegacy}
            />
          </Modal>
        )}
        {panel === "notebook" && (
          <Modal
            title={say("Your field notebook", "Tu cuaderno de campo")}
            close={closePanel}
          >
            <p>
              {say(
                "Keep the view, level, selected structures and your own notes. Everything stays in this browser unless you export it.",
                "Conserva la vista, el nivel, las estructuras seleccionadas y tus notas. Todo permanece en este navegador salvo que lo exportes.",
              )}
            </p>
            <label className="fs-note-label">
              {say("What did you notice?", "¿Qué observaste?")}
              <textarea
                maxLength={10000}
                rows={7}
                value={state.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder={say(
                  "Describe a structure, compare two flowers, or write a question to investigate…",
                  "Describe una estructura, compara dos flores o escribe una pregunta para investigar…",
                )}
              />
            </label>
            <div className="fs-action-grid">
              <button onClick={save}>
                <Bookmark size={17} />
                {say("Save on this device", "Guardar en este dispositivo")}
              </button>
              <button
                disabled={!saved}
                onClick={() => {
                  if (saved) setState(saved);
                  closePanel();
                }}
              >
                <RotateCcw size={17} />
                {say("Restore saved view", "Restaurar vista guardada")}
              </button>
              <button
                onClick={() =>
                  download(
                    "floraria-exploration.json",
                    exportExploration(state),
                  )
                }
              >
                <ArrowDownToLine size={17} />
                {say("Export exploration", "Exportar exploración")}
              </button>
              <button onClick={() => file.current?.click()}>
                <Upload size={17} />
                {say("Import exploration", "Importar exploración")}
              </button>
              <button onClick={share}>
                <Share2 size={17} />
                {say("Copy share link", "Copiar enlace")}
              </button>
              <button onClick={snapshot}>
                <ArrowDownToLine size={17} />
                {say("Export current image", "Exportar imagen actual")}
              </button>
            </div>
            <p className="fs-note">
              {say(
                "Share links exclude personal notes. Original FLORARIA exploration files remain compatible.",
                "Los enlaces no incluyen notas personales. Los archivos de exploración originales de FLORARIA siguen siendo compatibles.",
              )}
            </p>
          </Modal>
        )}
        {panel === "tools" && (
          <Modal
            title={say("Make the view your own", "Ajusta tu vista")}
            close={closePanel}
          >
            {!micro ? (
              <>
                <h3>{say("Camera", "Cámara")}</h3>
                <div className="fs-camera-presets">
                  {(["front", "top", "side", "back"] as const).map((v, i) => (
                    <button
                      key={v}
                      className={state.view.camera === v ? "active" : ""}
                      onClick={() => patchView({ camera: v })}
                    >
                      {es
                        ? ["Frente", "Arriba", "Lado", "Atrás"][i]
                        : ["Front", "Top", "Side", "Back"][i]}
                    </button>
                  ))}
                </div>
                <p className="fs-note">
                  {say(
                    "The stage also supports arrow keys to rotate, + / − to zoom and Home to reset.",
                    "La escena permite girar con las flechas, ampliar con + / − y restablecer con Inicio.",
                  )}
                </p>
                {state.depth === 0 ? (
                  <label className="fs-checkbox">
                    <input
                      type="checkbox"
                      checked={state.view.quality === "detail"}
                      onChange={(e) =>
                        patchView({
                          quality: e.target.checked ? "detail" : "preview",
                        })
                      }
                    />
                    {say("Fine surface detail", "Detalle fino de superficie")} (
                    {(specimen.detail.bytes / 1e6).toFixed(2)} MB)
                  </label>
                ) : (
                  <>
                    {range(
                      say("Separate organs", "Separar órganos"),
                      state.view.explode,
                      (v) => patchView({ explode: v }),
                    )}
                    {range(
                      say("Open the flower", "Abrir la flor"),
                      state.view.bloom,
                      (v) => patchView({ bloom: v }),
                    )}
                    <label className="fs-checkbox">
                      <input
                        type="checkbox"
                        checked={state.view.cutEnabled}
                        onChange={(e) =>
                          patchView({ cutEnabled: e.target.checked })
                        }
                      />
                      {say("Section through the model", "Seccionar el modelo")}
                    </label>
                    {state.view.cutEnabled && (
                      <>
                        <label className="fs-select-label">
                          {say("Section axis", "Eje de sección")}
                          <select
                            value={state.view.cutAxis}
                            onChange={(e) =>
                              patchView({
                                cutAxis: e.target.value as "x" | "y" | "z",
                              })
                            }
                          >
                            <option>x</option>
                            <option>y</option>
                            <option>z</option>
                          </select>
                        </label>
                        {range(
                          say("Section position", "Posición de la sección"),
                          state.view.cut,
                          (v) => patchView({ cut: v }),
                          -1,
                          1,
                        )}
                      </>
                    )}
                    <label className="fs-checkbox">
                      <input
                        type="checkbox"
                        checked={state.view.labels}
                        onChange={(e) =>
                          patchView({ labels: e.target.checked })
                        }
                      />
                      {say(
                        "Show selected label",
                        "Mostrar etiqueta seleccionada",
                      )}
                    </label>
                  </>
                )}
              </>
            ) : (
              <>
                {range(
                  say("Explore the process", "Explora el proceso"),
                  state.progress,
                  (v) => patch({ progress: v }),
                )}
                <p>
                  {say(
                    "Click or keyboard-select structures in the diagram to inspect their roles. The sequence is conceptual and is not a timing or measurement model.",
                    "Haz clic o selecciona estructuras con el teclado para examinar sus funciones. La secuencia es conceptual y no mide tiempos ni dimensiones.",
                  )}
                </p>
              </>
            )}
            <button
              className="fs-secondary"
              onClick={() => {
                patchView({
                  hidden: [],
                  isolate: false,
                  explode: 0,
                  bloom: 1,
                  cutEnabled: false,
                });
                viewer.current?.home();
              }}
            >
              {say("Restore all structures", "Restaurar todas las estructuras")}
              <RotateCcw size={16} />
            </button>
          </Modal>
        )}
        {panel === "about" && (
          <Modal
            title={say(
              "A world within a flower",
              "Un mundo dentro de una flor",
            )}
            close={closePanel}
          >
            <Flower2 size={54} strokeWidth={1} />
            <p>
              {say(
                "FLORARIA connects a museum collection with the structures and processes that make a flower work. Start with a real specimen, compare its form, then enter a clearly identified teaching model to investigate organs, tissues, cells and subcellular structures.",
                "FLORARIA conecta una colección de museo con las estructuras y los procesos de una flor. Comienza con un ejemplar real, compara su forma y entra en un modelo didáctico identificado para investigar órganos, tejidos, células y estructuras subcelulares.",
              )}
            </p>
            <dl className="fs-facts">
              <div>
                <dt>{say("Specimens", "Ejemplares")}</dt>
                <dd>5 · Smithsonian Gardens · CC0</dd>
              </div>
              <div>
                <dt>{say("Original models", "Modelos originales")}</dt>
                <dd>
                  {say(
                    "General flower, orchid and four microscopic pathways",
                    "Flor general, orquídea y cuatro rutas microscópicas",
                  )}
                </dd>
              </div>
              <div>
                <dt>{say("Your data", "Tus datos")}</dt>
                <dd>
                  {say(
                    "Local notebook. No account, analytics or application server.",
                    "Cuaderno local. Sin cuenta, analítica ni servidor de aplicación.",
                  )}
                </dd>
              </div>
            </dl>
            <button
              className="fs-primary"
              onClick={() => {
                setGuide("implementation");
                setPanel("library");
              }}
            >
              {say(
                "Read the methods and data sources",
                "Lee los métodos y las fuentes",
              )}
              <ArrowRight size={17} />
            </button>
            <a
              className="fs-repo-link"
              href="https://github.com/fsantibanezleal/CAOS_Floraria"
              target="_blank"
              rel="noreferrer"
            >
              GitHub · Apache-2.0 ↗
            </a>
          </Modal>
        )}
      </div>
    </CitationsProvider>
  );
}
