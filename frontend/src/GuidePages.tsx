import type { ReactNode } from "react";
import {
  Callout,
  Cite,
  CitationsProvider,
  Equation,
  SubTabs,
  Tabs,
  Refs,
  useShellLang,
  type Citation,
} from "@fasl-work/caos-app-shell";
import { ArrowUpRight, Leaf, Microscope, ScanEye } from "lucide-react";
import type { Catalog, Localized } from "./lib/catalog.types";
import "./guides.css";

type Pair = [string, string];
type Family = {
  id: string;
  title: Pair;
  kicker: Pair;
  paragraphs: Pair[];
  limit: Pair;
  refs: string[];
};
const FAMILIES: Family[] = [
  {
    id: "organization",
    title: ["A flower, in layers", "Una flor, por capas"],
    kicker: [
      "Position gives a part its meaning",
      "La posición da sentido a cada parte",
    ],
    refs: ["osu-reproductive"],
    paragraphs: [
      [
        "Start with the whole flower before naming its parts. A complete flower has a calyx, corolla, stamens and pistil or pistils. Their relative positions give a useful map: the outer structures surround the reproductive structures. FLORARIA keeps that map visible when you select a component. Selection changes emphasis without changing the object into a different kind of flower. The model represents one explanatory arrangement; it is not the universal blueprint of every flowering plant.",
        "Comienza con la flor entera antes de nombrar sus partes. Una flor completa tiene cáliz, corola, estambres y pistilo o pistilos. Sus posiciones relativas forman un mapa útil: las estructuras externas rodean a las reproductivas. FLORARIA conserva ese mapa cuando seleccionas una parte. La selección cambia el énfasis sin convertir el objeto en otro tipo de flor. El modelo representa una organización explicativa; no es el plano universal de todas las plantas con flores.",
      ],
      [
        "Move the separation control slowly. The widening gaps are an annotation made in space: they help you follow which surfaces belong together. They do not reproduce how a flower can be pulled apart without damage. Reassemble it before judging attachment or position. A convincing exploded view must always have a route back to the intact view, because proximity is part of the information that disassembly temporarily removes.",
        "Mueve lentamente el control de separación. Los espacios que se abren son una anotación espacial: ayudan a seguir qué superficies pertenecen al mismo conjunto. No reproducen cómo se puede desarmar una flor sin dañarla. Vuelve a unirla antes de juzgar su inserción o posición. Una vista separada debe permitir regresar a la vista completa, porque la proximidad es parte de la información que el despiece elimina temporalmente.",
      ],
      [
        "A component can also contain components. Follow a stamen to its filament and anther, then follow the pistil through the stigma and style to the ovary and ovules. The same name should connect the spatial highlight and the written explanation. Use isolation when neighboring surfaces obstruct your view, then restore the neighbors to recover context. Neither isolation nor transparency creates additional observational evidence.",
        "Una parte también puede contener otras. Sigue un estambre hasta su filamento y antera; después recorre el pistilo desde el estigma y el estilo hasta el ovario y sus óvulos. El mismo nombre conecta el resaltado espacial y la explicación escrita. Usa el aislamiento cuando las superficies vecinas oculten la vista y luego restáuralas para recuperar el contexto. Ni el aislamiento ni la transparencia crean evidencia observacional adicional.",
      ],
      [
        "The distinction between complete and incomplete concerns which floral parts are present. It is different from the distinction between a flower with both reproductive functions and one with only one. Do not infer reproductive function from color or a large petal. This atlas gives you a bounded set of named structures and examples; identifying an unfamiliar plant requires a botanical key and additional characters beyond a resemblance to this model.",
        "La distinción entre una flor completa e incompleta depende de las partes presentes. Es diferente de distinguir una flor con ambas funciones reproductivas de otra con solo una. No deduzcas la función reproductiva del color o de un pétalo grande. Este atlas ofrece un conjunto delimitado de estructuras y ejemplos; identificar una planta desconocida requiere una clave botánica y más caracteres que su semejanza con este modelo.",
      ],
    ],
    limit: [
      "Model colors, spacing and proportions explain relationships. They are not measured specimen traits.",
      "Los colores, espacios y proporciones del modelo explican relaciones. No son caracteres medidos de un ejemplar.",
    ],
  },
  {
    id: "symmetry",
    title: ["Reading symmetry", "Leer la simetría"],
    kicker: [
      "Compare a view with its reflection",
      "Compara una vista con su reflejo",
    ],
    refs: ["kew-orchid", "anbg-characters"],
    paragraphs: [
      [
        "Symmetry is a relationship between corresponding parts, not a synonym for a regular outline. Begin face-on and ask which reflection would place comparable structures on each other. The fivefold outer teaching arrangement offers several candidate planes; this does not assert perfect symmetry of every internal part. An orchid demonstrates a bilateral organization around its distinctive lip and column. Looking from an oblique camera can obscure that relationship, so use a consistent view before drawing a conclusion.",
        "La simetría es una relación entre partes correspondientes, no un sinónimo de contorno regular. Comienza de frente y pregunta qué reflexión superpondría estructuras comparables. Una organización radial ofrece varios planos candidatos. La orquídea muestra una organización bilateral alrededor de su labelo y columna. Una cámara oblicua puede ocultar esa relación; utiliza una vista coherente antes de llegar a una conclusión.",
      ],
      [
        "The general flower is deliberately regular so that the exercise has an interpretable reference. The specimen is less obliging. A petal may bend toward the camera, overlap another organ or carry a local surface irregularity. Compare the arrangement of parts before comparing their exact silhouettes. A digitization can preserve asymmetry without changing the botanical description of the overall organization.",
        "La flor general es deliberadamente regular para que el ejercicio tenga una referencia interpretable. El ejemplar real es menos regular: un pétalo puede curvarse hacia la cámara, superponerse a otro órgano o mostrar una irregularidad local. Compara la disposición de las partes antes que sus siluetas exactas. Una digitalización puede conservar asimetrías sin cambiar la descripción botánica de la organización general.",
      ],
      [
        "Rotation changes the observation, whereas a symmetry claim concerns the object. Return to the front camera and keep the same orientation when comparing two specimens. Apparent differences in width can come from pose, framing or depth. The side camera is useful precisely because it exposes a dimension hidden in the frontal image. Combining views is more informative than treating one attractive screenshot as a complete description.",
        "La rotación cambia la observación, mientras que una afirmación de simetría se refiere al objeto. Regresa a la cámara frontal y conserva la orientación al comparar dos ejemplares. Las diferencias aparentes de anchura pueden proceder de la postura, el encuadre o la profundidad. La cámara lateral es útil porque revela una dimensión oculta en la vista frontal. Combinar vistas informa más que tratar una captura atractiva como una descripción completa.",
      ],
      [
        "A mirror exercise is a geometric aid. It does not measure developmental processes or prove that a scan has perfect bilateral symmetry. FLORARIA therefore separates the language of an idealized arrangement from the language of an observed surface. Record what remains consistent across views and what changes with perspective. That distinction is a transferable observation skill, even when the next object is not a flower.",
        "El ejercicio de reflexión es una ayuda geométrica. No mide procesos del desarrollo ni demuestra que un escaneo tenga simetría bilateral perfecta. FLORARIA distingue por eso el lenguaje de una organización idealizada del de una superficie observada. Registra qué se mantiene entre vistas y qué cambia con la perspectiva. Esa distinción es una habilidad de observación útil incluso cuando el siguiente objeto no sea una flor.",
      ],
    ],
    limit: [
      "No symmetry score is calculated from the museum scans. A visual comparison is not a shape-classification result.",
      "No se calcula un índice de simetría de los escaneos del museo. Una comparación visual no es un resultado de clasificación de formas.",
    ],
  },
  {
    id: "orchid",
    title: ["The orchid difference", "La diferencia de la orquídea"],
    kicker: [
      "The lip is a petal; the column changes the map",
      "El labelo es un pétalo; la columna cambia el mapa",
    ],
    refs: ["kew-orchid", "smithsonian-guide"],
    paragraphs: [
      [
        "The orchid model is a separate organization, not a general flower recolored. Three sepals surround three petals, with one petal differentiated as the lip. The conspicuous surfaces can be similarly colored, so color alone is a poor naming rule. Follow each label and compare its position with the other organs. The exercise is about correspondence: knowing what a surface represents matters more than giving every surface a different material.",
        "El modelo de orquídea representa una organización diferente; no es una flor general con otros colores. Tres sépalos rodean tres pétalos y uno de los pétalos se diferencia como labelo. Las superficies llamativas pueden tener colores similares, por lo que el color no basta para nombrarlas. Sigue cada etiqueta y compara su posición con los otros órganos. El ejercicio trata sobre correspondencias: saber qué representa una superficie importa más que asignarle un material diferente.",
      ],
      [
        "The column brings reproductive structures together. Do not look for the same free ring of stamens used in the general teaching model. Isolate the column, inspect its relation to the lip, and restore the perianth around it. A magnified explanatory part may be easier to read than it would be at a natural scale; the annotation must make that enlargement clear rather than suggesting the scan has revealed its microscopic detail.",
        "La columna reúne estructuras reproductivas. No busques el mismo anillo de estambres libres del modelo general. Aísla la columna, observa su relación con el labelo y restaura el perianto a su alrededor. Una parte explicativa ampliada puede resultar más legible que a escala natural; la anotación debe aclarar esa ampliación sin sugerir que el escaneo haya revelado su detalle microscópico.",
      ],
      [
        "The inferior ovary is another reason to keep the models distinct. Its location is described relative to the insertion of other floral parts, not simply as the lowest colored object on the screen. Use the section view to follow the explanatory arrangement. Cutting an opaque mesh is a display operation; the biological interpretation comes from the cited morphology and the authored model, not from the clipping plane itself.",
        "El ovario ínfero es otra razón para mantener separados ambos modelos. Su posición se describe respecto de la inserción de las otras piezas florales, no simplemente como el objeto coloreado más bajo de la pantalla. Usa la sección para seguir la organización explicativa. Cortar una malla opaca es una operación visual; la interpretación biológica procede de la morfología citada y del modelo construido, no del plano de corte.",
      ],
      [
        "The orchid family contains extensive variation. These five digitized blooms provide a small collection of observed forms, not a representative statistical sample of that diversity. Their surfaces can help you compare the broad presentation of sepals, petals and lips. They cannot establish the pollination mechanism, conservation condition or internal anatomy of every named specimen. Each such assertion needs its own source.",
        "La familia de las orquídeas presenta una gran diversidad. Estas cinco flores digitalizadas forman una pequeña colección de formas observadas, no una muestra estadística representativa de esa diversidad. Sus superficies permiten comparar la presentación general de sépalos, pétalos y labelos. No establecen el mecanismo de polinización, el estado de conservación ni la anatomía interna de cada ejemplar. Cada afirmación necesita su propia fuente.",
      ],
    ],
    limit: [
      "The teaching orchid summarizes selected structural relationships; the five scans have no organ segmentation.",
      "La orquídea didáctica resume relaciones estructurales seleccionadas; los cinco escaneos no tienen segmentación de órganos.",
    ],
  },
  {
    id: "reproduction",
    title: ["Pollen to ovule", "Del polen al óvulo"],
    kicker: [
      "Transfer and fertilization are different events",
      "La transferencia y la fecundación son eventos distintos",
    ],
    refs: ["osu-reproductive", "kew-pollination", "umd-plant-reproduction"],
    paragraphs: [
      [
        "Begin the sequence with an organ map. Pollen originates at the anther and pollination moves it to a stigma. This transfer is the event to observe first. A moving particle in the illustration represents that event; its size and trajectory are chosen for legibility. It is not a simulated grain with a calibrated aerodynamic path, and the animation does not identify which visitor pollinates a particular museum specimen.",
        "Comienza la secuencia con un mapa de órganos. El polen se origina en la antera y la polinización lo lleva hasta un estigma. Esa transferencia es el primer evento que debes observar. La partícula móvil representa ese evento; su tamaño y trayectoria se eligen para que sea legible. No es un grano simulado con una trayectoria aerodinámica calibrada y la animación no identifica qué visitante poliniza un ejemplar concreto del museo.",
      ],
      [
        "After suitable pollen reaches the stigma, a pollen tube can provide a route toward an ovule. The cutaway makes this otherwise hidden relationship inspectable. Move the progress control in small steps and name the structure at each stage. Progress is an ordinal teaching coordinate. Halfway along the slider does not mean that half the real duration has elapsed, or that half of the reproductive process has succeeded.",
        "Cuando polen adecuado llega al estigma, un tubo polínico puede proporcionar una vía hacia un óvulo. La sección permite inspeccionar esta relación oculta. Mueve el control de progreso en pequeños pasos y nombra la estructura de cada etapa. El progreso es una coordenada didáctica ordinal. La mitad del control no significa que haya transcurrido la mitad del tiempo real ni que se haya completado la mitad del proceso reproductivo.",
      ],
      [
        "Fertilization is distinct from successful pollen transfer. Compatibility and subsequent events matter, so the visible arrival of a particle must not be read as a guarantee of seed formation. The sequence presents a successful explanatory route to make the relationships learnable. Pausing between transfer and the later stages is a useful way to notice the gap between an observable contact and a biological outcome.",
        "La fecundación es distinta de una transferencia de polen exitosa. La compatibilidad y los eventos posteriores importan, por lo que la llegada visible de una partícula no garantiza la formación de una semilla. La secuencia muestra una vía explicativa exitosa para facilitar el aprendizaje de las relaciones. Pausar entre la transferencia y las etapas posteriores ayuda a reconocer la diferencia entre un contacto observable y un resultado biológico.",
      ],
      [
        "Use the same organ identity across successive views. Keeping the ovule highlighted while the explanatory state changes shows what the narrative is following. If a camera move obscures the structure, reset the view rather than guessing from the color of a nearby object. The written steps remain available independently of playback, so the concept can be explored with keyboard controls and without continuous motion.",
        "Conserva la identidad del órgano entre vistas sucesivas. Mantener resaltado el óvulo mientras cambia el estado explicativo muestra qué sigue la narración. Si la cámara oculta la estructura, restablece la vista en vez de deducirla por el color de un objeto cercano. Los pasos escritos están disponibles sin reproducción, de modo que el concepto puede explorarse con el teclado y sin movimiento continuo.",
      ],
    ],
    limit: [
      "This is a schematic successful pathway, not a prediction of fertilization probability or biological timing.",
      "Es una vía exitosa esquemática, no una predicción de la probabilidad de fecundación ni de sus tiempos biológicos.",
    ],
  },
  {
    id: "seedfruit",
    title: ["Following the identities", "Seguir las identidades"],
    kicker: [
      "An ovule becomes a seed; an ovary contributes to a fruit",
      "Un óvulo origina una semilla; el ovario contribuye al fruto",
    ],
    refs: ["osu-reproductive", "kew-seed", "umn-strawberry"],
    paragraphs: [
      [
        "A useful transition diagram preserves the identity of the structure that changes. Track an ovule toward the seed stage and the surrounding ovary toward the fruit stage. Those are different relationships even when both appear in the same scene. The model uses persistent colors and selection to support that distinction. The correspondence is the lesson; the amount of expansion on screen is an illustrative choice.",
        "Un diagrama de transición útil conserva la identidad de la estructura que cambia. Sigue un óvulo hacia la etapa de semilla y el ovario que lo rodea hacia la etapa de fruto. Son relaciones diferentes aunque aparezcan en la misma escena. El modelo usa colores y selección persistentes para mantener esa distinción. La correspondencia es la enseñanza; el grado de expansión en pantalla es una elección ilustrativa.",
      ],
      [
        "The statement that an ovary contributes to a fruit needs its botanical context. Some fruits also include tissue from other floral structures. A familiar edible part is not automatically equivalent to an ovary wall. FLORARIA therefore uses the general sequence for a bounded structural explanation and keeps exceptions in the source-linked text. Do not assign the general diagram to a specific fruit without checking how that fruit develops.",
        "La afirmación de que el ovario contribuye al fruto necesita contexto botánico. Algunos frutos incluyen tejido de otras estructuras florales. Una parte comestible conocida no equivale automáticamente a la pared del ovario. FLORARIA usa la secuencia general para una explicación estructural delimitada y mantiene las excepciones en el texto con fuentes. No asignes el diagrama general a un fruto concreto sin comprobar cómo se desarrolla.",
      ],
      [
        "The orchid example places another boundary on generalization. Orchid seeds do not follow the familiar endosperm-rich seed diagram often used for introductory explanations. The atlas does not replace this difference with a generic bean-like cutaway. A sequence ending at seed formation is also not an account of germination, seedling establishment or the interactions that sustain later growth. Stopping at the stated boundary preserves the meaning of the evidence.",
        "El ejemplo de la orquídea establece otro límite a la generalización. Sus semillas no siguen el esquema habitual de una semilla rica en endospermo que se usa en muchas introducciones. El atlas no sustituye esa diferencia por una sección genérica semejante a un frijol. Una secuencia que termina en la formación de semillas tampoco describe la germinación, el establecimiento de plántulas ni las interacciones del crecimiento posterior. Detenerse en el límite declarado conserva el significado de la evidencia.",
      ],
      [
        "Ask a precise question before manipulating the view: which earlier structure does this later object represent? This avoids confusing the order of the animation with a proof about development. Read the investigation steps, compare the selected structure before and after, and return to the intact flower. Saving that state lets you revisit the same explanatory question; it does not turn the selected values into a biological measurement.",
        "Plantea una pregunta precisa antes de manipular la vista: ¿qué estructura anterior representa este objeto posterior? Así evitas confundir el orden de una animación con una demostración del desarrollo. Lee los pasos, compara la estructura seleccionada antes y después y regresa a la flor completa. Guardar ese estado permite retomar la misma pregunta explicativa; no convierte los valores elegidos en una medición biológica.",
      ],
    ],
    limit: [
      "Morphological transitions are simplified and bounded. Fruit type, germination and growth need their own species-specific evidence.",
      "Las transiciones morfológicas están simplificadas y delimitadas. El tipo de fruto, la germinación y el crecimiento necesitan evidencia específica.",
    ],
  },
  {
    id: "specimens",
    title: ["Evidence in a surface", "La evidencia de una superficie"],
    kicker: [
      "A scan records an example, not an entire species",
      "Un escaneo registra un ejemplo, no toda una especie",
    ],
    refs: ["smithsonian-orchids", "smithsonian-openaccess", "smithsonian-api"],
    paragraphs: [
      [
        "The museum lane contains digitized blooms with their names and source credits intact. Their textures and surface shapes provide observational material that the teaching model does not. Rotate a specimen, look for overlap and inspect a silhouette from more than one direction. Stay within what the surface records. A convincing texture is not evidence of organ segmentation, an internal tissue boundary or a hidden reproductive event.",
        "La colección del museo contiene flores digitalizadas con sus nombres y créditos de origen. Sus texturas y formas superficiales aportan material observacional que no ofrece el modelo didáctico. Gira un ejemplar, busca superposiciones e inspecciona la silueta desde varias direcciones. Limítate a lo que registra la superficie. Una textura convincente no demuestra segmentación de órganos, límites internos de tejidos ni un evento reproductivo oculto.",
      ],
      [
        "Compact and detailed files are two digital versions of the same specimen. They trade geometric and image detail against transfer and decoding cost. Switch fidelity while maintaining the same camera to make a fair visual comparison. More triangles mean a more detailed representation, not an independently established improvement in botanical truth. The collection table reports actual asset metadata so that the comparison remains inspectable.",
        "Los archivos compactos y detallados son dos versiones digitales del mismo ejemplar. Intercambian detalle geométrico y visual por costo de transferencia y decodificación. Cambia la fidelidad conservando la cámara para hacer una comparación justa. Más triángulos significan una representación más detallada, no una mejora demostrada de la verdad botánica. La tabla de la colección presenta los metadatos reales para que la comparación pueda inspeccionarse.",
      ],
      [
        "Comparison uses normalized framing to keep differently shaped blooms visible. A similar on-screen extent must not be read as equal physical size. Unless a documented scale accompanies a specimen, the viewer supports comparison of arrangement and appearance rather than a ruler-based claim about dimensions. Source records and catalog facts remain the place to check what was documented and what is unknown.",
        "La comparación utiliza un encuadre normalizado para mantener visibles flores de formas distintas. Una extensión similar en pantalla no significa que tengan el mismo tamaño físico. Si un ejemplar no tiene una escala documentada, la vista permite comparar organización y apariencia, no afirmar dimensiones mediante una regla. Los registros de origen y los datos del catálogo permiten comprobar qué se documentó y qué se desconoce.",
      ],
      [
        "The source trail is part of the exhibit. Each digital asset has a recorded acquisition location, integrity hash and rights statement. A hash checks whether bytes match the selected source file; it does not verify a species name or evaluate a scientific claim. These different kinds of evidence are useful precisely because their jobs remain separate. You can inspect the collection and follow the original museum sources without creating an account.",
        "La procedencia forma parte de la exposición. Cada recurso digital tiene una ubicación de adquisición registrada, una huella de integridad y una declaración de derechos. La huella comprueba si los bytes coinciden con el archivo elegido; no verifica el nombre de una especie ni evalúa una afirmación científica. Estas evidencias son útiles porque cumplen funciones distintas. Puedes explorar la colección y seguir las fuentes originales sin crear una cuenta.",
      ],
    ],
    limit: [
      "The collection has five blooms, not population coverage. Rendering quality and file integrity do not measure educational impact.",
      "La colección tiene cinco flores, no cobertura poblacional. La calidad de representación y la integridad de archivos no miden el impacto educativo.",
    ],
  },
];

