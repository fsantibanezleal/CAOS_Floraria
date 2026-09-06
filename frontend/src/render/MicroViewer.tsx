import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  loadMicroAtlas,
  MICRO_BRANCHES,
  type MicroAtlas,
  type MicroDepth,
  type MicroNode,
} from "../lib/micro";

export interface MicroViewerProps {
  branch: string;
  depth: MicroDepth;
  selected: string;
  onSelect: (id: string) => void;
  onDrill?: (id: string, depth: MicroDepth) => void;
  lang: "en" | "es";
  theme: "light" | "dark";
  progress: number;
}

interface PickState {
  selected: string;
  label: (id: string) => string;
  onSelect: (id: string) => void;
  palette: { ink: string; border: string; bg: string };
}
const PickContext = createContext<PickState | null>(null);
function Pick({
  id,
  children,
  x,
  y,
}: {
  id: string;
  children: ReactNode;
  x: number;
  y: number;
}) {
  const { label, onSelect, selected, palette } = useContext(PickContext)!;
  const active = selected === id;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label(id)}
      aria-pressed={active}
      data-micro-node={id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
      className="micro-pick"
    >
      <g
        stroke={active ? palette.ink : palette.border}
        strokeWidth={active ? 3 : 1.5}
      >
        {children}
      </g>
      <g pointerEvents="none">
        <rect
          x={x - 10}
          y={y - 23}
          width={Math.min(310, label(id).length * 11 + 28)}
          height={32}
          rx={8}
          fill={palette.bg}
          opacity={0.93}
        />
        <text
          x={x}
          y={y}
          fill={palette.ink}
          fontSize={20}
          fontWeight={active ? 750 : 550}
        >
          {active ? "• " : ""}
          {label(id)}
        </text>
      </g>
    </g>
  );
}

