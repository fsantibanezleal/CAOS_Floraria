import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadCatalog,
  MAX_ASSET_BYTES,
  MAX_CATALOG_BYTES,
  resolveAssetUrl,
  validateCatalog,
} from "../lib/catalog";
import type { Catalog } from "../lib/catalog.types";

const realCatalog = JSON.parse(
  readFileSync(
    new URL("../../../data/artifacts/catalog.json", import.meta.url),
    "utf8",
  ),
) as Catalog;
const fresh = (): Catalog => structuredClone(realCatalog);

afterEach(() => vi.unstubAllGlobals());

describe("complete botanical catalog validation", () => {
  it("accepts the actual bilingual artifact and every actual guided view", () => {
    const catalog = validateCatalog(fresh());
    expect(catalog.specimens).toHaveLength(5);
    expect(catalog.structures).toHaveLength(15);
    expect(catalog.journeys).toHaveLength(12);
    expect(
      catalog.journeys.reduce(
        (count, journey) => count + journey.steps.length,
        0,
      ),
    ).toBe(43);
  });

  const broken: [string, (catalog: Catalog) => void][] = [
    [
      "duplicate sources",
      (c) => {
        c.sources[1].id = c.sources[0].id;
      },
    ],
    [
      "missing source citation",
      (c) => {
        c.sources[0].citation = " ";
      },
    ],
    [
      "executable source URL",
      (c) => {
        c.sources[0].url = "javascript:alert(1)";
      },
    ],
    [
      "relative source URL",
      (c) => {
        c.sources[0].url = "//example.com/source";
      },
    ],
    [
      "source credentials",
      (c) => {
        c.sources[0].url = "https://secret@example.com/source";
      },
    ],
    [
      "too many sources",
      (c) => {
        c.sources = Array(101).fill(c.sources[0]);
      },
    ],
    [
      "duplicate specimens",
      (c) => {
        c.specimens[1].id = c.specimens[0].id;
      },
    ],
    [
      "unknown specimens",
      (c) => {
        c.specimens[0].id = "unverified";
      },
    ],
    [
      "missing specimens",
      (c) => {
        c.specimens.pop();
      },
    ],
    [
      "missing specimen translation",
      (c) => {
        c.specimens[0].description.es = "";
      },
    ],
    [
      "missing fact translation",
      (c) => {
        c.specimens[0].facts[0].value.es = " ";
      },
    ],
    [
      "missing scientific name",
      (c) => {
        c.specimens[0].scientificName = "";
      },
    ],
    [
      "missing credit",
      (c) => {
        c.specimens[0].credit = "";
      },
    ],
    [
      "unknown specimen source",
      (c) => {
        c.specimens[0].sourceIds = ["imaginary"];
      },
    ],
    [
      "duplicate specimen source",
      (c) => {
        c.specimens[0].sourceIds.push(c.specimens[0].sourceIds[0]);
      },
    ],
    [
      "oversized description",
      (c) => {
        c.specimens[0].description.en = "a".repeat(4001);
      },
    ],
    [
      "traversing asset path",
      (c) => {
        c.specimens[0].preview.path = "assets/../outside.glb";
      },
    ],
    [
      "encoded asset path",
      (c) => {
        c.specimens[0].preview.path = "assets/%2e%2e/outside.glb";
      },
    ],
    [
      "absolute asset path",
      (c) => {
        c.specimens[0].preview.path = "https://example.com/model.glb";
      },
    ],
    [
      "platform asset path",
      (c) => {
        c.specimens[0].preview.path = "assets\\phalaenopsis-preview.glb";
      },
    ],
    [
      "asset for another specimen",
      (c) => {
        c.specimens[0].preview.path = c.specimens[1].preview.path;
      },
    ],
    [
      "invalid asset checksum",
      (c) => {
        c.specimens[0].detail.sha256 = "not-a-checksum";
      },
    ],
    [
      "nonfinite bytes",
      (c) => {
        c.specimens[0].detail.bytes = Infinity;
      },
    ],
    [
      "fractional bytes",
      (c) => {
        c.specimens[0].detail.bytes = 1.5;
      },
    ],
    [
      "oversized asset",
      (c) => {
        c.specimens[0].detail.bytes = MAX_ASSET_BYTES + 1;
      },
    ],
    [
      "empty asset",
      (c) => {
        c.specimens[0].detail.bytes = 0;
      },
    ],
    [
      "nonfinite topology",
      (c) => {
        c.specimens[0].detail.triangles = NaN;
      },
    ],
    [
      "wrong preview topology",
      (c) => {
        c.specimens[0].preview.triangles = 150000;
      },
    ],
    [
      "duplicate structures",
      (c) => {
        c.structures[1].id = c.structures[0].id;
      },
    ],
    [
      "unknown structures",
      (c) => {
        c.structures[0].id = "bone";
      },
    ],
    [
      "missing structure language",
      (c) => {
        c.structures[0].detail.es = "";
      },
    ],
    [
      "unknown structure source",
      (c) => {
        c.structures[0].sourceIds = ["invented"];
      },
    ],
    [
      "wrong structure model",
      (c) => {
        c.structures.find((p) => p.id === "seed")!.models = ["orchid"];
      },
    ],
    [
      "duplicate structure models",
      (c) => {
        c.structures[0].models = ["general", "general"];
      },
    ],
    [
      "unknown group",
      (c) => {
        c.structures[0].group = "medical";
      },
    ],
    [
      "duplicate journeys",
      (c) => {
        c.journeys[1].id = c.journeys[0].id;
      },
    ],
    [
      "missing journey source",
      (c) => {
        c.journeys[0].sourceIds = [];
      },
    ],
    [
      "missing journey language",
      (c) => {
        c.journeys[0].question.es = "";
      },
    ],
    [
      "too few steps",
      (c) => {
        c.journeys[0].steps = c.journeys[0].steps.slice(0, 2);
      },
    ],
    [
      "too many steps",
      (c) => {
        c.journeys[0].steps = Array(6).fill(c.journeys[0].steps[0]);
      },
    ],
    [
      "missing step language",
      (c) => {
        c.journeys[0].steps[0].body.es = "";
      },
    ],
    [
      "unknown view mode",
      (c) => {
        c.journeys[0].steps[0].view.mode = "invalid" as never;
      },
    ],
    [
      "unknown view model",
      (c) => {
        c.journeys[0].steps[0].view.model = "invalid" as never;
      },
    ],
    [
      "unknown selection",
      (c) => {
        c.journeys[0].steps[0].view.selected = "bone";
      },
    ],
    [
      "selection in the wrong model",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "anatomy",
          model: "orchid",
          selected: "seed",
        };
      },
    ],
    [
      "unknown view specimen",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "specimen",
          specimen: "unverified",
        };
      },
    ],
    [
      "unknown comparison",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "specimen",
          specimen: "vanda",
          compare: "unverified",
        };
      },
    ],
    [
      "duplicate comparison",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "specimen",
          specimen: "vanda",
          compare: "vanda",
        };
      },
    ],
    [
      "missing view specimen",
      (c) => {
        c.journeys[0].steps[0].view = { mode: "specimen" };
      },
    ],
    [
      "comparison in anatomy",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "anatomy",
          specimen: "vanda",
          compare: "lycaste",
        };
      },
    ],
    [
      "orchid lifecycle",
      (c) => {
        c.journeys[0].steps[0].view = {
          mode: "lifecycle",
          model: "orchid",
          stage: 0.5,
        };
      },
    ],
    [
      "missing lifecycle stage",
      (c) => {
        c.journeys[0].steps[0].view = { mode: "lifecycle", model: "general" };
      },
    ],
    [
      "stage outside lifecycle",
      (c) => {
        c.journeys[0].steps[0].view.stage = 0.5;
      },
    ],
    [
      "invalid sequence stage",
      (c) => {
        c.journeys[0].steps[0].view = { mode: "lifecycle", stage: Infinity };
      },
    ],
    [
      "out-of-range explosion",
      (c) => {
        c.journeys[0].steps[0].view.explode = 1.1;
      },
    ],
    [
      "out-of-range section",
      (c) => {
        c.journeys[0].steps[0].view.cut = -1.1;
      },
    ],
    [
      "non-boolean section toggle",
      (c) => {
        c.journeys[0].steps[0].view.cutEnabled = "yes" as never;
      },
    ],
    [
      "missing enabled section plane",
      (c) => {
        c.journeys[0].steps[0].view.cutEnabled = true;
      },
    ],
  ];
  it.each(broken)("rejects %s", (_label, mutate) => {
    const catalog = fresh();
    mutate(catalog);
    expect(() => validateCatalog(catalog)).toThrow(/Invalid botanical catalog/);
  });

  it.each([
    null,
    [],
    {},
    { schemaVersion: 2 },
    { schemaVersion: 1, sources: null },
  ])("rejects invalid root %j", (value) => {
    expect(() => validateCatalog(value)).toThrow();
  });

  it("allows documented HTTP(S) source links while keeping asset paths local", () => {
    const catalog = fresh();
    catalog.sources[0].url = "http://example.com/legacy-source";
    expect(validateCatalog(catalog)).toBe(catalog);
    expect(
      resolveAssetUrl(catalog.specimens[0].preview, "/floraria/data/"),
    ).toBe("/floraria/data/assets/phalaenopsis-preview.glb");
    expect(() =>
      resolveAssetUrl({
        ...catalog.specimens[0].preview,
        path: "../model.glb",
      }),
    ).toThrow();
  });
});