const TECH: Citation[] = [
  {
    id: "three-gltf",
    label: "Three.js glTF",
    citation: "Three.js. GLTFLoader documentation.",
    url: "https://threejs.org/docs/pages/GLTFLoader.html",
  },
  {
    id: "three-draco",
    label: "Three.js Draco",
    citation: "Three.js. DRACOLoader documentation.",
    url: "https://threejs.org/docs/pages/DRACOLoader.html",
  },
  {
    id: "three-plane",
    label: "Three.js planes",
    citation: "Three.js. Plane documentation.",
    url: "https://threejs.org/docs/pages/Plane.html",
  },
  {
    id: "three-ray",
    label: "Three.js picking",
    citation: "Three.js. Raycaster documentation.",
    url: "https://threejs.org/docs/pages/Raycaster.html",
  },
  {
    id: "gltf-format",
    label: "glTF 2.0",
    citation: "Khronos Group. glTF 2.0 specification.",
    url: "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html",
  },
  {
    id: "w3c-wcag",
    label: "WCAG 2.2",
    citation: "W3C. Web Content Accessibility Guidelines 2.2.",
    url: "https://www.w3.org/TR/WCAG22/",
  },
];

function BotanicalFigure({ kind, es }: { kind: string; es: boolean }) {
  const tx = (a: string, b: string) => (es ? b : a);
  const common = (
    <>
      <defs>
        <marker
          id={`arrow-${kind}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0L10 5L0 10Z" fill="var(--color-accent)" />
        </marker>
      </defs>
    </>
  );
  let drawing: ReactNode;
  if (kind === "symmetry")
    drawing = (
      <>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="145"
            cy="84"
            rx="24"
            ry="48"
            transform={`rotate(${a} 145 130)`}
            className="fl-fig-petal"
          />
        ))}
        <circle cx="145" cy="130" r="18" className="fl-fig-core" />
        <path d="M145 40V205M80 79L210 181" className="fl-fig-dash" />
        <path
          d="M383 125C319 28 284 51 331 121C274 152 320 192 383 151M383 125C447 28 482 51 435 121C492 152 446 192 383 151"
          className="fl-fig-petal"
        />
        <path
          d="M368 139Q329 202 383 198Q437 202 398 139Z"
          className="fl-fig-core"
        />
        <path d="M383 32V213" className="fl-fig-dash" />
        <text x="145" y="235" textAnchor="middle">
          {tx("Radial teaching arrangement", "Organización radial didáctica")}
        </text>
        <text x="383" y="235" textAnchor="middle">
          {tx(
            "Bilateral orchid arrangement",
            "Organización bilateral de orquídea",
          )}
        </text>
      </>
    );
  else if (kind === "reproduction" || kind === "seedfruit")
    drawing = (
      <>
        {[75, 250, 425].map((x, i) => (
          <g key={x}>
            <circle
              cx={x}
              cy="112"
              r="42"
              className={i === 1 ? "fl-fig-petal" : "fl-fig-core"}
            />
            <path
              d={`M${x - 16} 119Q${x} 74 ${x + 16} 119Q${x} 146 ${x - 16} 119Z`}
              className="fl-fig-sepal"
            />
            {i < 2 && (
              <path
                d={`M${x + 54} 112H${x + 117}`}
                className="fl-fig-flow"
                markerEnd={`url(#arrow-${kind})`}
              />
            )}
          </g>
        ))}
        {(kind === "reproduction"
          ? [
              tx("Pollen transfer", "Transferencia de polen"),
              tx("Tube pathway", "Vía del tubo"),
              tx("Ovule / later outcome", "Óvulo / resultado posterior"),
            ]
          : [
              tx("Ovule in ovary", "Óvulo en ovario"),
              tx("Identity retained", "Identidad conservada"),
              tx("Seed and fruit", "Semilla y fruto"),
            ]
        ).map((s, i) => (
          <text key={s} x={75 + i * 175} y="185" textAnchor="middle">
            {s}
          </text>
        ))}
        <text x="250" y="226" textAnchor="middle" className="fl-fig-note">
          {tx(
            "Order is explanatory; distances and elapsed times are not calibrated.",
            "El orden es explicativo; distancias y tiempos no están calibrados.",
          )}
        </text>
      </>
    );
  else if (kind === "specimens")
    drawing = (
      <>
        <path
          d="M68 75L117 41L165 95L139 172L64 162L37 110Z"
          className="fl-fig-petal"
        />
        <path
          d="M68 75L139 172M117 41L64 162M37 110L165 95"
          className="fl-fig-line"
        />
        <path
          d="M345 72Q398 18 441 85Q480 114 437 168Q403 209 356 164Q302 137 345 72Z"
          className="fl-fig-petal"
        />
        {[70, 95, 120, 145].map((y, i) => (
          <path
            key={y}
            d={`M${340 - i * 2} ${y}Q390 ${y + 25} ${443 - i * 2} ${y}`}
            className="fl-fig-line"
          />
        ))}
        <path
          d="M191 112H295"
          className="fl-fig-flow"
          markerEnd={`url(#arrow-${kind})`}
        />
        <text x="102" y="218" textAnchor="middle">
          {tx("Compact surface", "Superficie compacta")}
        </text>
        <text x="395" y="218" textAnchor="middle">
          {tx("Detailed surface", "Superficie detallada")}
        </text>
        <text x="245" y="83" textAnchor="middle" className="fl-fig-note">
          {tx("Same specimen", "Mismo ejemplar")}
        </text>
      </>
    );
  else
    drawing = (
      <>
        <path d="M244 140L243 220L257 220L256 140" className="fl-fig-sepal" />
        <path
          d="M245 139Q135 107 168 183Q214 187 247 161M255 139Q365 107 332 183Q286 187 253 161"
          className="fl-fig-sepal"
        />
        <path
          d="M245 128Q142 0 148 87Q134 147 237 153M255 128Q358 0 352 87Q366 147 263 153"
          className="fl-fig-petal"
        />
        <ellipse cx="250" cy="144" rx="21" ry="33" className="fl-fig-core" />
        <path d="M250 134V82M229 79H271" className="fl-fig-flow" />
        <path
          d="M157 73H75M173 169H75M271 89H351M273 158H355"
          className="fl-fig-line"
        />
        <text x="65" y="67" textAnchor="end">
          {tx("Petal", "Pétalo")}
        </text>
        <text x="65" y="168" textAnchor="end">
          {tx("Sepal", "Sépalo")}
        </text>
        <text x="360" y="91">
          {kind === "orchid"
            ? tx("Column", "Columna")
            : tx("Stigma and style", "Estigma y estilo")}
        </text>
        <text x="365" y="164">
          {kind === "orchid"
            ? tx("Inferior ovary", "Ovario ínfero")
            : tx("Ovary / ovules", "Ovario / óvulos")}
        </text>
        {kind === "orchid" && (
          <>
            <path
              d="M235 135Q174 188 250 193Q326 188 265 135Z"
              className="fl-fig-core"
            />
            <text x="250" y="246" textAnchor="middle">
              {tx(
                "Lip: a differentiated petal",
                "Labelo: un pétalo diferenciado",
              )}
            </text>
          </>
        )}
      </>
    );
  return (
    <figure className="fl-guide-figure">
      <svg
        viewBox="0 0 520 265"
        role="img"
        aria-label={tx(
          "Explanatory diagram. Not to scale.",
          "Diagrama explicativo. Sin escala.",
        )}
      >
        <title>
          {tx(
            "Explanatory diagram. Not to scale.",
            "Diagrama explicativo. Sin escala.",
          )}
        </title>
        {common}
        {drawing}
      </svg>
      <figcaption>
        {tx(
          "Authored explanatory diagram. Colors and proportions aid reading.",
          "Diagrama explicativo propio. Los colores y proporciones facilitan la lectura.",
        )}
      </figcaption>
    </figure>
  );
}

