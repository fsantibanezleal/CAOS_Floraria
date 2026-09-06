import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router";
import {
  AppShell,
  CitationsProvider,
  Refs,
  Tabs,
  applyTheme,
  useShellLang,
  useThemeStore,
  type ShellConfig,
} from "@fasl-work/caos-app-shell";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Flower2,
  Focus,
  Home,
  Layers3,
  Leaf,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import type { Catalog, Journey, Localized } from "./lib/catalog.types";
import { loadCatalog } from "./lib/catalog";
import {
  DEFAULT_STATE,
  exportState,
  normalizeState,
  parseStateFile,
  stageIndex,
  stateFromUrl,
  stateSearch,
  type AtlasState,
} from "./lib/state";
import { Viewer, type ViewerHandle } from "./render/Viewer";
import { GuidePage } from "./GuidePages";
import { architecture } from "./architecture";

const L = (en: string, es: string): Localized => ({ en, es });
const STAGES = [
  L("A flower opens", "Se abre una flor"),
  L("Pollen reaches the stigma", "El polen llega al estigma"),
  L("A pollen tube grows", "Crece el tubo polínico"),
  L("Fertilization can follow", "Puede ocurrir la fecundación"),
  L("Ovules become seeds", "Los óvulos se vuelven semillas"),
];
const descriptions = [
  L(
    "A complete flower presents its reproductive organs. Use the slider to reveal the sequence.",
    "Una flor completa presenta sus órganos reproductivos. Use el control para recorrer la secuencia.",
  ),
  L(
    "Pollination moves pollen from an anther to a receptive stigma. Arrival alone does not guarantee a seed.",
    "La polinización lleva polen desde una antera a un estigma receptivo. Su llegada por sí sola no garantiza una semilla.",
  ),
  L(
    "Compatible pollen can form a tube through the style. The gold path is an explanatory diagram, not a scan.",
    "El polen compatible puede formar un tubo a través del estilo. La trayectoria dorada es explicativa; no proviene de un escaneo.",
  ),
  L(
    "Fertilization occurs after successful pollen-tube growth. The diagram compresses a complex process into a few visible states.",
    "La fecundación ocurre tras un crecimiento exitoso del tubo polínico. El diagrama resume un proceso complejo en algunos estados visibles.",
  ),
  L(
    "After fertilization, ovules develop into seeds. The ovary can become the fruit; petals may wither. This is a general flowering-plant sequence.",
    "Tras la fecundación, los óvulos se desarrollan como semillas. El ovario puede formar el fruto y los pétalos se marchitan. Esta secuencia representa una angiosperma general.",
  ),
];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(false);
  const lang = useShellLang(),
    theme = useThemeStore((s) => s.theme),
    location = useLocation(),
    navigate = useNavigate();
  const [state, setState] = useState<AtlasState>(() =>
    stateFromUrl(window.location.search),
  );
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
    applyTheme(theme);
    document.documentElement.lang = lang;
  }, [theme, lang]);
  useEffect(() => {
    const shell = document.querySelector(".app-shell");
    shell?.classList.add("fixed");
  }, [catalog]);
  useEffect(() => {
    if (location.search) setState(stateFromUrl(location.search));
  }, [location.search]);
  const patch = useCallback(
    (value: Partial<AtlasState>) =>
      setState((s) => normalizeState({ ...s, ...value })),
    [],
  );
  const explore = (view: Record<string, unknown>) => {
    const next = normalizeState({ ...DEFAULT_STATE, ...view });
    setState(next);
    navigate("/" + stateSearch(next));
  };
  const config: ShellConfig = {
    product: { name: "FLORARIA", mark: <Flower2 size={23} /> },
    routes: [
      { path: "/", en: "Explore", es: "Explorar" },
      { path: "/introduction", en: "Field guide", es: "Guía" },
      { path: "/methodology", en: "Morphology", es: "Morfología" },
      { path: "/experiments", en: "Investigations", es: "Recorridos" },
      { path: "/benchmark", en: "Collection", es: "Colección" },
      { path: "/implementation", en: "How it works", es: "Cómo funciona" },
    ],
    links: { github: "https://github.com/fsantibanezleal/CAOS_Floraria" },
    version: "0.01.000",
    architecture,
    footer: {
      provenance: L("Smithsonian scans · CC0", "Escaneos Smithsonian · CC0"),
      disclaimer: L(
        "Apache-2.0 code · private repository · original teaching models",
        "Código Apache-2.0 · repositorio privado · modelos didácticos originales",
      ),
    },
  };
  return (
    <AppShell config={config}>
      <div className="fl-mobile-nav">
        <label className="sr-only" htmlFor="page-menu">
          {lang === "en" ? "Page" : "Página"}
        </label>
        <select
          id="page-menu"
          value={location.pathname}
          onChange={(e) => navigate(e.target.value)}
        >
          {config.routes?.map((r) => (
            <option key={r.path} value={r.path}>
              {r[lang]}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <div className="page-body prose">
          <h1>
            {lang === "en"
              ? "The collection could not load"
              : "No se pudo cargar la colección"}
          </h1>
          <p>
            {lang === "en"
              ? "Please reload to fetch the local collection files. No account or API key is needed."
              : "Recargue para obtener los archivos de la colección. No se necesita una cuenta ni una clave API."}
          </p>
          <button onClick={() => window.location.reload()}>
            {lang === "en" ? "Try again" : "Reintentar"}
          </button>
        </div>
      ) : !catalog ? (
        <div className="fl-boot" role="status">
          <Flower2 size={50} />
          <h1>FLORARIA</h1>
          <p>
            {lang === "en"
              ? "Opening the collection…"
              : "Abriendo la colección…"}
          </p>
        </div>
      ) : (
        <CitationsProvider items={catalog.sources}>
          <Routes>
            <Route
              path="/"
              element={
                <Atlas
                  catalog={catalog}
                  state={state}
                  patch={patch}
                  replace={(s) => setState(normalizeState(s))}
                />
              }
            />
            {[
              "introduction",
              "methodology",
              "implementation",
              "experiments",
              "benchmark",
            ].map((page) => (
              <Route
                key={page}
                path={"/" + page}
                element={
                  <GuidePage
                    page={page}
                    catalog={catalog}
                    onExplore={explore}
                  />
                }
              />
            ))}
            <Route
              path="*"
              element={
                <div className="page-body prose">
                  <h1>
                    {lang === "en"
                      ? "This trail ends here"
                      : "Este sendero termina aquí"}
                  </h1>
                  <Link to="/">
                    {lang === "en"
                      ? "Return to the flowers"
                      : "Volver a las flores"}
                  </Link>
                </div>
              }
            />
          </Routes>
        </CitationsProvider>
      )}
    </AppShell>
  );
}

