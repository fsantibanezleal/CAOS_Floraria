import type { ArchitectureConfig } from "@fasl-work/caos-app-shell";

export const architecture: ArchitectureConfig = {
  title_en: "Inside FLORARIA",
  title_es: "Dentro de FLORARIA",
  tabs: [
    {
      id: "atlas",
      en: "The atlas",
      es: "El atlas",
      svg: "svg/tech/01-the-atlas.svg",
      body_en:
        "FLORARIA connects a small museum collection with independently authored teaching geometry. A digitized bloom supplies an observed surface; the general flower and orchid models supply explicit component relationships. A selected investigation opens the same explorer state used by free exploration. Changing from specimen to anatomy changes the kind of evidence, not the depth of a scan.\n\nThe build begins with verified botanical sources and a finite product contract. Source acquisition, asset inspection, component definitions and bilingual explanations are prepared together. The viewer, content and state share stable identifiers. Release checks cover geometry, source integrity, interaction behavior and the published bundle; they do not measure educational impact or validate biological predictions.",
      body_es:
        "FLORARIA conecta una pequeña colección de museo con geometría didáctica propia. Una flor digitalizada aporta una superficie observada; los modelos de flor general y orquídea aportan relaciones explícitas entre partes. Una investigación abre el mismo estado que utiliza la exploración libre. Pasar del ejemplar a la anatomía cambia el tipo de evidencia, no la profundidad de un escaneo.\n\nLa construcción parte de fuentes botánicas verificadas y un alcance delimitado. La adquisición, inspección de recursos, definición de componentes y explicaciones bilingües se preparan juntas. La vista, el contenido y el estado comparten identificadores estables. Las comprobaciones cubren geometría, integridad, interacciones y publicación; no miden el impacto educativo ni validan predicciones biológicas.",
    },
    {
      id: "lanes",
      en: "Where it runs",
      es: "Dónde se ejecuta",
      svg: "svg/tech/02-lanes.svg",
      body_en:
        "The offline process acquires locked museum files, checks their bytes and rights records, inspects their actual GLB structure and exports the catalog and manifest. Tests use separate output locations. The web build copies validated artifacts; a static HTTPS server delivers the resulting bundle. There is no visitor account, database, request-time model or runtime secret.\n\nIn the browser, a shared Draco decoder reads compressed geometry and the viewer loads the chosen fidelity. Camera and component controls manipulate presentation. A bounded educational sequence begins paused and advances only through user action. Saved views remain local or travel in an explicitly shared state record. An unavailable graphics context must still leave the written collection and investigations useful.",
      body_es:
        "El proceso previo adquiere archivos fijados, comprueba sus bytes y derechos, inspecciona la estructura GLB real y exporta catálogo y manifiesto. Las pruebas usan salidas separadas. La construcción web copia recursos validados y un servidor HTTPS estático entrega el paquete. No hay cuentas de visitantes, base de datos, modelo por solicitud ni secretos en ejecución.\n\nEn el navegador, un decodificador Draco compartido lee la geometría comprimida y la vista carga la fidelidad elegida. Cámara y controles manipulan la presentación. Una secuencia didáctica delimitada comienza pausada y avanza por acción del usuario. Las vistas guardadas permanecen localmente o viajan en un registro compartido. Si falla el contexto gráfico, la colección escrita y las investigaciones siguen siendo útiles.",
    },
    {
      id: "web",
      en: "Connected views",
      es: "Vistas conectadas",
      svg: "svg/tech/03-web-flow.svg",
      body_en:
        "The explorer controls, an investigation step and an imported view all express the same bounded state: object, mode, model, selected component and supported control values. Validation checks identifiers and ranges before applying the state. A mesh selection resolves to the matching component record, while its explanation and sources remain connected.\n\nThe six public pages provide exploration, a field guide, morphology, implementation, investigations and collection evidence. Expanded viewing hides product rails while keeping the shared frame and the same selection; returning restores context. Sharing, JSON import and bookmarks must preserve meaningful values rather than reset the viewer. Theme and language change the complete interface, including explanatory diagrams.",
      body_es:
        "Los controles, un paso de investigación y una vista importada expresan el mismo estado delimitado: objeto, modo, modelo, parte seleccionada y valores admitidos. La validación comprueba identificadores y rangos antes de aplicarlo. Seleccionar una malla lleva al registro de su componente y mantiene conectadas explicación y fuentes.\n\nLas seis páginas ofrecen exploración, guía de campo, morfología, implementación, investigaciones y evidencia. La vista ampliada oculta paneles del producto conservando el marco compartido y la selección; volver recupera el contexto. Compartir, importar JSON y usar marcadores debe conservar los valores relevantes. Tema e idioma cambian la interfaz completa, incluidos los diagramas explicativos.",
    },
    {
      id: "botany",
      en: "The explanation",
      es: "La explicación",
      svg: "svg/tech/04-botanical-model.svg",
      body_en:
        "The authored general flower explains an outer-to-inner organization and the relationships within reproductive organs. The orchid has a different recipe: its lip is a differentiated petal, its column brings reproductive structures together, and its ovary is inferior. Named components constrain what can be selected, separated and discussed. The museum scans do not contain that organ hierarchy.\n\nExplosion, clipping and transparency are reversible view operations. The reproductive sequence explains a route from pollen transfer toward subsequent fertilization and the identities of seeds and fruit. Its progress is an illustrative coordinate, not a clock or probability. The source-linked text states generalizations and exceptions; a geometric animation cannot replace that botanical evidence.",
      body_es:
        "La flor general construida explica la organización de fuera hacia dentro y las relaciones de los órganos reproductivos. La orquídea tiene otra organización: el labelo es un pétalo diferenciado, la columna reúne estructuras reproductivas y el ovario es ínfero. Los componentes nombrados delimitan qué se puede seleccionar, separar y explicar. Los escaneos del museo no contienen esa jerarquía.\n\nLa separación, el corte y la transparencia son operaciones visuales reversibles. La secuencia reproductiva explica una vía desde la transferencia de polen hacia la fecundación posterior y las identidades de semillas y fruto. Su progreso es una coordenada ilustrativa, no un reloj ni una probabilidad. El texto indica generalizaciones y excepciones; una animación geométrica no sustituye la evidencia botánica.",
    },
    {
      id: "contracts",
      en: "Evidence & contracts",
      es: "Evidencia y contratos",
      svg: "svg/tech/05-contracts.svg",
      body_en:
        "The source contract records acquisition locations, exact asset hashes, item rights, bilingual content and valid references. Inspection checks actual geometry and variants. Export produces a compact catalog and checksum manifest; the TypeScript contract and runtime validator guard what the browser consumes. An invalid file or unresolved identifier is a failure to explain, not an invitation to invent a replacement.\n\nThe collection table reads file sizes and triangle counts from the published catalog. These are artifact facts. Integrity hashes check bytes, metadata describes the selected specimen, and botanical references support a claim. Keeping those responsibilities separate prevents a detailed surface or a successful software test from being mistaken for biological proof. The documentation records how to reproduce and extend the collection.",
      body_es:
        "El contrato de origen registra ubicaciones, huellas exactas, derechos, contenido bilingüe y referencias válidas. La inspección comprueba geometría y variantes reales. La exportación produce catálogo y manifiesto; el contrato TypeScript y el validador protegen lo que consume el navegador. Un archivo inválido o un identificador inexistente es un error que explicar, no una invitación a inventar un reemplazo.\n\nLa tabla lee tamaños y triángulos del catálogo publicado. Son datos de recursos digitales. Las huellas comprueban bytes, los metadatos describen el ejemplar seleccionado y las referencias respaldan afirmaciones botánicas. Separar estas funciones evita confundir una superficie detallada o una prueba de software exitosa con evidencia biológica. La documentación explica cómo reproducir y ampliar la colección.",
    },
  ],
};