function FamilyPanel({
  item,
  onExplore,
}: {
  item: Family;
  onExplore: (view: Record<string, unknown>) => void;
}) {
  const es = useShellLang() === "es";
  const p = (v: Pair) => v[es ? 1 : 0];
  return (
    <section className="fl-guide-section">
      <p className="fl-guide-eyebrow">{p(item.kicker)}</p>
      <h2>{p(item.title)}</h2>
      <div className="fig-row">
        <div>
          {item.paragraphs.slice(0, 2).map((v, i) => (
            <p key={i}>
              {p(v)} {i === 0 && <Cite id={item.refs[0]!} />}
            </p>
          ))}
        </div>
        <BotanicalFigure kind={item.id} es={es} />
      </div>
      {item.paragraphs.slice(2).map((v, i) => (
        <p key={i}>{p(v)}</p>
      ))}
      <Callout
        variant="honest"
        title={es ? "Límite de la representación" : "Representation boundary"}
      >
        {p(item.limit)}
      </Callout>
      <Refs ids={item.refs} label={es ? "Fuentes:" : "Sources:"} />
      <button
        className="fl-guide-action"
        onClick={() =>
          onExplore({
            mode:
              item.id === "specimens"
                ? "specimen"
                : item.id === "reproduction" || item.id === "seedfruit"
                  ? "lifecycle"
                  : "anatomy",
            model: item.id === "orchid" ? "orchid" : "general",
            stage: item.id === "seedfruit" ? 0.8 : 0.15,
          })
        }
      >
        <ScanEye size={16} />
        {es ? "Explorar este concepto" : "Explore this concept"}
      </button>
    </section>
  );
}