function Atlas({
  catalog,
  state,
  patch,
  replace,
}: {
  catalog: Catalog;
  state: AtlasState;
  patch: (v: Partial<AtlasState>) => void;
  replace: (s: AtlasState) => void;
}) {
  const lang = useShellLang(),
    es = lang === "es",
    viewer = useRef<ViewerHandle | null>(null),
    file = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [focus, setFocus] = useState(false),
    [drawer, setDrawer] = useState(false),
    [details, setDetails] = useState(() => window.innerWidth > 1150),
    [playing, setPlaying] = useState(false),
    [notice, setNotice] = useState(""),
    [journeyId, setJourneyId] = useState(""),
    [step, setStep] = useState(0),
    [saved, setSaved] = useState<AtlasState | null>(null);
  const specimen =
      catalog.specimens.find((s) => s.id === state.specimen) ??
      catalog.specimens[0],
    selected = catalog.structures.find((s) => s.id === state.selected),
    journey = catalog.journeys.find((j) => j.id === journeyId);
  const structureList = catalog.structures.filter(
    (s) =>
      s.models.includes(state.model) &&
      (s.label.en + " " + s.label.es + " " + s.id)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const handle = useCallback((v: ViewerHandle | null) => {
    viewer.current = v;
  }, []);
  const t = (v: Localized) => v[lang];
  useEffect(() => {
    try {
      const s = localStorage.getItem("floraria.bookmark.v1");
      if (s) setSaved(parseStateFile(s, catalog));
    } catch {
      /* A corrupt bookmark never blocks the atlas. */
    }
  }, [catalog]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (document.hidden) {
        setPlaying(false);
        return;
      }
      if (state.mode === "lifecycle") {
        if (state.stage >= 1) setPlaying(false);
        else patch({ stage: Math.min(1, state.stage + 0.006) });
      } else viewer.current?.rotate();
    }, 100);
    return () => clearInterval(timer);
  }, [playing, state.stage, state.mode, patch]);
  useEffect(() => {
    setPlaying(false);
  }, [state.mode]);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => {
      if (m.matches) setPlaying(false);
    };
    m.addEventListener("change", listener);
    return () => m.removeEventListener("change", listener);
  }, []);
  function applyStep(j: Journey, i: number) {
    setJourneyId(j.id);
    setStep(i);
    replace(normalizeState({ ...DEFAULT_STATE, ...j.steps[i].view }));
    setPlaying(false);
    setDrawer(false);
  }
  function select(id: string) {
    if (id.startsWith("specimen:")) {
      const next = id.slice(9);
      if (next !== state.specimen)
        patch({ specimen: next, compare: state.specimen });
      setDetails(true);
    } else {
      patch({ selected: id, hidden: state.hidden.filter((h) => h !== id) });
      setDetails(true);
    }
  }
  function mode(value: string) {
    setPlaying(false);
    setJourneyId("");
    setQuery("");
    replace(
      normalizeState({
        ...DEFAULT_STATE,
        mode: value,
        specimen: state.specimen,
        model: state.model,
      }),
    );
    setDetails(false);
  }
  function reset() {
    replace({
      ...DEFAULT_STATE,
      mode: state.mode,
      model: state.model,
      specimen: state.specimen,
    });
    setPlaying(false);
    setJourneyId("");
    setQuery("");
    viewer.current?.home();
  }
  async function share() {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = stateSearch(state);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice(
        es
          ? "Enlace copiado: selección y controles."
          : "Link copied: selection and controls.",
      );
    } catch {
      download("floraria-link.txt", url.href, "text/plain");
      setNotice(
        es ? "Enlace guardado como archivo." : "Link saved as a text file.",
      );
    }
  }
  async function importView(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (f.size > 65536) throw new Error();
      replace(parseStateFile(await f.text(), catalog));
      setNotice(es ? "Exploración restaurada." : "Exploration restored.");
    } catch {
      setNotice(
        es
          ? "Archivo inválido. Use una exploración FLORARIA de hasta 64 KB."
          : "Invalid file. Use a FLORARIA exploration up to 64 KB.",
      );
    }
    e.target.value = "";
  }
  function save() {
    try {
      localStorage.setItem("floraria.bookmark.v1", exportState(state));
      setSaved(state);
      setNotice(
        es
          ? "Marcador guardado en este navegador."
          : "Bookmark saved in this browser.",
      );
    } catch {
      setNotice(
        es
          ? "El almacenamiento local no está disponible. Exporte el archivo."
          : "Local storage is unavailable. Export the file instead.",
      );
    }
  }
  function image() {
    try {
      if (!viewer.current) throw new Error("Viewer unavailable");
      const a = document.createElement("a");
      a.href = viewer.current.snapshot();
      a.download =
        "floraria-" +
        (state.mode === "specimen" ? state.specimen : state.model) +
        ".png";
      a.click();
    } catch {
      setNotice(
        es
          ? "No se pudo exportar la imagen. Espere a que la vista esté lista."
          : "The image could not be exported. Wait until the view is ready.",
      );
    }
  }
  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active = false,
  ) => (
    <button
      type="button"
      className={"fl-icon" + (active ? " active" : "")}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      onClick={action}
    >
      {icon}
    </button>
  );
  const range = (
    label: string,
    key: "explode" | "bloom" | "cut" | "stage",
    min = 0,
    max = 1,
  ) => (
    <label className="fl-range">
      <span>
        {label}
        <output>
          {key === "cut"
            ? state[key].toFixed(2)
            : Math.round(state[key] * 100) + "%"}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step="0.01"
        value={state[key]}
        onChange={(e) => {
          setPlaying(false);
          patch({ [key]: Number(e.target.value) });
        }}
      />
    </label>
  );
  const selection = (
    <>
      <label className="fl-label" htmlFor="view-mode">
        {es ? "Modo de exploración" : "Explore a different layer"}
      </label>
      <select
        id="view-mode"
        value={state.mode}
        onChange={(e) => mode(e.target.value)}
      >
        <option value="specimen">
          {es ? "Colección real en 3D" : "Real 3D collection"}
        </option>
        <option value="anatomy">
          {es ? "Anatomía interactiva" : "Interactive anatomy"}
        </option>
        <option value="lifecycle">
          {es ? "Del polen a la semilla" : "From pollen to seed"}
        </option>
      </select>
    </>
  );
  const controls = (
    <div className="fl-control-group">
      {selection}
      {state.mode === "specimen" ? (
        <>
          <label className="fl-label" htmlFor="specimen">
            {es ? "Ejemplar" : "Specimen"}
          </label>
          <select
            id="specimen"
            value={state.specimen}
            onChange={(e) => patch({ specimen: e.target.value })}
          >
            {catalog.specimens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.scientificName}
              </option>
            ))}
          </select>
          <div className="fl-specimen-note">
            <span className="fl-number">
              0{catalog.specimens.indexOf(specimen) + 1}
            </span>
            <div>
              <strong>{t(specimen.commonName)}</strong>
              <span>Orchidaceae · Smithsonian Gardens</span>
            </div>
          </div>
          <label className="fl-label" htmlFor="compare">
            {es ? "Comparar con" : "Compare with"}
          </label>
          <select
            id="compare"
            value={state.compare}
            onChange={(e) => patch({ compare: e.target.value })}
          >
            <option value="">{es ? "Un solo ejemplar" : "One specimen"}</option>
            {catalog.specimens
              .filter((s) => s.id !== state.specimen)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scientificName}
                </option>
              ))}
          </select>
          <label className="fl-check">
            <input
              type="checkbox"
              checked={state.quality === "detail"}
              onChange={(e) =>
                patch({ quality: e.target.checked ? "detail" : "preview" })
              }
            />
            {es ? "Cargar alta definición" : "Load fine detail"}
            <span>{(specimen.detail.bytes / 1e6).toFixed(2)} MB</span>
          </label>
          <p className="fl-small">
            {es
              ? "Los ejemplares se ajustan por separado a la pantalla. Sus tamaños visuales no representan una escala común."
              : "Specimens are fitted independently. Their displayed sizes do not represent a common scale."}
          </p>
          <button className="fl-primary" onClick={() => mode("anatomy")}>
            <Layers3 size={16} />
            {es ? "Abrir la anatomía" : "Unfold the anatomy"}
            <ArrowRight size={15} />
          </button>
        </>
      ) : (
        <>
          {state.mode === "anatomy" ? (
            <>
              <label className="fl-label" htmlFor="teaching-model">
                {es ? "Modelo didáctico" : "Teaching model"}
              </label>
              <select
                id="teaching-model"
                value={state.model}
                onChange={(e) =>
                  patch({
                    model: e.target.value as "general" | "orchid",
                    selected: "",
                    hidden: [],
                    isolate: false,
                  })
                }
              >
                <option value="general">
                  {es ? "Flor completa general" : "General complete flower"}
                </option>
                <option value="orchid">
                  {es ? "Arquitectura de una orquídea" : "Orchid architecture"}
                </option>
              </select>
              {range(
                es ? "Separar componentes" : "Separate components",
                "explode",
              )}
              {range(es ? "Apertura de la flor" : "Flower opening", "bloom")}
            </>
          ) : (
            <>
              {range(
                es ? "Recorrer la secuencia" : "Scrub the sequence",
                "stage",
              )}
              <p className="fl-small">
                {es
                  ? "Secuencia esquemática. La posición no indica días ni velocidad biológica."
                  : "Schematic sequence. Position does not indicate days or biological speed."}
              </p>
            </>
          )}
          <label className="fl-check">
            <input
              type="checkbox"
              checked={state.cutEnabled}
              onChange={(e) => patch({ cutEnabled: e.target.checked })}
            />
            {es ? "Corte del modelo" : "Cut through the model"}
          </label>
          <label className="fl-check">
            <input
              type="checkbox"
              checked={state.labels}
              onChange={(e) => patch({ labels: e.target.checked })}
            />
            {es ? "Etiqueta de la selección" : "Selection label"}
          </label>
          {state.cutEnabled && (
            <div className="fl-cut-controls">
              <label className="sr-only" htmlFor="cut-axis">
                {es ? "Plano de corte" : "Section plane"}
              </label>
              <select
                id="cut-axis"
                value={state.cutAxis}
                onChange={(e) =>
                  patch({ cutAxis: e.target.value as "x" | "y" | "z" })
                }
              >
                <option value="x">
                  {es ? "Longitudinal" : "Longitudinal"}
                </option>
                <option value="y">{es ? "Transversal" : "Transverse"}</option>
                <option value="z">{es ? "Frontal" : "Frontal"}</option>
              </select>
              {range(
                es ? "Posición del plano" : "Plane position",
                "cut",
                -1,
                1,
              )}
            </div>
          )}
          <div className="fl-structure-tools">
            <div className="fl-search">
              <Search size={15} />
              <input
                aria-label={es ? "Buscar una estructura" : "Search structures"}
                placeholder={es ? "Buscar una estructura" : "Find a structure"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {btn(es ? "Mostrar todas" : "Show all", <Eye size={15} />, () =>
              patch({ hidden: [], isolate: false }),
            )}
          </div>
          <div
            className="fl-structure-list"
            aria-label={es ? "Estructuras del modelo" : "Model structures"}
          >
            {structureList.map((p) => (
              <div
                key={p.id}
                className={
                  "fl-part-row" + (state.selected === p.id ? " selected" : "")
                }
              >
                <button data-part={p.id} onClick={() => select(p.id)}>
                  <span className={"fl-dot " + p.id} />
                  {t(p.label)}
                  <ChevronRight size={13} />
                </button>
                <button
                  aria-label={
                    (state.hidden.includes(p.id)
                      ? es
                        ? "Mostrar "
                        : "Show "
                      : es
                        ? "Ocultar "
                        : "Hide ") + t(p.label)
                  }
                  title={
                    (state.hidden.includes(p.id)
                      ? es
                        ? "Mostrar "
                        : "Show "
                      : es
                        ? "Ocultar "
                        : "Hide ") + t(p.label)
                  }
                  onClick={() =>
                    patch({
                      hidden: state.hidden.includes(p.id)
                        ? state.hidden.filter((id) => id !== p.id)
                        : [...state.hidden, p.id],
                    })
                  }
                >
                  {state.hidden.includes(p.id) ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>
              </div>
            ))}
            {!structureList.length && (
              <p className="fl-small">
                {es
                  ? "No hay coincidencias. Pruebe con pétalo u ovario."
                  : "No matches. Try petal or ovary."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
  const journeys = (
    <div className="fl-control-group">
      <p className="fl-small">
        {es
          ? "Doce preguntas para mirar con más atención. Cada paso prepara una vista que puede seguir explorando."
          : "Twelve questions for a closer look. Each step prepares a view you can keep exploring."}
      </p>
      <div className="fl-journey-list">
        {catalog.journeys.map((j, i) => (
          <button
            key={j.id}
            className={journeyId === j.id ? "active" : ""}
            onClick={() => applyStep(j, 0)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{t(j.title)}</strong>
              <small>
                {j.steps.length} {es ? "pasos" : "steps"}
              </small>
            </div>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
  const notebook = (
    <div className="fl-control-group">
      <h3>{es ? "Guarde una mirada" : "Keep a closer look"}</h3>
      <p className="fl-small">
        {es
          ? "Guarde su selección y los controles. El giro libre de la cámara no se incluye. Sus datos permanecen en este navegador."
          : "Save your selection and controls. Free camera orbit is not included. Your data stays in this browser."}
      </p>
      <button className="fl-action" onClick={save}>
        <Bookmark size={16} />
        {es ? "Guardar marcador" : "Save bookmark"}
      </button>
      <button
        className="fl-action"
        disabled={!saved}
        onClick={() => {
          if (saved) replace(saved);
        }}
      >
        <RotateCcw size={16} />
        {es ? "Restaurar marcador" : "Restore bookmark"}
      </button>
      <button className="fl-action" onClick={share}>
        <Share2 size={16} />
        {es ? "Compartir enlace" : "Share exploration link"}
      </button>
      <button
        className="fl-action"
        onClick={() =>
          download(
            "floraria-exploration.json",
            exportState(state),
            "application/json",
          )
        }
      >
        <ArrowDownToLine size={16} />
        {es ? "Exportar exploración" : "Export exploration"}
      </button>
      <button className="fl-action" onClick={() => file.current?.click()}>
        <Upload size={16} />
        {es ? "Importar exploración" : "Import exploration"}
      </button>
      <button className="fl-action" onClick={image}>
        <ArrowDownToLine size={16} />
        {es ? "Guardar vista como PNG" : "Save view as PNG"}
      </button>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={importView}
      />
      <p className="fl-small">
        {es
          ? "Teclado en la escena: flechas para girar, + / - para acercar, Inicio para volver. La lista de estructuras ofrece una alternativa a la selección 3D."
          : "In the scene: arrow keys rotate, + / - zoom, Home resets. The structure list provides an alternative to 3D picking."}
      </p>
    </div>
  );
  return (
    <div
      className={"page-body wide fl-workbench" + (focus ? " fl-focused" : "")}
    >
      <aside
        className={"fl-rail" + (drawer ? " open" : "")}
        aria-label={es ? "Controles de exploración" : "Exploration controls"}
      >
        <div className="fl-rail-head">
          <span>
            <Leaf size={15} /> {es ? "GABINETE BOTÁNICO" : "BOTANICAL CABINET"}
          </span>
          <button
            className="fl-mobile-close"
            onClick={() => setDrawer(false)}
            aria-label={es ? "Cerrar controles" : "Close controls"}
          >
            <X size={18} />
          </button>
        </div>
        <Tabs
          ariaLabel={es ? "Herramientas del gabinete" : "Cabinet tools"}
          tabs={[
            {
              id: "controls",
              label: es ? "Explorar" : "Explore",
              content: controls,
            },
            {
              id: "journeys",
              label: es ? "Recorridos" : "Journeys",
              content: journeys,
            },
            {
              id: "notebook",
              label: es ? "Guardar" : "Notebook",
              content: notebook,
            },
          ]}
        />
        <div className="fl-rail-bottom">
          <span className="fl-live-dot" />
          {es ? "Todo ocurre en su navegador" : "Entirely in your browser"}
          <span>{es ? "Sin cuenta" : "No account"}</span>
        </div>
      </aside>
      <section
        className="fl-stage"
        aria-label={es ? "Escenario botánico" : "Botanical stage"}
      >
        <Viewer
          catalog={catalog}
          state={state}
          onSelect={select}
          handle={handle}
        />
        <div className="fl-stage-heading">
          <div className="fl-eyebrow">
            {state.mode === "specimen"
              ? es
                ? "COLECCIÓN VIVA / 01"
                : "LIVING COLLECTION / 01"
              : state.mode === "anatomy"
                ? es
                  ? "LA BELLEZA DE LAS PARTES / 02"
                  : "THE BEAUTY OF PARTS / 02"
                : es
                  ? "UNA HISTORIA EN CINCO MOMENTOS / 03"
                  : "A STORY IN FIVE MOMENTS / 03"}
          </div>
          <h1>
            {state.mode === "specimen" ? (
              es ? (
                <>
                  La arquitectura
                  <br />
                  de una flor.
                </>
              ) : (
                <>
                  The architecture
                  <br />
                  of a flower.
                </>
              )
            ) : state.mode === "anatomy" ? (
              es ? (
                <>
                  Un mundo
                  <br />
                  dentro de una flor.
                </>
              ) : (
                <>
                  A world
                  <br />
                  within a flower.
                </>
              )
            ) : (
              <>{t(STAGES[stageIndex(state.stage)])}.</>
            )}
          </h1>
          <p>
            {state.mode === "specimen"
              ? es
                ? "Gire. Acerque. Descubra."
                : "Turn it. Trace it. Discover."
              : state.mode === "anatomy"
                ? es
                  ? "Seleccione una parte y descubra cómo encaja."
                  : "Pick a part. See how it belongs."
                : es
                  ? "Recorra un proceso que suele quedar oculto."
                  : "Follow a process usually hidden from view."}
          </p>
        </div>
        <div className="fl-stage-top-actions">
          {btn(
            es ? "Abrir controles" : "Open controls",
            <SlidersHorizontal size={18} />,
            () => setDrawer(true),
          )}
          {btn(
            focus
              ? es
                ? "Volver al gabinete"
                : "Return to cabinet"
              : es
                ? "Ampliar la escena"
                : "Expand the scene",
            focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />,
            () => {
              setFocus(!focus);
              setDetails(false);
            },
            focus,
          )}
          {btn(
            es ? "Compartir vista" : "Share view",
            <Share2 size={17} />,
            share,
          )}
        </div>
        <div className={"fl-detail" + (details ? " shown" : "")}>
          <button
            className="fl-detail-close"
            aria-label={es ? "Cerrar detalle" : "Close detail"}
            onClick={() => setDetails(false)}
          >
            <X size={16} />
          </button>
          <div className="fl-eyebrow">
            {state.mode === "specimen"
              ? es
                ? "EJEMPLAR DIGITALIZADO"
                : "DIGITIZED SPECIMEN"
              : state.mode === "anatomy"
                ? es
                  ? "MODELO DIDÁCTICO ORIGINAL"
                  : "ORIGINAL TEACHING MODEL"
                : es
                  ? "SECUENCIA ESQUEMÁTICA"
                  : "SCHEMATIC SEQUENCE"}
          </div>
          {state.mode === "specimen" ? (
            <>
              <h2>
                <i>{specimen.scientificName}</i>
              </h2>
              <p>{t(specimen.description)}</p>
              <div className="fl-facts">
                {specimen.facts.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <span>{t(f.label)}</span>
                    <strong>{t(f.value)}</strong>
                  </div>
                ))}
              </div>
              <p className="fl-small">
                {es
                  ? "Superficie real; sin segmentación de órganos."
                  : "Real surface; no organ segmentation."}
              </p>
              <Refs
                ids={specimen.sourceIds.slice(0, 2)}
                label={es ? "Fuentes" : "Sources"}
              />
            </>
          ) : state.mode === "lifecycle" ? (
            <>
              <h2>{t(STAGES[stageIndex(state.stage)])}</h2>
              <p>{t(descriptions[stageIndex(state.stage)])}</p>
              <p className="fl-small">
                {es
                  ? "Ilustración general, no una predicción de crecimiento ni una secuencia de germinación de orquídeas."
                  : "A general illustration, not a growth prediction or an orchid-germination sequence."}
              </p>
            </>
          ) : selected ? (
            <>
              <h2>{t(selected.label)}</h2>
              <p>{t(selected.summary)}</p>
              <p className="fl-small">{t(selected.detail)}</p>
              <div className="fl-detail-actions">
                <button
                  className={"fl-action" + (state.isolate ? " active" : "")}
                  onClick={() => patch({ isolate: !state.isolate })}
                >
                  <Focus size={15} />
                  {state.isolate
                    ? es
                      ? "Mostrar contexto"
                      : "Show context"
                    : es
                      ? "Aislar"
                      : "Isolate"}
                </button>
                <button
                  className="fl-action"
                  onClick={() => viewer.current?.focus()}
                >
                  <Search size={15} />
                  {es ? "Acercar" : "Focus"}
                </button>
              </div>
              <Refs
                ids={selected.sourceIds}
                label={es ? "Fuentes" : "Sources"}
              />
            </>
          ) : (
            <>
              <h2>
                {es
                  ? "Cada parte tiene un papel."
                  : "Every part has a purpose."}
              </h2>
              <p>
                {es
                  ? "Seleccione una estructura en la flor o en la lista. Separe las capas, abra un corte y observe cómo las partes se relacionan."
                  : "Select a structure on the flower or in the list. Separate the layers, open a section, and follow the relationships."}
              </p>
              <p className="fl-small">
                {es
                  ? "Geometría ilustrativa con partes identificadas. No es una disección del escaneo."
                  : "Illustrative geometry with named parts. This is not a dissection of the scan."}
              </p>
            </>
          )}
        </div>
        {journey && (
          <div className="fl-journey-card">
            <div className="fl-journey-title">
              <span>
                {t(journey.title)} · {step + 1}/{journey.steps.length}
              </span>
              <button
                aria-label={es ? "Cerrar recorrido" : "Close journey"}
                onClick={() => setJourneyId("")}
              >
                <X size={15} />
              </button>
            </div>
            <h3>{t(journey.steps[step].title)}</h3>
            <p>{t(journey.steps[step].body)}</p>
            <div>
              <button
                disabled={step === 0}
                onClick={() => applyStep(journey, step - 1)}
              >
                <ArrowLeft size={14} />
                {es ? "Anterior" : "Previous"}
              </button>
              <button
                disabled={step === journey.steps.length - 1}
                onClick={() => applyStep(journey, step + 1)}
              >
                {es ? "Siguiente" : "Next"}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
        <div className="fl-stage-bottom">
          <div className="fl-caption">
            <span className="fl-live-dot" />
            {state.mode === "specimen"
              ? specimen.scientificName
              : state.model === "orchid"
                ? es
                  ? "Arquitectura de una orquídea"
                  : "Orchid architecture"
                : es
                  ? "Flor completa general"
                  : "General complete flower"}
            <small>
              {state.mode === "specimen"
                ? es
                  ? "Smithsonian Gardens · CC0"
                  : "Smithsonian Gardens · CC0"
                : es
                  ? "Ilustración original · escala relativa"
                  : "Original illustration · relative scale"}
            </small>
          </div>
          {state.compare && state.mode === "specimen" && (
            <span className="fl-compare-caption">
              {
                catalog.specimens.find((s) => s.id === state.compare)
                  ?.scientificName
              }
            </span>
          )}
          <div className="fl-stage-toolbar">
            {btn(
              es ? "Restablecer vista" : "Reset view",
              <Home size={17} />,
              () => viewer.current?.home(),
            )}
            {btn(
              playing
                ? es
                  ? "Pausar"
                  : "Pause"
                : state.mode === "lifecycle"
                  ? es
                    ? "Reproducir secuencia"
                    : "Play sequence"
                  : es
                    ? "Girar lentamente"
                    : "Rotate slowly",
              playing ? <Pause size={17} /> : <Play size={17} />,
              () => {
                if (state.mode === "lifecycle" && state.stage === 1)
                  patch({ stage: 0 });
                setPlaying(!playing);
              },
              playing,
            )}
            <label className="sr-only" htmlFor="camera-preset">
              {es ? "Vista de cámara" : "Camera view"}
            </label>
            <select
              id="camera-preset"
              value={state.camera}
              onChange={(e) =>
                patch({ camera: e.target.value as AtlasState["camera"] })
              }
            >
              <option value="front">{es ? "Frente" : "Front"}</option>
              <option value="top">{es ? "Arriba" : "Top"}</option>
              <option value="side">{es ? "Lado" : "Side"}</option>
              <option value="back">{es ? "Atrás" : "Back"}</option>
            </select>
            {btn(
              es ? "Ver ficha" : "Read field note",
              <BookOpen size={17} />,
              () => setDetails(!details),
              details,
            )}
            {btn(
              es ? "Restablecer exploración" : "Reset exploration",
              <RotateCcw size={16} />,
              reset,
            )}
          </div>
        </div>
        {state.mode === "lifecycle" && (
          <div className="fl-timeline">
            {STAGES.map((s, i) => (
              <button
                key={s.en}
                className={stageIndex(state.stage) === i ? "active" : ""}
                onClick={() => {
                  setPlaying(false);
                  patch({ stage: i / 4 });
                }}
              >
                <span>{i + 1}</span>
                <small>{t(s)}</small>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="fl-mobile-actions">
        <button onClick={() => setDrawer(true)}>
          <SlidersHorizontal size={16} />
          {es ? "Explorar" : "Explore"}
        </button>
        <button onClick={() => setDetails(!details)}>
          <BookOpen size={16} />
          {es ? "Ficha" : "Field note"}
        </button>
        <button
          onClick={() =>
            mode(state.mode === "specimen" ? "anatomy" : "specimen")
          }
        >
          <Layers3 size={16} />
          {state.mode === "specimen"
            ? es
              ? "Anatomía"
              : "Anatomy"
            : es
              ? "Ejemplares"
              : "Specimens"}
        </button>
      </div>
      {notice && (
        <div className="fl-notice" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