describe("bounded catalog transport", () => {
  it("loads and validates a streamed UTF-8 catalog across a multibyte boundary", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(realCatalog));
    const boundary = bytes.findIndex((byte) => byte > 127) + 1;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, boundary));
        controller.enqueue(bytes.slice(boundary));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    expect(
      (await loadCatalog("/data", controller.signal)).specimens,
    ).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledWith("/data/catalog.json", {
      signal: controller.signal,
    });
  });

  it("rejects a declared excessive response before reading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: { "content-length": String(MAX_CATALOG_BYTES + 1) },
        }),
      ),
    );
    await expect(loadCatalog()).rejects.toThrow(/byte limit/);
  });

  it("stops an oversized decoded stream even when its header claims fewer bytes", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CATALOG_BYTES + 1));
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(stream, { headers: { "content-length": "2" } }),
        ),
    );
    await expect(loadCatalog()).rejects.toThrow(/byte limit/);
    expect(cancelled).toBe(true);
  });

  it("rejects malformed JSON, invalid UTF-8 and failed HTTP responses", async () => {
    for (const response of [
      new Response("{"),
      new Response(new Uint8Array([0xff, 0xfe])),
      new Response("unavailable", { status: 503 }),
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(loadCatalog()).rejects.toThrow();
    }
  });

  it("rejects an empty response and a structurally invalid successful response", async () => {
    for (const response of [
      new Response(null),
      new Response(JSON.stringify({ schemaVersion: 1, sources: [] })),
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(loadCatalog()).rejects.toThrow();
    }
  });
});