/** Original teaching diagrams. Geometry, timing and colours are not microscopy measurements. */
export function MicroViewer({
  branch,
  depth,
  selected,
  onSelect,
  onDrill,
  lang,
  theme,
  progress,
}: MicroViewerProps) {
  const [atlas, setAtlas] = useState<MicroAtlas>(),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const uid = useId().replace(/:/g, ""),
    dark = theme === "dark",
    p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const tr = (en: string, es: string) => (lang === "en" ? en : es);
  useEffect(() => {
    let live = true;
    setError(false);
    loadMicroAtlas().then(
      (a) => {
        if (live) setAtlas(a);
      },
      () => {
        if (live) setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, [retry]);
  const palette = {
    ink: dark ? "#eef1e8" : "#19362f",
    muted: dark ? "#b4c9bd" : "#4d6659",
    border: dark ? "#729c89" : "#638a73",
    bg: dark ? "#101f24" : "#f1f5ed",
    rose: dark ? "#dc89b4" : "#c34f8c",
    green: dark ? "#67b893" : "#5b9c70",
    cyan: dark ? "#65dbe3" : "#128f9f",
    gold: dark ? "#f0c979" : "#b77a20",
    purple: dark ? "#c5abef" : "#795aa4",
  };
  const frame: CSSProperties = {
    height: "100%",
    minHeight: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    color: palette.ink,
    background: palette.bg,
  };
  if (error)
    return (
      <div
        style={{
          ...frame,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          textAlign: "center",
        }}
        role="alert"
      >
        <p>
          {tr(
            "The microscopic atlas could not be verified.",
            "No fue posible verificar el atlas microscópico.",
          )}
        </p>
        <button type="button" onClick={() => setRetry((x) => x + 1)}>
          {tr("Retry", "Reintentar")}
        </button>
      </div>
    );
  if (!atlas)
    return (
      <div
        style={{ ...frame, justifyContent: "center", alignItems: "center" }}
        role="status"
      >
        {tr(
          "Loading the microscopic atlas…",
          "Cargando el atlas microscópico…",
        )}
      </div>
    );
  const branchId = MICRO_BRANCHES.find((x) => x === branch) ?? "petal",
    record = atlas.branches.find((x) => x.id === branchId)!;
  const visible = atlas.nodes.filter(
      (n) => n.branch === branchId && n.depth === depth,
    ),
    node = visible.find((n) => n.id === selected) ?? visible[0];
  const stage = record.stages[Math.min(3, Math.floor(p * 4))];
  const label = (id: string) =>
    atlas.nodes.find((n) => n.id === id)?.label[lang] ?? id;
  const dots = (x: number, y: number, n: number, color: string, span = 110) => (
    <g fill={color} stroke="none">
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={x + Math.cos(i * 2.4) * Math.sqrt((i + 1) / n) * span}
          cy={y + Math.sin(i * 2.4) * Math.sqrt((i + 1) / n) * span * 0.65}
          r={3 + (i % 3)}
        />
      ))}
    </g>
  );
  const note = (text: string, y = 454) => (
    <text x={400} y={y} fill={palette.muted} textAnchor="middle" fontSize={19}>
      {text}
    </text>
  );
  const arrow = (x: number, y: number) => (
    <path
      d={`M${x - 8} ${y + 10} L${x} ${y} L${x + 8} ${y + 10}`}
      fill="none"
      stroke={palette.cyan}
      strokeWidth={4}
    />
  );
  function petal() {
    if (depth === "tissue")
      return (
        <>
          <Pick id="petal-inner-tissue" x={440} y={393}>
            <g fill={`${palette.green}55`}>
              {Array.from({ length: 12 }, (_, i) => (
                <ellipse
                  key={i}
                  cx={120 + (i % 6) * 110}
                  cy={280 + Math.floor(i / 6) * 62}
                  rx={56}
                  ry={32}
                  transform={`rotate(${i % 2 ? 10 : -10} ${120 + (i % 6) * 110} ${280 + Math.floor(i / 6) * 62})`}
                />
              ))}
            </g>
          </Pick>
          <Pick id="petal-epidermis" x={100} y={103}>
            <g fill={`url(#${uid}-petal)`}>
              {Array.from({ length: 7 }, (_, i) => (
                <path
                  key={i}
                  d={`M${60 + i * 98} 250 L${60 + i * 98} 192 Q${100 + i * 98} 70 ${146 + i * 98} 192 L${146 + i * 98} 250 Z`}
                />
              ))}
            </g>
          </Pick>
          <g pointerEvents="none" data-pigment-compartment="vacuole">
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i}>
                <ellipse
                  cx={103 + i * 98}
                  cy={206}
                  rx={24}
                  ry={27}
                  fill={`${palette.rose}18`}
                  stroke={palette.rose}
                  strokeWidth={1}
                />
                {dots(
                  103 + i * 98,
                  206,
                  Math.round(3 + p * 7),
                  palette.rose,
                  18,
                )}
              </g>
            ))}
          </g>
          {note(
            tr(
              "Cutaway: surface cells above, inner tissue below",
              "Corte: células superficiales arriba, tejido interno abajo",
            ),
          )}
        </>
      );
    if (depth === "cell")
      return (
        <>
          <Pick id="petal-papilla" x={485} y={70}>
            <path
              d="M220 405 L220 220 Q230 165 280 105 Q400 -5 520 105 Q570 165 580 220 L580 405 Z"
              fill={`${palette.rose}32`}
            />
          </Pick>
          <path
            d="M255 378 L255 230 Q270 165 318 123 Q400 58 482 123 Q530 165 545 230 L545 378 Z"
            fill={`${palette.rose}77`}
            stroke={palette.rose}
            strokeWidth={3}
          />
          <ellipse cx={280} cy={342} rx={33} ry={26} fill={palette.purple} />
          {dots(414, 241, Math.round(8 + p * 45), palette.rose, 110)}
          {note(
            tr(
              "One illustrative living epidermal cell",
              "Una célula epidérmica viva ilustrativa",
            ),
          )}
        </>
      );
    return (
      <>
        <Pick id="petal-wall" x={70} y={94}>
          <path
            d="M150 160 Q170 55 355 55 L490 55 Q655 65 665 185 L665 325 Q650 414 510 418 L290 418 Q130 400 135 290 Z"
            fill={`${palette.green}23`}
            strokeWidth={12}
          />
        </Pick>
        <Pick id="petal-vacuole" x={463} y={248}>
          <ellipse
            cx={438}
            cy={232}
            rx={179}
            ry={139}
            fill={`url(#${uid}-petal)`}
          />
        </Pick>
        <Pick id="petal-tonoplast" x={470} y={389}>
          <ellipse
            cx={438}
            cy={232}
            rx={183}
            ry={143}
            fill="none"
            strokeWidth={7}
          />
        </Pick>
        <Pick id="petal-nucleus" x={70} y={361}>
          <ellipse cx={215} cy={280} rx={45} ry={55} fill={palette.purple} />
        </Pick>
        {dots(435, 230, Math.round(12 + p * 50), palette.rose, 125)}
        {note(
          tr(
            "Pigment location highlighted; not a concentration measurement",
            "Ubicación del pigmento; no mide concentración",
          ),
        )}
      </>
    );
  }
  function stem() {
    if (depth === "tissue")
      return (
        <>
          <ellipse
            cx={395}
            cy={245}
            rx={276}
            ry={180}
            fill={`${palette.green}20`}
            stroke={palette.border}
            strokeWidth={3}
          />
          <Pick id="stem-xylem" x={145} y={91}>
            <g fill={`${palette.cyan}45`}>
              {[
                [260, 180, 62],
                [380, 150, 48],
                [370, 275, 77],
                [225, 315, 44],
              ].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} />
              ))}
            </g>
          </Pick>
          <Pick id="stem-phloem" x={537} y={119}>
            <g fill={`${palette.gold}65`}>
              {Array.from({ length: 9 }, (_, i) => (
                <ellipse
                  key={i}
                  cx={520 + (i % 2) * 64}
                  cy={155 + Math.floor(i / 2) * 47}
                  rx={34}
                  ry={25}
                />
              ))}
            </g>
          </Pick>
          <g stroke={palette.cyan} fill="none" strokeWidth={3}>
            <circle cx={370} cy={275} r={24 + p * 22} />
            <circle cx={370} cy={275} r={12 + p * 12} />
          </g>
          {note(
            tr(
              "Cross-section of an illustrative vascular bundle",
              "Corte transversal de un haz vascular ilustrativo",
            ),
          )}
        </>
      );
    if (depth === "cell")
      return (
        <>
          <Pick id="stem-vessel" x={430} y={75}>
            <g fill={`${palette.cyan}22`}>
              {[45, 175, 305].map((y) => (
                <rect key={y} x={285} y={y} width={165} height={130} rx={12} />
              ))}
            </g>
          </Pick>
          {[65, 102, 139, 200, 237, 274, 335, 372, 410].map((y) => (
            <path
              key={y}
              d={`M285 ${y} Q370 ${y + 35} 450 ${y}`}
              fill="none"
              stroke={palette.gold}
              strokeWidth={9}
            />
          ))}
          {[175, 305].map((y) => (
            <path
              key={y}
              d={`M285 ${y} H322 M415 ${y} H450`}
              fill="none"
              stroke={palette.ink}
              strokeWidth={5}
            />
          ))}
          {Array.from({ length: 7 }, (_, i) => {
            const y = 430 - ((i * 54 + p * 160) % 370);
            return (
              <g key={i}>
                {arrow(368, y)}
                <circle cx={367} cy={y + 21} r={4} fill={palette.cyan} />
              </g>
            );
          })}
          {note(
            tr(
              "Connected mature vessel elements: hollow, not living cells",
              "Elementos de vaso maduros conectados: huecos, sin vida",
            ),
          )}
        </>
      );
    return (
      <>
        <Pick id="stem-lumen" x={360} y={90}>
          <rect
            x={265}
            y={60}
            width={245}
            height={335}
            rx={22}
            fill={`${palette.cyan}15`}
          />
        </Pick>
        <Pick id="stem-secondary-wall" x={65} y={145}>
          <g fill={`${palette.gold}aa`}>
            <rect x={210} y={60} width={55} height={335} rx={6} />
            <path d="M510 60 H565 V204 H530 V250 H565 V395 H510 Z" />
          </g>
        </Pick>
        <Pick id="stem-perforation" x={275} y={427}>
          <path
            d="M215 296 H307 V311 H215 Z M468 296 H560 V311 H468 Z"
            fill={palette.green}
          />
        </Pick>
        <Pick id="stem-pit" x={582} y={230}>
          <path
            d="M520 207 H568 M520 247 H568 M539 208 V246"
            fill="none"
            strokeWidth={5}
          />
        </Pick>
        {Array.from({ length: 7 }, (_, i) =>
          arrow(386, 386 - ((i * 47 + p * 170) % 320)),
        )}
        {note(
          tr(
            "Pit membrane retained; the lumen is a space, not an organelle",
            "Se conserva la membrana de punteadura; el lumen es un espacio",
          ),
          470,
        )}
      </>
    );
  }
  function anther() {
    if (depth === "tissue")
      return (
        <>
          <path
            d="M380 410 C80 430 90 20 290 68 Q400 102 490 68 C710 20 720 440 410 410 Z"
            fill={`${palette.green}30`}
            stroke={palette.border}
            strokeWidth={3}
          />
          <Pick id="anther-pollen-sac" x={70} y={64}>
            <g fill={`${palette.gold}25`}>
              {[
                [270, 172],
                [270, 305],
                [530, 172],
                [530, 305],
              ].map(([x, y], i) => (
                <ellipse key={i} cx={x} cy={y} rx={78} ry={65} />
              ))}
            </g>
          </Pick>
          <Pick id="anther-tapetum" x={555} y={66}>
            <g fill="none" strokeWidth={12} strokeDasharray="10 3">
              {[
                [270, 172],
                [270, 305],
                [530, 172],
                [530, 305],
              ].map(([x, y], i) => (
                <ellipse key={i} cx={x} cy={y} rx={72} ry={60} />
              ))}
            </g>
          </Pick>
          {[
            [270, 172],
            [270, 305],
            [530, 172],
            [530, 305],
          ].map(([x, y], i) => (
            <g key={i} fill={palette.gold}>
              {Array.from({ length: 5 }, (_, j) => (
                <circle
                  key={j}
                  cx={x + Math.cos(j * 1.25) * 32}
                  cy={y + Math.sin(j * 1.25) * 26}
                  r={11 + p * 3}
                />
              ))}
            </g>
          ))}
          {note(
            tr(
              "Developmental section; no tube germination inside these sacs",
              "Corte de desarrollo; no germinación del tubo dentro de los sacos",
            ),
          )}
        </>
      );
    if (depth === "cell")
      return (
        <>
          <Pick id="anther-pollen" x={60} y={89}>
            <path
              d="M513 247 A168 168 0 1 0 496 321"
              fill={`${palette.gold}25`}
              strokeWidth={12}
              strokeDasharray="9 5"
            />
          </Pick>
          <Pick id="anther-vegetative" x={285} y={401}>
            <path
              d="M490 247 A145 145 0 1 0 477 307"
              fill={`${palette.gold}22`}
            />
          </Pick>
          <ellipse cx={300} cy={254} rx={39} ry={28} fill={palette.purple} />
          <ellipse
            cx={401}
            cy={205}
            rx={31}
            ry={39}
            fill={palette.rose}
            stroke={palette.ink}
            strokeWidth={2}
          />
          <ellipse cx={401} cy={205} rx={12} ry={18} fill={palette.purple} />
          <g opacity={p > 0.35 ? 1 : 0} data-pollen-tube="illustrated">
            <path
              d={`M487 275 C${540 + p * 40} 282 ${550 + p * 140} 365 ${548 + p * 170} 365`}
              fill="none"
              stroke={palette.gold}
              strokeWidth={26}
              strokeLinecap="round"
            />
            <path
              d={`M487 275 C${540 + p * 40} 282 ${550 + p * 140} 365 ${548 + p * 170} 365`}
              fill="none"
              stroke={palette.bg}
              strokeWidth={16}
              strokeLinecap="round"
            />
          </g>
          <text x={539} y={135} fill={palette.muted} fontSize={20}>
            {tr("Generative cell", "Célula generativa")}
          </text>
          <path d="M529 139 L431 190" stroke={palette.muted} fill="none" />
          {note(
            tr(
              "Two-celled example; tube emergence only after suitable pollination",
              "Ejemplo bicelular; el tubo emerge tras polinización adecuada",
            ),
          )}
        </>
      );
    const end = 510 + 210 * p;
    return (
      <>
        <Pick id="anther-exine" x={68} y={83}>
          <path
            d="M489 207 A170 170 0 1 0 489 293"
            fill={`${palette.gold}24`}
            strokeWidth={19}
            strokeDasharray="11 4"
          />
        </Pick>
        <Pick id="anther-intine" x={220} y={422}>
          <path
            d="M474 213 A151 151 0 1 0 474 287"
            fill="none"
            strokeWidth={9}
          />
        </Pick>
        <Pick id="anther-aperture" x={516} y={156}>
          <path
            d="M486 202 L501 224 M486 297 L501 276"
            strokeWidth={10}
            fill="none"
          />
        </Pick>
        <path
          d={`M483 222 C555 213 ${end - 10} 228 ${end} 250 C${end - 10} 272 555 287 483 278`}
          stroke={palette.gold}
          strokeWidth={7}
          fill={`${palette.gold}30`}
        />
        {note(
          tr(
            "Wall layers and a tube exit; pattern and time are illustrative",
            "Capas de pared y salida del tubo; patrón y tiempo ilustrativos",
          ),
        )}
      </>
    );
  }
  function ovary() {
    if (depth === "tissue")
      return (
        <>
          <Pick id="ovary-ovule" x={70} y={62}>
            <path
              d="M375 420 C80 390 130 40 400 48 C670 40 720 390 425 420"
              fill={`${palette.green}16`}
              strokeWidth={6}
            />
          </Pick>
          <Pick id="ovary-integuments" x={515} y={85}>
            <path
              d="M379 399 C130 363 190 78 400 85 C610 78 670 363 421 399"
              fill={`${palette.green}18`}
              strokeWidth={12}
            />
          </Pick>
          <Pick id="ovary-nucellus" x={533} y={293}>
            <ellipse
              cx={400}
              cy={243}
              rx={134}
              ry={145}
              fill={`${palette.gold}30`}
            />
          </Pick>
          <ellipse
            cx={400}
            cy={249}
            rx={79}
            ry={105}
            fill={`${palette.purple}32`}
            stroke={palette.purple}
            strokeWidth={2}
          />
          <path
            d={`M400 455 L400 ${455 - p * 80}`}
            stroke={palette.rose}
            strokeWidth={8}
          />
          <text x={470} y={427} fill={palette.muted} fontSize={20}>
            {tr("Micropyle", "Micrópilo")}
          </text>
          <path d="M460 420 L417 414" stroke={palette.muted} />
          {note(
            tr(
              "The gametophyte lies inside maternal ovule tissues",
              "El gametófito está dentro de tejidos maternos del óvulo",
            ),
            474,
          )}
        </>
      );
    if (depth === "cell")
      return (
        <>
          <Pick id="ovary-embryo-sac" x={35} y={61}>
            <ellipse
              cx={390}
              cy={235}
              rx={205}
              ry={202}
              fill={`${palette.green}16`}
              strokeWidth={5}
            />
          </Pick>
          <Pick id="ovary-central-cell" x={489} y={202}>
            <ellipse
              cx={390}
              cy={217}
              rx={165}
              ry={144}
              fill={`${palette.gold}18`}
            />
          </Pick>
          <circle cx={366} cy={214} r={18} fill={palette.purple} />
          <circle cx={413} cy={214} r={18} fill={palette.purple} />
          <g fill={`${palette.green}bb`} stroke={palette.ink} strokeWidth={1.5}>
            {[345, 390, 435].map((x, i) => (
              <g key={i}>
                <ellipse cx={x} cy={78} rx={23} ry={29} />
                <circle cx={x} cy={76} r={7} fill={palette.purple} />
              </g>
            ))}
          </g>
          <Pick id="ovary-synergids" x={550} y={370}>
            <g fill={`${palette.rose}70`}>
              <ellipse cx={320} cy={352} rx={35} ry={55} />
              <ellipse cx={460} cy={352} rx={35} ry={55} />
            </g>
          </Pick>
          <Pick id="ovary-egg" x={370} y={446}>
            <ellipse
              cx={390}
              cy={368}
              rx={34}
              ry={43}
              fill={`${palette.purple}90`}
            />
          </Pick>
          <circle cx={390} cy={362} r={12} fill={palette.purple} />
          <circle cx={320} cy={347} r={10} fill={palette.purple} />
          <circle cx={460} cy={347} r={10} fill={palette.purple} />
          <path
            d={`M315 480 C305 450 285 410 313 ${475 - Math.min(p / 0.5, 1) * 100}`}
            fill="none"
            stroke={palette.rose}
            strokeWidth={8}
          />
          {p > 0.5 && (
            <g fill={palette.rose} stroke={palette.bg} strokeWidth={2}>
              <circle
                cx={320 + Math.min((p - 0.5) * 2, 1) * 70}
                cy={365}
                r={8}
              />
              <circle
                cx={320 + Math.min((p - 0.5) * 2, 1) * 70}
                cy={340 - Math.min((p - 0.5) * 2, 1) * 115}
                r={8}
              />
            </g>
          )}
          <text x={475} y={78} fontSize={18} fill={palette.muted}>
            {tr("3 antipodal cells", "3 células antípodas")}
          </text>
        </>
      );
    return (
      <>
        <ellipse
          cx={225}
          cy={247}
          rx={126}
          ry={158}
          fill={`${palette.purple}15`}
          stroke={palette.border}
          strokeWidth={3}
        />
        <Pick id="ovary-egg-nucleus" x={82} y={77}>
          <ellipse
            cx={225}
            cy={249}
            rx={72}
            ry={82}
            fill={`${palette.purple}90`}
          />
        </Pick>
        <ellipse
          cx={584}
          cy={247}
          rx={144}
          ry={158}
          fill={`${palette.gold}15`}
          stroke={palette.border}
          strokeWidth={3}
        />
        <Pick id="ovary-polar-nuclei" x={474} y={76}>
          <g fill={`${palette.purple}85`}>
            <circle cx={547} cy={243} r={37} />
            <circle cx={631} cy={243} r={37} />
          </g>
        </Pick>
        {[
          [-20, 8],
          [12, -22],
          [30, 24],
        ].map(([x, y], i) => (
          <path
            key={i}
            d={`M${210 + x} ${225 + y} q22 20 2 40`}
            fill="none"
            stroke={palette.bg}
            strokeWidth={5}
          />
        ))}
        <text
          x={225}
          y={436}
          fill={palette.ink}
          textAnchor="middle"
          fontSize={21}
        >
          {tr("Egg cell", "Oosfera")}
        </text>
        <text
          x={584}
          y={436}
          fill={palette.ink}
          textAnchor="middle"
          fontSize={21}
        >
          {tr("One central cell", "Una célula central")}
        </text>
        {note(
          tr(
            "Before polar-nuclear fusion; chromosomes are symbolic",
            "Antes de la fusión polar; cromosomas simbólicos",
          ),
          475,
        )}
      </>
    );
  }
  const selectedSources = atlas.sources.filter((s) =>
    node.sourceIds.includes(s.id),
  );
  const buttonStyle = (n: MicroNode): CSSProperties => ({
    flex: "0 0 auto",
    font: "inherit",
    fontSize: 12,
    lineHeight: 1.25,
    padding: "6px 9px",
    border: `1px solid ${n.id === node.id ? palette.ink : palette.border}`,
    borderRadius: 16,
    color: palette.ink,
    background: n.id === node.id ? `${palette.green}44` : "transparent",
    cursor: "pointer",
  });
  return (
    <PickContext.Provider
      value={{ selected: node.id, label, onSelect, palette }}
    >
      <section
        style={frame}
        aria-label={tr(
          "Microscopic teaching atlas",
          "Atlas microscópico educativo",
        )}
        data-micro-branch={branchId}
        data-micro-depth={depth}
      >
        <style>{`.micro-pick:focus-visible>g:first-child{filter:drop-shadow(0 0 4px ${palette.cyan});stroke-width:6px}.micro-scroll a{color:inherit;text-decoration:underline}.micro-scroll button:focus-visible{outline:3px solid ${palette.cyan};outline-offset:2px}`}</style>
        <div
          style={{
            padding: "8px 12px 0",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 11,
            color: palette.muted,
          }}
        >
          <span>{tr("EDUCATIONAL ILLUSTRATION", "ILUSTRACIÓN EDUCATIVA")}</span>
          <span>{tr("Not to scale", "Sin escala métrica")}</span>
        </div>
        <svg
          viewBox="0 0 800 485"
          role="group"
          aria-label={`${record.label[lang]} - ${tr("select a labelled structure", "selecciona una estructura rotulada")}`}
          style={{
            display: "block",
            width: "100%",
            flex: "1 1 0",
            minHeight: 0,
          }}
        >
          <defs>
            <radialGradient id={`${uid}-petal`}>
              <stop stopColor={dark ? "#8b3f6c" : "#f7cfdf"} />
              <stop offset="1" stopColor={palette.rose} />
            </radialGradient>
          </defs>
          {branchId === "petal"
            ? petal()
            : branchId === "stem"
              ? stem()
              : branchId === "anther"
                ? anther()
                : ovary()}
        </svg>
        <div
          className="micro-scroll"
          style={{
            flex: "0 0 auto",
            maxHeight: "40%",
            minHeight: 88,
            overflowY: "auto",
            borderTop: `1px solid ${palette.border}`,
            padding: "8px 12px",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 7,
            }}
            role="group"
            aria-label={tr(
              "Structures in this view",
              "Estructuras de esta vista",
            )}
          >
            {visible.map((n) => (
              <button
                type="button"
                key={n.id}
                style={buttonStyle(n)}
                aria-pressed={node.id === n.id}
                onClick={() => onSelect(n.id)}
              >
                {n.label[lang]}
              </button>
            ))}
          </div>
          {onDrill && node.children.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 7,
              }}
              aria-label={tr("Connected structures", "Estructuras conectadas")}
            >
              {node.children.map((id) => {
                const child = atlas.nodes.find((n) => n.id === id)!;
                return child.depth === "organ" ? null : (
                  <button
                    key={id}
                    type="button"
                    style={buttonStyle(child)}
                    onClick={() => onDrill(id, child.depth as MicroDepth)}
                  >
                    {tr("Explore: ", "Explorar: ")}
                    {child.label[lang]} ↗
                  </button>
                );
              })}
            </div>
          )}
          <div aria-live="polite">
            <strong>{node.label[lang]}</strong> - {node.summary[lang]}{" "}
            <span>{node.detail[lang]}</span>
          </div>
          <p style={{ margin: "6px 0" }}>
            <strong>{stage.title[lang]}:</strong> {stage.body[lang]}{" "}
            <span style={{ color: palette.muted }}>
              {tr(
                "Sequence control, not elapsed time.",
                "Control de secuencia, no tiempo transcurrido.",
              )}
            </span>
          </p>
          <details>
            <summary style={{ cursor: "pointer" }}>
              {tr("Sources and model limits", "Fuentes y límites del modelo")}
            </summary>
            {record.assumptions.map((a, i) => (
              <p key={i} style={{ margin: "5px 0" }}>
                {a[lang]}
              </p>
            ))}
            {selectedSources.map((s) => (
              <p key={s.id} style={{ margin: "5px 0" }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>{" "}
                - {s.citation}
              </p>
            ))}
          </details>
        </div>
      </section>
    </PickContext.Provider>
  );
}
export default MicroViewer;