function Introduction({
  catalog,
  onExplore,
}: {
  catalog: Catalog;
  onExplore: (view: Record<string, unknown>) => void;
}) {
  const es = useShellLang() === "es";
  const sections: { title: Pair; body: Pair; refs: string[] }[] = [
    {
      title: ["An invitation to look closely", "Una invitación a observar"],
      body: [
        "A flower is familiar at a distance and surprisingly intricate up close. FLORARIA connects three ways of looking: rotate a real digitized bloom, investigate an explicit model of its organization, and follow a small number of explained changes. Begin with the specimen that catches your eye, then ask a particular question. Which surface is a petal? What is hidden by another part? What changes when the camera moves? The tools work best when a question guides the gesture.",
        "Una flor resulta familiar a distancia y sorprendentemente compleja de cerca. FLORARIA conecta tres formas de mirar: girar una flor digitalizada, investigar un modelo explícito de su organización y seguir algunos cambios explicados. Comienza con el ejemplar que te atraiga y plantea una pregunta concreta. ¿Qué superficie es un pétalo? ¿Qué oculta otra parte? ¿Qué cambia al mover la cámara? Las herramientas funcionan mejor cuando una pregunta orienta el gesto.",
      ],
      refs: ["smithsonian-orchids"],
    },
    {
      title: [
        "Two kinds of object, two kinds of evidence",
        "Dos tipos de objeto y de evidencia",
      ],
      body: [
        "A museum scan provides an observed outer surface. A teaching model makes named relationships selectable. Neither replaces the other. The scan lane retains specimen names and source credits; the anatomy lane exposes the hierarchy needed for explanation. Switching lanes is therefore a change of evidence type, not a deeper zoom into the same object. The mode label stays important even when the forms look similar.",
        "Un escaneo de museo proporciona una superficie externa observada. Un modelo didáctico permite seleccionar relaciones nombradas. Ninguno sustituye al otro. La colección conserva nombres y créditos; la anatomía expone la jerarquía necesaria para explicar. Cambiar de modo cambia el tipo de evidencia: no es un acercamiento más profundo al mismo objeto. La etiqueta del modo sigue siendo importante aunque las formas parezcan similares.",
      ],
      refs: ["smithsonian-openaccess", "smithsonian-guide"],
    },
    {
      title: [
        "Learn the vocabulary through a relationship",
        "Aprender el vocabulario mediante una relación",
      ],
      body: [
        "A name becomes useful when you can place it in context. The glossary below connects organs to their structural role; the component explanation adds the specific details. Select a part in the anatomy view, isolate it, then restore its neighbors. Read the distinction between the general flower and orchid before treating the same word as the same arrangement. Botanical vocabulary supports careful comparison; it is not an automated identification key.",
        "Un nombre resulta útil cuando puedes situarlo en contexto. El glosario conecta órganos con su función estructural; la explicación de cada parte añade detalles específicos. Selecciona una parte, aíslala y restaura sus vecinas. Lee la diferencia entre la flor general y la orquídea antes de interpretar una palabra como una organización idéntica. El vocabulario botánico ayuda a comparar con cuidado; no es una clave de identificación automática.",
      ],
      refs: ["osu-reproductive", "kew-orchid"],
    },
    {
      title: [
        "A practical route through the atlas",
        "Un recorrido práctico por el atlas",
      ],
      body: [
        "Choose an investigation, read its question, and open its first view. Make one change at a time, then compare the result with the written observation. For a scan, keep the camera consistent while changing fidelity or specimen. For anatomy, restore the intact model after disassembly. For a sequence, pause at each named event. Save or share a view only after you can say which object, model and explanatory state it represents.",
        "Elige una investigación, lee su pregunta y abre la primera vista. Haz un cambio a la vez y compara el resultado con la observación escrita. En un escaneo, conserva la cámara al cambiar fidelidad o ejemplar. En anatomía, restaura el modelo completo después del despiece. En una secuencia, pausa en cada evento nombrado. Guarda o comparte una vista cuando puedas indicar qué objeto, modelo y estado explicativo representa.",
      ],
      refs: ["smithsonian-orchids", "osu-reproductive"],
    },
    {
      title: [
        "What the collection can establish",
        "Qué permite establecer la colección",
      ],
      body: [
        "The collection is finite and curated. File checksums establish integrity; component labels establish the authored model vocabulary; source references support botanical statements. These are separate checks. None measures how much a visitor learns, proves that every flower has the displayed proportions, or predicts a biological outcome. The evidence page exposes actual asset sizes and mesh counts so that implementation claims can be checked without turning them into claims of scientific accuracy.",
        "La colección es finita y seleccionada. Las huellas de archivo establecen integridad; las etiquetas definen el vocabulario del modelo; las fuentes respaldan las afirmaciones botánicas. Son comprobaciones distintas. Ninguna mide cuánto aprende una persona, demuestra que todas las flores tengan esas proporciones ni predice resultados biológicos. La página de evidencia muestra tamaños y conteos reales para comprobar la implementación sin convertirlos en afirmaciones de exactitud científica.",
      ],
      refs: ["smithsonian-api", "smithsonian-openaccess"],
    },
  ];
  return (
    <>
      <BotanicalFigure kind="organization" es={es} />
      <SubTabs
        orientation="vertical"
        ariaLabel={es ? "Secciones de la guía" : "Field guide sections"}
        tabs={sections.map((s, i) => ({
          id: String(i),
          label: s.title[es ? 1 : 0],
          content: (
            <section className="fl-guide-section">
              <h2>{s.title[es ? 1 : 0]}</h2>
              <p>{s.body[es ? 1 : 0]}</p>
              {i === 2 && (
                <dl className="fl-guide-glossary">
                  {catalog.structures.map((s) => (
                    <div key={s.id}>
                      <dt>{s.label[es ? "es" : "en"]}</dt>
                      <dd>{s.summary[es ? "es" : "en"]}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {i === 3 && (
                <ol>
                  <li>
                    {es
                      ? "Elige una pregunta y abre su vista."
                      : "Choose a question and open its view."}
                  </li>
                  <li>
                    {es
                      ? "Cambia un control y describe lo que observas."
                      : "Change one control and describe what you observe."}
                  </li>
                  <li>
                    {es
                      ? "Revisa la fuente y el límite de la representación."
                      : "Check the source and the representation boundary."}
                  </li>
                  <li>
                    {es
                      ? "Restaura, compara y comparte un estado comprensible."
                      : "Restore, compare and share an interpretable state."}
                  </li>
                </ol>
              )}
              <Refs ids={s.refs} label={es ? "Fuentes:" : "Sources:"} />
            </section>
          ),
        }))}
      />
      <button
        className="fl-guide-action"
        onClick={() => onExplore({ mode: "anatomy", model: "general" })}
      >
        <Leaf size={16} />
        {es ? "Abrir la flor didáctica" : "Open the teaching flower"}
      </button>
    </>
  );
}

function Implementation() {
  const es = useShellLang() === "es";
  const t = (en: string, sp: string) => (es ? sp : en);
  const topics = [
    {
      id: "acquisition",
      name: t("Acquisition", "Adquisición"),
      body: t(
        "Source records select exact museum files before release. Acquisition checks the expected bytes and SHA-256 digest, keeps the original source relationship and rejects an unexpected replacement. A repeatable local command produces the same selected corpus without making the public page depend on a live museum API. Rights records accompany the assets; technical accessibility is not a redistribution license.",
        "Los registros seleccionan archivos concretos antes de publicar. La adquisición comprueba bytes y SHA-256, conserva la relación de origen y rechaza sustituciones inesperadas. Un comando local reproducible obtiene el mismo conjunto sin que la página dependa de una API activa del museo. Los derechos acompañan a los recursos; el acceso técnico no es una licencia de redistribución.",
      ),
      refs: ["smithsonian-api", "smithsonian-openaccess"],
    },
    {
      id: "contracts",
      name: t("Catalog contracts", "Contratos del catálogo"),
      body: t(
        "The source catalog and browser artifact share stable specimen, component and investigation identifiers. Both languages are required. Every source reference must resolve and every investigation opens a valid view. The interface reads the published catalog rather than maintaining a second handwritten specimen table. File metadata describes an asset; the source statement describes its evidence. Neither is substituted for the other.",
        "El catálogo de origen y el recurso del navegador comparten identificadores estables de ejemplares, partes e investigaciones. Ambos idiomas son obligatorios. Cada referencia debe existir y cada investigación abrir una vista válida. La interfaz lee el catálogo publicado en vez de mantener otra tabla manual. Los metadatos describen el archivo; la procedencia describe su evidencia. Ninguno sustituye al otro.",
      ),
      refs: ["gltf-format"],
    },
    {
      id: "geometry",
      name: t("Geometry and framing", "Geometría y encuadre"),
      body: t(
        "The GLB container carries geometry, materials and embedded images. Inspection records actual index-derived triangle counts instead of trusting a filename. Viewer framing centers and fits an object so it remains inspectable. That normalization is a camera/display convention. It must not silently add a millimeter scale, equate the physical sizes of different specimens, or turn the original single mesh into a segmented model.",
        "El contenedor GLB incluye geometría, materiales e imágenes. La inspección registra triángulos a partir de los índices reales en lugar de confiar en el nombre del archivo. El encuadre centra y ajusta el objeto para inspeccionarlo. Es una convención visual: no añade una escala milimétrica, no iguala tamaños físicos ni convierte una malla única en un modelo segmentado.",
      ),
      refs: ["gltf-format", "three-gltf"],
    },
    {
      id: "rendering",
      name: t("Materials and fidelity", "Materiales y fidelidad"),
      body: t(
        "Compact and detailed GLBs share a loading path. A reusable Draco decoder handles compressed geometry; local decoder assets avoid a new third-party runtime dependency. Switching fidelity replaces the asset, while lighting and camera controls change its presentation. Loading and decoding can fail independently of catalog loading, so an error must preserve readable specimen information and a usable route back to another object.",
        "Los GLB compactos y detallados comparten una ruta de carga. Un decodificador Draco reutilizable maneja la geometría comprimida; los recursos locales evitan otra dependencia externa en ejecución. La fidelidad sustituye el archivo, mientras la luz y la cámara cambian su presentación. La carga y decodificación pueden fallar sin afectar al catálogo; el error debe conservar información legible y una salida hacia otro objeto.",
      ),
      refs: ["three-draco", "three-gltf"],
    },
    {
      id: "selection",
      name: t("Picking and transforms", "Selección y transformaciones"),
      body: t(
        "Picking connects a visible teaching mesh to its component identifier. The same identifier selects its explanatory record. Explosion translates authored component groups; isolation changes visibility; a clipping plane removes the rendered half-space. These operations answer different spatial questions. A section through a scan reveals a clipped surface boundary, not validated internal anatomy; the mode and explanation must remain visible.",
        "La selección conecta una malla didáctica visible con el identificador de su parte y su explicación. La separación traslada grupos construidos; el aislamiento cambia visibilidad; el plano de corte elimina un semiespacio de la representación. Responden preguntas distintas. Una sección de un escaneo revela el límite de una superficie cortada, no anatomía interna validada; el modo y la explicación deben seguir visibles.",
      ),
      refs: ["three-ray", "three-plane"],
    },
    {
      id: "animation",
      name: t("A bounded sequence", "Una secuencia delimitada"),
      body: t(
        "A progress value selects an educational state. Interpolation keeps transitions readable while direct stepping lets the visitor inspect each event without motion. Playback starts only after a user action and stops when hidden. The application does not integrate a growth equation or estimate biological time. Replaying a sequence reproduces its explanatory ordering, not an experiment on a living plant.",
        "Un valor de progreso selecciona un estado didáctico. La interpolación hace legibles las transiciones y el avance directo permite inspeccionar eventos sin movimiento. La reproducción comienza por acción del usuario y se detiene al ocultarse. La aplicación no integra una ecuación de crecimiento ni estima tiempo biológico. Reproducir la secuencia repite su orden explicativo, no un experimento con una planta viva.",
      ),
      refs: ["osu-reproductive", "w3c-wcag"],
    },
    {
      id: "state",
      name: t("State and accessibility", "Estado y accesibilidad"),
      body: t(
        "A bounded state record carries selected object, teaching mode and control values. Sharing and JSON import must pass the same validation as an investigation view; unknown identifiers fall back to supported defaults and finite numbers are clamped to allowed ranges. Invalid file envelopes are rejected. Local bookmarks stay in this browser. Keyboard controls and written investigation steps complement the pointer-driven stage. A saved view retains a camera preset, not its free orbit. It is an interaction state, not a specimen measurement or a cloud account.",
        "Un registro delimitado contiene objeto, modo y controles. Compartir e importar JSON debe pasar la misma validación que una investigación; los identificadores desconocidos vuelven a valores admitidos y los n?meros finitos se acotan al rango permitido. Se rechazan los archivos con envolturas inv?lidas. Los marcadores permanecen en este navegador. El teclado y los pasos escritos complementan la vista con puntero. Una vista guardada es un estado de interacción, no una medición ni una cuenta en la nube.",
      ),
      refs: ["w3c-wcag"],
    },
    {
      id: "deployment",
      name: t("Build and delivery", "Construcción y publicación"),
      body: t(
        "The offline process publishes a catalog, assets and a checksum manifest. The web build verifies and copies those outputs; deployment serves the audited static bundle. No visitor account, database, runtime secret or paid API is needed. A release can therefore be compared byte-for-byte with its manifest and rolled back to a previous bundle. That operational check remains separate from the botanical review of its content.",
        "El proceso previo publica catálogo, recursos y manifiesto de huellas. La construcción web comprueba y copia esas salidas; el despliegue sirve el paquete estático auditado. No requiere cuenta, base de datos, secretos en ejecución ni API de pago. Una versión puede compararse byte a byte con su manifiesto y restaurarse a un paquete anterior. Esa comprobación operativa es distinta de la revisión botánica del contenido.",
      ),
      refs: ["smithsonian-api", "gltf-format"],
    },
  ];
  const groups = [
    {
      id: "evidence",
      name: t("Source to artifact", "De fuente a recurso"),
      ids: ["acquisition", "contracts", "geometry"],
    },
    {
      id: "view",
      name: t("Inside the viewer", "Dentro de la vista"),
      ids: ["rendering", "selection", "animation"],
    },
    {
      id: "delivery",
      name: t("Use and delivery", "Uso y publicación"),
      ids: ["state", "deployment"],
    },
  ];
  return (
    <>
      <Callout
        variant="strong"
        title={t(
          "Reproducible artifacts, explicit illustrations",
          "Recursos reproducibles e ilustraciones explícitas",
        )}
      >
        {t(
          "The museum corpus is checked before release. Browser transformations remain view operations. No training, inference or growth prediction is claimed.",
          "La colección se comprueba antes de publicar. Las transformaciones del navegador siguen siendo operaciones visuales. No se afirma entrenamiento, inferencia ni predicción del crecimiento.",
        )}
      </Callout>
      <Tabs
        ariaLabel={t("Implementation groups", "Grupos de implementación")}
        tabs={groups.map((g) => ({
          id: g.id,
          label: g.name,
          content: (
            <SubTabs
              orientation="vertical"
              tabs={topics
                .filter((x) => g.ids.includes(x.id))
                .map((x) => ({
                  id: x.id,
                  label: x.name,
                  content: (
                    <section className="fl-guide-section">
                      <h2>{x.name}</h2>
                      <p>{x.body}</p>
                      <EngineeringEquation kind={x.id} />
                      <Callout variant="honest">
                        {t(
                          "Implementation checks establish the stated software behavior. Botanical claims still require the linked evidence and the declared representation limits.",
                          "Las comprobaciones establecen el comportamiento del software. Las afirmaciones botánicas siguen requiriendo evidencia y límites explícitos.",
                        )}
                      </Callout>
                      <Refs ids={x.refs} label={t("Sources:", "Fuentes:")} />
                    </section>
                  ),
                }))}
            />
          ),
        }))}
      />
    </>
  );
}

function EngineeringEquation({ kind }: { kind: string }) {
  const es = useShellLang() === "es";
  const eq: Record<string, Pair> = {
    acquisition: [
      "h=\\operatorname{SHA256}(b)",
      "h identifies the file bytes b; matching hashes check byte integrity, not botanical correctness.|h identifica los bytes b; la coincidencia comprueba integridad, no corrección botánica.",
    ],
    contracts: [
      "I_{\\mathrm{valid}}=I_{\\mathrm{schema}}\\land I_{\\mathrm{references}}\\land I_{\\mathrm{ranges}}",
      "A valid record must pass schema, reference and range checks. Each I is a Boolean condition.|Un registro válido cumple esquema, referencias y rangos. Cada I es una condición booleana.",
    ],
    geometry: [
      "\\mathbf{x}_{view}=s(\\mathbf{x}-\\mathbf{c})",
      "x is a source point, c the framing center and s a view scale. This is a display transform, not a physical unit conversion.|x es un punto, c el centro de encuadre y s la escala visual. Es una transformación de vista, no una conversión de unidades físicas.",
    ],
    rendering: [
      "r_B=B_{detail}/B_{compact}",
      "B is transferred asset bytes and r_B is their ratio. It is not a speed or quality score.|B son bytes del recurso y r_B es su razón. No es un índice de velocidad ni calidad.",
    ],
    selection: [
      "\\mathbf{n}\\cdot\\mathbf{x}+d=0",
      "n is the clipping-plane normal, x a point and d its signed offset. Clipping controls visibility; it does not recover interior tissue.|n es la normal, x un punto y d el desplazamiento del plano. El corte controla visibilidad; no recupera tejido interno.",
    ],
    animation: [
      "\\mathbf{x}(u)=(1-u)\\mathbf{x}_0+u\\mathbf{x}_1,\\quad 0\\leq u\\leq1",
      "u is a display interpolation coordinate; x0 and x1 are authored endpoints. It is not elapsed biological time.|u es una coordenada de interpolación; x0 y x1 son extremos definidos. No representa tiempo biológico.",
    ],
    state: [
      "S_{restored}=\\operatorname{validate}(\\operatorname{decode}(S_{shared}))",
      "S is a view-state record. Decoding never replaces validation of identifiers and numeric ranges.|S es un registro de vista. Decodificar no sustituye validar identificadores y rangos numéricos.",
    ],
    deployment: [
      "\\forall a\\in A:\\quad h(a)=h_{manifest}(a)",
      "A is the released asset set; each actual hash h must match its recorded manifest hash.|A es el conjunto publicado; cada huella h debe coincidir con la registrada en el manifiesto.",
    ],
  };
  const item = eq[kind]!;
  return <Equation tex={item[0]} caption={item[1].split("|")[es ? 1 : 0]} />;
}

function Investigations({
  catalog,
  onExplore,
}: {
  catalog: Catalog;
  onExplore: (view: Record<string, unknown>) => void;
}) {
  const lang = useShellLang();
  const es = lang === "es";
  const loc = (x: Localized) => x[lang];
  return (
    <>
      <p className="fl-guide-note">
        {es
          ? "Cada investigación abre un estado concreto. Lee la pregunta, actúa y contrasta tu observación con la explicación; puedes volver a la exploración libre en cualquier momento."
          : "Each investigation opens a concrete state. Read the question, act, and compare your observation with the explanation; free exploration remains available throughout."}
      </p>
      <Tabs
        ariaLabel={es ? "Grupos de investigaciones" : "Investigation groups"}
        tabs={Array.from(
          { length: Math.ceil(catalog.journeys.length / 2) },
          (_, i) => ({
            id: `group-${i}`,
            label: `${i * 2 + 1}–${Math.min(i * 2 + 2, catalog.journeys.length)}`,
            content: (
              <SubTabs
                orientation="vertical"
                tabs={catalog.journeys.slice(i * 2, i * 2 + 2).map((j) => ({
                  id: j.id,
                  label: loc(j.title),
                  content: (
                    <section className="fl-guide-section">
                      <p className="fl-guide-eyebrow">
                        {es
                          ? "Pregunta de observación"
                          : "Observation question"}
                      </p>
                      <h2>{loc(j.question)}</h2>
                      <p>{loc(j.summary)}</p>
                      <ol className="fl-guide-steps">
                        {j.steps.map((s, k) => (
                          <li key={k}>
                            <h3>{loc(s.title)}</h3>
                            <p>{loc(s.body)}</p>
                            <button
                              className="fl-guide-action"
                              onClick={() => onExplore({ ...s.view })}
                            >
                              <ArrowUpRight size={16} />
                              {es ? "Abrir este paso" : "Open this step"}
                            </button>
                          </li>
                        ))}
                      </ol>
                      <Callout variant="honest">
                        {es
                          ? "Distingue lo que muestra un ejemplar de lo que explica un modelo. La vista propuesta es un punto de partida para observar, no una medición biológica."
                          : "Distinguish what a specimen shows from what a model explains. The proposed view is a starting point for observation, not a biological measurement."}
                      </Callout>
                      <Refs
                        ids={j.sourceIds}
                        label={es ? "Fuentes:" : "Sources:"}
                      />
                    </section>
                  ),
                }))}
              />
            ),
          }),
        )}
      />
    </>
  );
}

function Collection({
  catalog,
  onExplore,
}: {
  catalog: Catalog;
  onExplore: (view: Record<string, unknown>) => void;
}) {
  const lang = useShellLang();
  const es = lang === "es";
  const n = (x: number) => new Intl.NumberFormat(lang).format(x);
  const bytes = (x: number) =>
    `${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(x / 1024 / 1024)} MiB`;
  const totals = catalog.specimens.reduce(
    (a, s) => ({
      preview: a.preview + s.preview.bytes,
      detail: a.detail + s.detail.bytes,
      triangles: a.triangles + s.detail.triangles,
    }),
    { preview: 0, detail: 0, triangles: 0 },
  );
  return (
    <>
      <div className="fl-guide-facts">
        <span>
          <b>{n(catalog.specimens.length)}</b>
          {es ? "ejemplares digitalizados" : "digitized specimens"}
        </span>
        <span>
          <b>{n(catalog.journeys.length)}</b>
          {es ? "investigaciones guiadas" : "guided investigations"}
        </span>
        <span>
          <b>{bytes(totals.preview)}</b>
          {es ? "conjunto compacto" : "compact corpus"}
        </span>
        <span>
          <b>{bytes(totals.detail)}</b>
          {es ? "conjunto detallado" : "detailed corpus"}
        </span>
      </div>
      <Callout
        variant="honest"
        title={es ? "Qué significan estos números" : "What these numbers mean"}
      >
        {es
          ? "Valores leídos del catálogo publicado: tamaños de archivos y triángulos declarados por los recursos. No son tiempos de carga, mediciones de GPU, porcentajes de aprendizaje ni precisión biológica. Las variantes pertenecen al mismo ejemplar."
          : "Values read from the published catalog: file sizes and asset-declared triangle counts. These are not load times, GPU measurements, learning percentages or biological accuracy. Fidelity variants belong to the same specimen."}
      </Callout>
      <div className="fl-guide-table-wrap">
        <table className="fl-guide-table">
          <caption>
            {es
              ? "Colección de flores: metadatos de recursos publicados"
              : "Bloom collection: published asset metadata"}
          </caption>
          <thead>
            <tr>
              <th>{es ? "Ejemplar" : "Specimen"}</th>
              <th>{es ? "Compacto" : "Compact"}</th>
              <th>{es ? "Detallado" : "Detailed"}</th>
              <th>{es ? "Triángulos C / D" : "Triangles C / D"}</th>
              <th>{es ? "Origen" : "Origin"}</th>
            </tr>
          </thead>
          <tbody>
            {catalog.specimens.map((s) => (
              <tr key={s.id}>
                <th>
                  <button
                    className="fl-guide-link"
                    onClick={() =>
                      onExplore({ mode: "specimen", specimen: s.id })
                    }
                  >
                    <i>{s.scientificName}</i>
                  </button>
                  <small>{s.commonName[lang]}</small>
                </th>
                <td>{bytes(s.preview.bytes)}</td>
                <td>{bytes(s.detail.bytes)}</td>
                <td>
                  {n(s.preview.triangles)} / {n(s.detail.triangles)}
                </td>
                <td>
                  {s.credit}
                  <Refs ids={s.sourceIds} label="" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="fl-guide-section">
        <h2>
          {es ? "De la fuente a la evidencia" : "From source to evidence"}
        </h2>
        <p>
          {es
            ? "El proceso de adquisición fija archivos por URL y SHA-256. La inspección registra su estructura, variantes y conteos; la exportación produce el catálogo que lees aquí. Los hashes completos permiten comparar una copia con el recurso elegido. Una huella correcta no demuestra identificación taxonómica y un conteo alto no demuestra fidelidad interna."
            : "Acquisition locks files by URL and SHA-256. Inspection records their structure, variants and counts; export produces the catalog read here. Full hashes let a copy be compared with the selected asset. A matching digest does not establish taxonomic identification, and a high count does not establish internal fidelity."}
        </p>
        <details className="fl-guide-details">
          <summary>
            {es
              ? "Ver huellas completas de los recursos"
              : "Inspect complete asset hashes"}
          </summary>
          {catalog.specimens.map((s) => (
            <div key={s.id}>
              <h3>{s.scientificName}</h3>
              <p>
                <b>{es ? "Compacto" : "Compact"}</b>
                <code>{s.preview.sha256}</code>
              </p>
              <p>
                <b>{es ? "Detallado" : "Detailed"}</b>
                <code>{s.detail.sha256}</code>
              </p>
            </div>
          ))}
        </details>
        <Refs
          ids={["smithsonian-api", "smithsonian-openaccess"]}
          label={es ? "Fuentes:" : "Sources:"}
        />
      </section>
      <section className="fl-guide-section">
        <h2>
          {es
            ? "Comparar sin inventar una escala"
            : "Compare without inventing a scale"}
        </h2>
        <BotanicalFigure kind="specimens" es={es} />
        <p>
          {es
            ? "Usa el mismo encuadre y orientación para comparar variantes. El ajuste visual mantiene las flores legibles, pero no establece dimensiones iguales. Un estudio de rendimiento debe registrar dispositivo, navegador, tamaño de pantalla, caché, variante y protocolo. El catálogo por sí solo no justifica un resultado de velocidad."
            : "Use consistent framing and orientation to compare variants. View fitting keeps blooms legible but does not establish equal dimensions. A performance study must record device, browser, viewport, cache conditions, fidelity and protocol. The catalog alone does not justify a speed result."}
        </p>
        <Equation
          tex="r_B=B_{detail}/B_{compact}"
          caption={
            es
              ? "B representa bytes de archivos; r_B es una razón de tamaño, no de rendimiento."
              : "B denotes asset bytes; r_B is a size ratio, not a performance ratio."
          }
        />
        <Refs
          ids={["three-draco", "gltf-format"]}
          label={es ? "Fuentes:" : "Sources:"}
        />
      </section>
    </>
  );
}

export function GuidePage({
  page,
  catalog,
  onExplore,
}: {
  page: string;
  catalog: Catalog;
  onExplore: (view: Record<string, unknown>) => void;
}) {
  const es = useShellLang() === "es";
  const names: Record<string, Pair> = {
    introduction: ["Field guide", "Guía de campo"],
    methodology: ["Morphology", "Morfología"],
    implementation: ["How it works", "Cómo funciona"],
    experiments: ["Investigations", "Investigaciones"],
    benchmark: ["Collection & evidence", "Colección y evidencia"],
  };
  const leads: Record<string, Pair> = {
    introduction: [
      "Look closely, ask a precise question, and move between an observed bloom and an explicit explanation of its organization. This guide connects the vocabulary, tools and evidence boundaries you need to explore flowers without confusing a teaching model with a measured specimen.",
      "Observa de cerca, plantea una pregunta precisa y pasa de una flor observada a una explicación explícita de su organización. Esta guía conecta el vocabulario, las herramientas y los límites de evidencia para explorar flores sin confundir un modelo didáctico con un ejemplar medido.",
    ],
    methodology: [
      "Six connected perspectives explain how to read a flower: its layers, symmetry, orchid-specific organization, reproductive pathway, changing structural identities and observed surfaces. The diagrams support spatial reasoning; source-linked text states where those explanations apply and where the illustrations stop.",
      "Seis perspectivas conectadas explican cómo leer una flor: capas, simetría, organización de orquídeas, vía reproductiva, identidades estructurales y superficies observadas. Los diagramas apoyan el razonamiento espacial; los textos con fuentes indican dónde se aplica cada explicación y dónde termina la ilustración.",
    ],
    implementation: [
      "An inspectable atlas needs more than attractive geometry. Its source records, asset checks, named components and view state must agree. Follow the actual responsibilities that connect a museum file or authored explanation to the object you manipulate in the browser.",
      "Un atlas que se pueda inspeccionar necesita más que geometría atractiva. Deben coincidir registros, comprobaciones, componentes y estado de vista. Sigue las responsabilidades que conectan un archivo de museo o una explicación construida con el objeto que manipulas en el navegador.",
    ],
    experiments: [
      "Each investigation starts with an observable question and opens the relevant object, component or sequence state. Follow its steps, compare your observation with the interpretation, and keep the source boundary in view. These are guided learning activities, not reported biological experiments.",
      "Cada investigación parte de una pregunta observable y abre el objeto, componente o estado pertinente. Sigue los pasos, compara tu observación con la interpretación y conserva el límite de la fuente. Son actividades guiadas de aprendizaje, no experimentos biológicos reportados.",
    ],
    benchmark: [
      "Inspect the collection behind the experience: original credits, fidelity variants, actual file sizes and integrity hashes. These records make digital evidence traceable. They describe the published assets and their constraints; they do not turn rendering statistics into claims about biology or learning.",
      "Inspecciona la colección: créditos originales, variantes, tamaños reales y huellas de integridad. Estos registros hacen trazable la evidencia digital. Describen los recursos publicados y sus restricciones; no convierten estadísticas de representación en afirmaciones sobre biología o aprendizaje.",
    ],
  };
  const key = page.replace(/^\//, "") || "introduction";
  const name = names[key] ?? names.introduction!;
  const lead = leads[key] ?? leads.introduction!;
  return (
    <CitationsProvider items={[...catalog.sources, ...TECH]}>
      <div className="page-body prose fl-guides">
        <div className="page-head">
          <p className="fl-guide-eyebrow">
            <Microscope size={14} />
            {es
              ? "FLORARIA · observar y comprender"
              : "FLORARIA · observe and understand"}
          </p>
          <h1>{name[es ? 1 : 0]}</h1>
          <p className="lede">{lead[es ? 1 : 0]}</p>
        </div>
        {key === "methodology" ? (
          <SubTabs
            orientation="vertical"
            ariaLabel={es ? "Conceptos de morfología" : "Morphology concepts"}
            tabs={FAMILIES.map((f) => ({
              id: f.id,
              label: f.title[es ? 1 : 0],
              content: <FamilyPanel item={f} onExplore={onExplore} />,
            }))}
          />
        ) : key === "implementation" ? (
          <Implementation />
        ) : key === "experiments" ? (
          <Investigations catalog={catalog} onExplore={onExplore} />
        ) : key === "benchmark" ? (
          <Collection catalog={catalog} onExplore={onExplore} />
        ) : (
          <Introduction catalog={catalog} onExplore={onExplore} />
        )}
      </div>
    </CitationsProvider>
  );
}
