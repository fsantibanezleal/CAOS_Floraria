import type {
  Catalog,
  CatalogAsset,
  Locale,
  Localized,
  TeachingModel,
} from "./catalog.types";

export * from "./catalog.types";

export const MAX_CATALOG_BYTES = 1_048_576;
export const MAX_ASSET_BYTES = 5_000_000;
const SPECIMEN_IDS = new Set([
  "phalaenopsis",
  "encyclia",
  "lycaste",
  "phragmipedium",
  "vanda",
]);
export const STRUCTURE_MODELS: Readonly<
  Record<string, readonly TeachingModel[]>
> = {
  sepal: ["general", "orchid"],
  petal: ["general", "orchid"],
  anther: ["general"],
  filament: ["general"],
  stigma: ["general"],
  style: ["general"],
  ovary: ["general", "orchid"],
  ovule: ["general", "orchid"],
  pollen: ["general"],
  stem: ["general", "orchid"],
  receptacle: ["general", "orchid"],
  lip: ["orchid"],
  column: ["orchid"],
  pollinia: ["orchid"],
  seed: ["general"],
};
type RecordValue = Record<string, unknown>;

function check(condition: unknown, context: string): asserts condition {
  if (!condition) throw new Error(`Invalid botanical catalog: ${context}.`);
}

