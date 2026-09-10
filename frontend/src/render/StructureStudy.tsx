import type { MicroNode } from "../lib/micro";

type Props = {
  node: MicroNode;
  lang: "en" | "es";
  dark: boolean;
  reveal: number;
  progress: number;
  onSelect: (id: string) => void;
};
/** Original structural cutaways. No measured lengths, molecule counts or material simulation. */
export function StructureStudy({
  node,
  lang,
  dark,
  reveal,
  progress,
  onSelect,
}: Props) {
  const t = (en: string, es: string) => (lang === "es" ? es : en);
  const ink = dark ? "#edf3e5" : "#193b31",
    muted = dark ? "#a6c7b7" : "#587965",
    green = dark ? "#9fceb1" : "#56886a",
    rose = dark ? "#eea7ca" : "#b74780",
    gold = dark ? "#ebc579" : "#aa7927",
    cyan = dark ? "#6fd6e0" : "#16828d",
    purple = dark ? "#c4afe5" : "#8662a8",
    bg = dark ? "#132d27" : "#f5f5e9";
  const id = node.id,
    open = Math.max(0, Math.min(1, reveal)),
    phase = Math.max(0, Math.min(1, progress));
  const text = (
    x: number,
    y: number,
    value: string,
    anchor: "start" | "middle" | "end" = "start",
  ) => (
    <text x={x} y={y} fill={ink} textAnchor={anchor} fontSize="18">
      {value}
    </text>
  );
  const callout = (
    x: number,
    y: number,
    tx: number,
    ty: number,
    value: string,
  ) => (
    <g>
      <path
        d={`M${x} ${y}L${tx} ${ty - 8}`}
        fill="none"
        stroke={muted}
        strokeWidth="1.5"
      />
      <circle cx={x} cy={y} r="4" fill={ink} />
      {text(tx, ty, value)}
    </g>
  );
  const action = (target: string, label: string, children: React.ReactNode) => (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onSelect(target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(target);
        }
      }}
      style={{ cursor: "pointer" }}
      className="micro-pick"
    >
      {children}
    </g>
  );
  const dots = (
    cx: number,
    cy: number,
    count: number,
    span: number,
    color: string,
  ) => (
    <g fill={color}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={cx + Math.sin(i * 2.39) * Math.sqrt(i / count) * span}
          cy={cy + Math.cos(i * 2.39) * Math.sqrt(i / count) * span * 0.67}
          r={3 + (i % 3)}
        />
      ))}
    </g>
  );
  let drawing: React.ReactNode;
  if (id === "petal-vacuole" || id === "petal-tonoplast") {
    drawing = (
      <>
        <ellipse
          cx="365"
          cy="238"
          rx="241"
          ry="156"
          fill={green}
          opacity=".09"
          stroke={green}
          strokeWidth="3"
          strokeDasharray="8 7"
        />
        <ellipse
          cx="365"
          cy="238"
          rx="172"
          ry="116"
          fill={rose}
          opacity={0.14 + 0.25 * (1 - open)}
        />
        <g opacity={open}>{dots(365, 238, 48, 139, rose)}</g>
        {action(
          id === "petal-vacuole" ? "petal-tonoplast" : "petal-vacuole",
          t(
            "Inspect the " + (id === "petal-vacuole" ? "tonoplast" : "vacuole"),
            "Examinar " +
              (id === "petal-vacuole" ? "el tonoplasto" : "la vacuola"),
          ),
          <ellipse
            cx="365"
            cy="238"
            rx="175"
            ry="119"
            fill="none"
            stroke={id === "petal-tonoplast" ? ink : rose}
            strokeWidth={id === "petal-tonoplast" ? 9 : 4}
          />,
        )}
        {id === "petal-tonoplast" && (
          <g transform={`translate(${35 * open},0)`}>
            <path
              d="M557 120Q600 235 557 356"
              stroke={ink}
              strokeWidth="11"
              fill="none"
            />
            <path
              d="M579 135Q620 235 579 341"
              stroke={rose}
              strokeWidth="3"
              fill="none"
              opacity=".65"
            />
            {callout(601, 238, 630, 225, t("Boundary", "Límite"))}
          </g>
        )}
        {callout(240, 185, 76, 76, t("Cell context", "Contexto celular"))}
        {callout(460, 202, 570, 89, t("Tonoplast", "Tonoplasto"))}
        {callout(
          355,
          270,
          294,
          420,
          t("Pigment compartment", "Compartimento con pigmentos"),
        )}
      </>
    );
  } else if (id.includes("nucleus") || id === "ovary-polar-nuclei") {
    const centers = id === "ovary-polar-nuclei" ? [270, 520] : [395];
    drawing = (
      <>
        <ellipse
          cx="395"
          cy="240"
          rx="288"
          ry="177"
          fill={gold}
          opacity=".08"
          stroke={green}
          strokeWidth="3"
          strokeDasharray="7 7"
        />
        {centers.map((x, i) => (
          <g key={x}>
            <ellipse
              cx={x}
              cy="240"
              rx={centers.length === 1 ? 151 : 91}
              ry={centers.length === 1 ? 140 : 100}
              fill={purple}
              fillOpacity={0.16 + (1 - open) * 0.45}
              stroke={purple}
              strokeWidth="6"
            />
            <g opacity={open}>
              {[0, 1, 2, 3].map((j) => (
                <path
                  key={j}
                  d={`M${x - 48 + j * 28} ${202 + (j % 2) * 12}q32 21 0 40t2 40`}
                  stroke={ink}
                  strokeWidth="5"
                  fill="none"
                />
              ))}
            </g>
            {text(
              x,
              centers.length === 1 ? 410 : 378,
              id === "ovary-polar-nuclei"
                ? t("Polar nucleus ", "Núcleo polar ") + (i + 1)
                : node.label[lang],
              "middle",
            )}
          </g>
        ))}
        {callout(
          410,
          120,
          548,
          65,
          t("Within the cell", "Dentro de la célula"),
        )}
        {text(
          395,
          460,
          t(
            "Chromatin drawn symbolically; counts are not chromosome numbers.",
            "Cromatina simbólica; los trazos no indican número cromosómico.",
          ),
          "middle",
        )}
      </>
    );
  } else if (id.startsWith("stem-")) {
    const wall = id === "stem-secondary-wall",
      pit = id === "stem-pit",
      plate = id === "stem-perforation";
    drawing = (
      <>
        <path
          d="M211 77V402M577 77V402"
          stroke={green}
          strokeWidth="52"
          fill="none"
          opacity={wall ? 1 : 0.4}
        />
        <rect
          x="237"
          y="77"
          width="314"
          height="325"
          fill={cyan}
          fillOpacity=".06"
        />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i} opacity={open}>
            <path
              d={`M${277 + i * 35} 394V${100 + (i % 2) * 18}`}
              fill="none"
              stroke={cyan}
              strokeWidth="2"
              strokeDasharray="9 13"
            />
            <path
              d={`M${271 + i * 35} ${340 - ((phase * 260 + i * 27) % 260) + 8}l6-9 6 9`}
              fill="none"
              stroke={cyan}
              strokeWidth="4"
            />
          </g>
        ))}
        {plate ? (
          <>
            <path
              d="M231 240H296M332 240H382M418 240H468M504 240H558"
              stroke={gold}
              strokeWidth="15"
            />
            {callout(
              399,
              240,
              582,
              227,
              t("End-wall opening", "Abertura de pared terminal"),
            )}
          </>
        ) : (
          <path
            d="M237 240H551"
            stroke={green}
            strokeWidth="2"
            strokeDasharray="6 9"
            opacity=".3"
          />
        )}
        {(pit || wall) && (
          <>
            {[139, 235, 331].map((y) => (
              <g key={y}>
                <ellipse
                  cx="211"
                  cy={y}
                  rx="27"
                  ry="22"
                  fill={bg}
                  stroke={gold}
                  strokeWidth="5"
                />
                <ellipse
                  cx="577"
                  cy={y}
                  rx="27"
                  ry="22"
                  fill={bg}
                  stroke={gold}
                  strokeWidth="5"
                />
              </g>
            ))}
            {pit && (
              <g>
                <circle
                  cx="612"
                  cy="236"
                  r="58"
                  fill={bg}
                  stroke={ink}
                  strokeWidth="3"
                />
                <path
                  d="M588 194V278M636 194V278"
                  stroke={green}
                  strokeWidth="13"
                />
                <path
                  d="M603 195V277M621 195V277"
                  stroke={gold}
                  strokeWidth="3"
                />
                {callout(610, 214, 649, 142, t("Pit region", "Punteadura"))}
              </g>
            )}
          </>
        )}
        {callout(
          382,
          170,
          302,
          45,
          t("Hollow conducting route", "Ruta conductora hueca"),
        )}
        {callout(213, 357, 48, 435, t("Reinforced wall", "Pared reforzada"))}
        {text(
          409,
          457,
          t(
            "A mature vessel element has no living protoplast.",
            "Un elemento maduro no tiene protoplasto vivo.",
          ),
          "middle",
        )}
      </>
    );
  } else if (id.startsWith("anther-")) {
    const aperture = id === "anther-aperture",
      inner = id === "anther-intine";
    drawing = (
      <>
        <path
          d="M556 204A175 175 0 1 0 539 327"
          fill={gold}
          fillOpacity={0.16 + (1 - open) * 0.5}
          stroke={gold}
          strokeWidth={inner ? 7 : 22}
          strokeDasharray={inner ? "none" : "11 7"}
        />
        <path
          d="M541 213A155 155 0 1 0 522 315"
          fill={bg}
          fillOpacity={open}
          stroke={green}
          strokeWidth={inner ? 11 : 4}
        />
        <g opacity={open}>
          <ellipse cx="326" cy="263" rx="35" ry="27" fill={purple} />
          <ellipse cx="414" cy="196" rx="30" ry="38" fill={rose} />
          <ellipse cx="414" cy="196" rx="12" ry="17" fill={purple} />
        </g>
        {(aperture || phase > 0.5) && (
          <path
            d={`M537 266Q${587 + phase * 65} 265 615 ${292 + phase * 70}`}
            fill="none"
            stroke={green}
            strokeWidth="27"
            strokeLinecap="round"
          />
        )}
        {callout(
          236,
          122,
          62,
          66,
          t("Resistant outer wall", "Pared exterior resistente"),
        )}
        {callout(362, 393, 441, 437, t("Inner wall", "Pared interior"))}
        {callout(
          550,
          240,
          601,
          139,
          t("Aperture region", "Región de la abertura"),
        )}
        {text(
          389,
          470,
          t(
            "Tube extension is a germination sequence, not growth-rate prediction.",
            "La extensión ilustra germinación; no predice velocidad de crecimiento.",
          ),
          "middle",
        )}
      </>
    );
  } else {
    drawing = (
      <>
        <path
          d="M197 99Q391 10 599 99V350Q397 459 197 350Z"
          fill={green}
          opacity=".22"
          stroke={green}
          strokeWidth="22"
        />
        <path
          d="M225 114Q397 45 571 114V335Q397 418 225 335Z"
          fill={rose}
          fillOpacity={0.1 + (1 - open) * 0.35}
          stroke={rose}
          strokeWidth="3"
        />
        <g opacity={open}>
          <ellipse
            cx="397"
            cy="237"
            rx="132"
            ry="108"
            fill={rose}
            opacity=".15"
          />
          <ellipse cx="290" cy="304" rx="29" ry="24" fill={purple} />
        </g>
        {callout(
          199,
          228,
          35,
          193,
          t("Outside the plasma membrane", "Fuera de la membrana plasmática"),
        )}
        {callout(455, 365, 501, 438, t("Cell interior", "Interior celular"))}
      </>
    );
  }
  return (
    <g
      data-study-node={id}
      data-study-reveal={open.toFixed(2)}
      data-study-kind={node.kind}
    >
      {drawing}
    </g>
  );
}