function object(value: unknown, context: string): RecordValue {
  check(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${context} must be an object`,
  );
  return value as RecordValue;
}

function text(value: unknown, context: string, maximum = 4_000): string {
  check(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= maximum,
    `${context} must be nonempty text of at most ${maximum} characters`,
  );
  return value;
}

function id(value: unknown, context: string): string {
  const result = text(value, context, 80);
  check(
    /^[a-z][a-z0-9-]*$/.test(result),
    `${context} has an invalid identifier`,
  );
  return result;
}

function list(
  value: unknown,
  context: string,
  minimum: number,
  maximum: number,
): unknown[] {
  check(
    Array.isArray(value) && value.length >= minimum && value.length <= maximum,
    `${context} must contain ${minimum}–${maximum} entries`,
  );
  return value;
}

function bilingual(value: unknown, context: string, maximum = 4_000): void {
  const item = object(value, context);
  text(item.en, `${context}.en`, maximum);
  text(item.es, `${context}.es`, maximum);
}

function bounded(
  value: unknown,
  context: string,
  minimum: number,
  maximum: number,
  integer = false,
): number {
  check(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum &&
      (!integer || Number.isSafeInteger(value)),
    `${context} is outside its numeric bounds`,
  );
  return value;
}

function references(value: unknown, context: string, known: Set<string>): void {
  const entries = list(value, context, 1, 20);
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = id(entry, context);
    check(
      known.has(key) && !seen.has(key),
      `${context} references an unknown or duplicate source`,
    );
    seen.add(key);
  }
}

function asset(
  value: unknown,
  specimen: string,
  variant: "preview" | "detail",
  seenPaths: Set<string>,
): void {
  const entry = object(value, `${specimen}.${variant}`);
  const path = text(entry.path, "asset path", 180);
  // Exact local filenames exclude absolute URLs, encoded traversal, query strings and platform separators.
  check(
    path === `assets/${specimen}-${variant}.glb` && !seenPaths.has(path),
    "asset path is unsafe or duplicated",
  );
  seenPaths.add(path);
  check(
    typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/.test(entry.sha256),
    "asset SHA256 is invalid",
  );
  bounded(entry.bytes, "asset bytes", 1, MAX_ASSET_BYTES, true);
  bounded(entry.triangles, "asset triangles", 1, 150_000, true);
  check(
    entry.triangles === (variant === "preview" ? 20_000 : 150_000),
    "asset topology differs from the approved variant",
  );
}

/** Validate the full static content contract before any URL, selector or teaching state reaches the UI. */
export function validateCatalog(value: unknown): Catalog {
  const catalog = object(value, "root");
  check(catalog.schemaVersion === 1, "unsupported schema version");
  const sources = list(catalog.sources, "sources", 1, 100);
  const sourceIds = new Set<string>();
  for (const value of sources) {
    const source = object(value, "source");
    const key = id(source.id, "source.id");
    check(!sourceIds.has(key), "duplicate source ID");
    sourceIds.add(key);
    text(source.label, `${key}.label`, 300);
    text(source.citation, `${key}.citation`, 2_000);
    const address = text(source.url, `${key}.url`, 2_048);
    let url: URL;
    try {
      url = new URL(address);
    } catch {
      throw new Error(`Invalid botanical catalog: ${key} source URL.`);
    }
    check(
      (url.protocol === "https:" || url.protocol === "http:") &&
        !url.username &&
        !url.password,
      `${key} source URL must use HTTP(S) without credentials`,
    );
  }

  const specimens = list(catalog.specimens, "specimens", 5, 5);
  const specimenIds = new Set<string>();
  const paths = new Set<string>();
  for (const value of specimens) {
    const specimen = object(value, "specimen");
    const key = id(specimen.id, "specimen.id");
    check(
      SPECIMEN_IDS.has(key) && !specimenIds.has(key),
      "unknown or duplicate specimen ID",
    );
    specimenIds.add(key);
    text(specimen.scientificName, `${key}.scientificName`, 300);
    text(specimen.credit, `${key}.credit`, 2_000);
    bilingual(specimen.commonName, `${key}.commonName`, 300);
    bilingual(specimen.description, `${key}.description`);
    references(specimen.sourceIds, `${key}.sourceIds`, sourceIds);
    for (const value of list(specimen.facts, `${key}.facts`, 3, 12)) {
      const fact = object(value, "fact");
      bilingual(fact.label, `${key}.fact.label`, 300);
      bilingual(fact.value, `${key}.fact.value`, 1_500);
    }
    asset(specimen.preview, key, "preview", paths);
    asset(specimen.detail, key, "detail", paths);
  }

  const structures = list(catalog.structures, "structures", 15, 15);
  const structureModels = new Map<string, Set<string>>();
  for (const value of structures) {
    const structure = object(value, "structure");
    const key = id(structure.id, "structure.id");
    check(
      Object.hasOwn(STRUCTURE_MODELS, key) && !structureModels.has(key),
      "unknown or duplicate structure ID",
    );
    const allowed = STRUCTURE_MODELS[key];
    const models = list(structure.models, `${key}.models`, 1, 2);
    const modelSet = new Set(
      models.map((value) => text(value, `${key}.model`, 20)),
    );
    check(
      modelSet.size === models.length &&
        modelSet.size === allowed.length &&
        allowed.every((model) => modelSet.has(model)),
      `${key} has an incompatible botanical model`,
    );
    structureModels.set(key, modelSet);
    check(
      ["outer", "male", "female", "support", "orchid", "lifecycle"].includes(
        text(structure.group, `${key}.group`, 40),
      ),
      `${key} has an unknown group`,
    );
    bilingual(structure.label, `${key}.label`, 300);
    bilingual(structure.summary, `${key}.summary`, 1_500);
    bilingual(structure.detail, `${key}.detail`);
    references(structure.sourceIds, `${key}.sourceIds`, sourceIds);
  }

  const journeyIds = new Set<string>();
  for (const value of list(catalog.journeys, "journeys", 12, 12)) {
    const journey = object(value, "journey");
    const key = id(journey.id, "journey.id");
    check(!journeyIds.has(key), "duplicate journey ID");
    journeyIds.add(key);
    bilingual(journey.title, `${key}.title`, 300);
    bilingual(journey.question, `${key}.question`, 1_500);
    bilingual(journey.summary, `${key}.summary`, 2_000);
    references(journey.sourceIds, `${key}.sourceIds`, sourceIds);
    for (const [index, value] of list(
      journey.steps,
      `${key}.steps`,
      3,
      5,
    ).entries()) {
      const context = `${key}.steps[${index}]`;
      const step = object(value, context);
      bilingual(step.title, `${context}.title`, 300);
      bilingual(step.body, `${context}.body`);
      const view = object(step.view, `${context}.view`);
      check(
        ["specimen", "anatomy", "lifecycle"].includes(
          text(view.mode, `${context}.mode`, 20),
        ),
        "unknown journey mode",
      );
      const model =
        view.model === undefined
          ? "general"
          : text(view.model, `${context}.model`, 20);
      check(model === "general" || model === "orchid", "unknown journey model");
      if (view.mode === "specimen") {
        check(
          specimenIds.has(text(view.specimen, `${context}.specimen`, 80)),
          "unknown journey specimen",
        );
      } else {
        check(
          view.specimen === undefined && view.compare === undefined,
          "specimen comparison belongs only to specimen mode",
        );
      }
      if (view.compare !== undefined) {
        check(
          specimenIds.has(text(view.compare, `${context}.compare`, 80)) &&
            view.compare !== view.specimen,
          "comparison requires two distinct known specimens",
        );
      }
      if (view.selected !== undefined) {
        const selected = text(view.selected, `${context}.selected`, 80);
        check(
          view.mode !== "specimen" && structureModels.get(selected)?.has(model),
          "selected structure does not belong to this model",
        );
      }
      if (view.mode === "lifecycle") {
        check(model === "general", "orchid lifecycle is not represented");
        bounded(view.stage, `${context}.stage`, 0, 1);
      } else {
        check(
          view.stage === undefined,
          "stage is only meaningful in lifecycle mode",
        );
      }
      if (view.explode !== undefined)
        bounded(view.explode, `${context}.explode`, 0, 1);
      if (view.cut !== undefined) bounded(view.cut, `${context}.cut`, -1, 1);
      if (view.cutEnabled !== undefined)
        check(
          typeof view.cutEnabled === "boolean",
          "cutEnabled must be boolean",
        );
      if (view.cutEnabled === true) bounded(view.cut, `${context}.cut`, -1, 1);
    }
  }
  return value as Catalog;
}

export function catalogBaseUrl(): string {
  return `${import.meta.env.BASE_URL}data/`;
}

export function localize(value: Localized, locale: Locale): string {
  return value[locale];
}

export function resolveAssetUrl(
  asset: CatalogAsset,
  baseUrl = catalogBaseUrl(),
): string {
  check(
    /^assets\/[a-z]+-(preview|detail)\.glb$/.test(asset.path),
    "unsafe asset path",
  );
  return `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${asset.path}`;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    check(
      /^\d+$/.test(declared) && Number(declared) <= MAX_CATALOG_BYTES,
      "catalog response exceeds the byte limit",
    );
  }
  check(response.body, "catalog response is empty");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CATALOG_BYTES) {
        await reader.cancel();
        throw new Error(
          "Invalid botanical catalog: catalog response exceeds the byte limit.",
        );
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } finally {
    reader.releaseLock();
  }
  check(bytes > 0, "catalog response is empty");
  return JSON.parse(chunks.join("")) as unknown;
}

export async function loadCatalog(
  baseUrl = catalogBaseUrl(),
  signal?: AbortSignal,
): Promise<Catalog> {
  const response = await fetch(
    `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}catalog.json`,
    { signal },
  );
  if (!response.ok)
    throw new Error(`Catalog request failed (${response.status}).`);
  return validateCatalog(await readBoundedJson(response));
}
