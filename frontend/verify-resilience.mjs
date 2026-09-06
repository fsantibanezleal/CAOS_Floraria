/** Targeted real-browser failure and camera checks; does not repeat verify-atlas.mjs.
 * FLORARIA_QA_URL selects dev/preview/production; FLORARIA_QA_DIR selects evidence output.
 * Chromium must already be installed; honor the operator's PLAYWRIGHT_BROWSERS_PATH.
 */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.env.FLORARIA_QA_URL || "http://127.0.0.1:5902").replace(
  /\/$/,
  "",
);
const output = resolve(
  process.env.FLORARIA_QA_DIR ||
    fileURLToPath(new URL("../build/qa/resilience", import.meta.url)),
);
mkdirSync(output, { recursive: true });
const catalog = JSON.parse(
  readFileSync(
    new URL("../data/artifacts/catalog.json", import.meta.url),
    "utf8",
  ),
);
const report = {
  base,
  startedAt: new Date().toISOString(),
  checks: [],
  limitations: [],
  scenarios: [],
  pass: false,
};
// Fault injection gets a fresh Chromium process: a deliberately lost GPU context can
// disturb later contexts in the same headless software-rendering process.
const contexts = [],
  browsers = [];
let activePage = null;
const pass = (name, detail) => {
  report.checks.push({ name, pass: true, ...(detail ? { detail } : {}) });
  console.log("PASS " + name);
};
const viewUrl = (view) =>
  base + "/?" + new URLSearchParams({ view: JSON.stringify(view) });
const nextFrames = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
const ready = async (page) => {
  await page
    .locator(".fl-loading")
    .waitFor({ state: "hidden", timeout: 60000 });
  await page
    .locator(".fl-viewer[data-rendered=true]")
    .waitFor({ timeout: 60000 });
  await nextFrames(page);
  assert.equal(
    await page.locator(".fl-viewer-error").count(),
    0,
    "Ready view must not retain a failure overlay",
  );
};
const photo = (page, name) =>
  page.screenshot({ path: resolve(output, name + ".png") });
const setup = async (name, init) => {
  console.log("CHECK " + name);
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  browsers.push(browser);
  report.browser = browser.version();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  contexts.push(context);
  context.setDefaultTimeout(15000);
  await context.addInitScript(() => {
    localStorage.setItem("caos.lang", "en");
    localStorage.setItem("caos.theme", "light");
    // Observe real browser workers, including termination; no viewer runtime access is needed.
    const NativeWorker = window.Worker;
    window.__florariaWorkers = {
      created: 0,
      terminated: 0,
      active: 0,
      records: [],
    };
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        const state = window.__florariaWorkers;
        this.__qaRecord = {
          id: ++state.created,
          url: String(args[0]),
          terminated: false,
        };
        state.active++;
        state.records.push(this.__qaRecord);
      }
      terminate() {
        const state = window.__florariaWorkers;
        if (!this.__qaRecord.terminated) {
          this.__qaRecord.terminated = true;
          state.terminated++;
          state.active--;
        }
        return super.terminate();
      }
    };
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  activePage = page;
  const scenario = {
    name,
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    downloads: [],
  };
  report.scenarios.push(scenario);
  page.on("pageerror", (error) => scenario.pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    scenario.failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      scenario.httpErrors.push({
        url: response.url(),
        status: response.status(),
      });
  });
  page.on("download", (download) =>
    scenario.downloads.push(download.suggestedFilename()),
  );
  return { context, page, scenario };
};
const rejectedExport = async (page, scenario, reason) => {
  await page.getByRole("tab", { name: "Notebook", exact: true }).click();
  const button = page.getByRole("button", {
    name: "Save view as PNG",
    exact: true,
  });
  const before = scenario.downloads.length;
  if (await button.isDisabled()) {
    assert(
      await page.locator(".fl-viewer-error,.fl-loading").first().isVisible(),
      "Disabled export must have a visible availability explanation",
    );
  } else {
    await button.click();
    await page
      .locator(".fl-notice")
      .filter({
        hasText:
          /image.*(unavailable|could not|not ready)|could not.*image|cannot.*(image|export)|unable.*export/i,
      })
      .waitFor({ timeout: 5000 });
  }
  // Negative event check has a bounded observation window; it does not claim perpetual absence.
  await page.waitForTimeout(350);
  assert.equal(
    scenario.downloads.length,
    before,
    "Unavailable export must not create a fake or blank PNG download",
  );
  pass("Unavailable PNG export rejected: " + reason, {
    observedDownloadEvents: scenario.downloads.length - before,
    observationMs: 350,
  });
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
};
const guideAccessible = async (page) => {
  await page.getByRole("link", { name: "Field guide", exact: true }).click();
  await page.locator(".fl-guides").waitFor();
  assert(
    (await page.locator(".fl-guides").innerText()).length > 500,
    "Fallback must preserve substantive botanical content",
  );
};
const alphaBounds = (page) =>
  page.locator("canvas[data-testid=atlas-canvas]").evaluate((canvas) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let left = copy.width,
      top = copy.height,
      right = -1,
      bottom = -1,
      count = 0;
    for (let y = 0; y < copy.height; y++)
      for (let x = 0; x < copy.width; x++)
        if (data[(y * copy.width + x) * 4 + 3] > 20) {
          count++;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    return {
      canvasWidth: copy.width,
      canvasHeight: copy.height,
      left,
      top,
      right,
      bottom,
      count,
      width: right - left + 1,
      height: bottom - top + 1,
    };
  });
const framed = (bounds, label) => {
  assert(
    bounds.count > 500,
    label + ": enough actual nontransparent geometry pixels",
  );
  assert(
    bounds.left > 2 &&
      bounds.top > 2 &&
      bounds.right < bounds.canvasWidth - 3 &&
      bounds.bottom < bounds.canvasHeight - 3,
    label + ": geometry must not touch canvas edges",
  );
  const x = (bounds.left + bounds.right) / 2 / bounds.canvasWidth,
    y = (bounds.top + bounds.bottom) / 2 / bounds.canvasHeight;
  assert(
    x > 0.25 && x < 0.75 && y > 0.25 && y < 0.75,
    label + ": geometry must remain centered",
  );
  assert(
    bounds.width / bounds.canvasWidth > 0.12 &&
      bounds.height / bounds.canvasHeight > 0.1,
    label + ": focus must not leave the structure tiny",
  );
};

try {
  // A real context-loss extension tests the browser/renderer path rather than a synthetic DOM event.
  {
    const { context, page, scenario } = await setup(
      "context loss survives mode changes",
    );
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await ready(page);
    const supported = await page
      .locator("canvas[data-testid=atlas-canvas]")
      .evaluate((canvas) => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const extension = gl?.getExtension("WEBGL_lose_context");
        if (!extension) return false;
        extension.loseContext();
        return true;
      });
    if (!supported) {
      report.limitations.push(
        "WEBGL_lose_context is unavailable in this Chromium build; the live context-loss scenario was not executed. No-GPU creation fallback is tested separately.",
      );
    } else {
      await page
        .getByText("The 3D view is unavailable", { exact: true })
        .waitFor();
      await page.locator("#view-mode").selectOption("anatomy");
      await nextFrames(page);
      await page.waitForTimeout(250);
      assert(
        await page
          .getByText("The 3D view is unavailable", { exact: true })
          .isVisible(),
        "Mode switch must retain the graphics fallback",
      );
      assert.equal(
        await page.locator(".fl-viewer").getAttribute("data-rendered"),
        "false",
      );
      await rejectedExport(page, scenario, "lost graphics context");
      await photo(page, "01-context-lost");
      await guideAccessible(page);
      pass(
        "Actual context loss retains fallback across mode changes and guide remains accessible",
      );
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await ready(page);
      pass("Fresh page recovers rendering after context loss");
    }
    assert.deepEqual(
      scenario.pageErrors,
      [],
      "Context loss must not escape as an unhandled application exception",
    );
    await context.close();
  }

  {
    const { context, page, scenario } = await setup(
      "no graphics context",
      () => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return String(type).startsWith("webgl")
            ? null
            : original.call(this, type, ...args);
        };
      },
    );
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page
      .getByText("The 3D view is unavailable", { exact: true })
      .waitFor();
    await rejectedExport(page, scenario, "graphics creation failed");
    await photo(page, "02-no-gpu");
    await guideAccessible(page);
    pass("No-GPU fallback preserves botanical guide and blocks PNG export");
    assert.deepEqual(
      scenario.pageErrors,
      [],
      "No-GPU failure must be contained",
    );
    await context.close();
  }

  {
    const { context, page, scenario } = await setup(
      "export while a specimen is loading",
    );
    let release, markHeld;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const held = new Promise((resolve) => {
      markHeld = resolve;
    });
    await context.route("**/data/assets/*.glb", async (route) => {
      markHeld();
      await gate;
      await route.continue();
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator(".fl-loading").waitFor();
    await Promise.race([
      held,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("No specimen request was held")),
          15000,
        ),
      ),
    ]);
    await rejectedExport(page, scenario, "specimen request pending");
    await photo(page, "03-loading-export-rejected");
    release();
    await ready(page);
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      20000,
    );
    pass("Pending specimen request recovers after export rejection");
    assert.deepEqual(scenario.pageErrors, []);
    await context.close();
  }

  {
    const { context, page, scenario } = await setup(
      "one failed comparison with a delayed peer",
    );
    let release, markHeld, markFailure;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const held = new Promise((resolve) => {
      markHeld = resolve;
    });
    const failed = new Promise((resolve) => {
      markFailure = resolve;
    });
    await context.route("**/data/assets/*.glb", async (route) => {
      if (route.request().url().endsWith("/vanda-preview.glb")) {
        await route.fulfill({
          status: 502,
          contentType: "text/plain",
          body: "Deliberate resilience test failure",
        });
        markFailure();
        return;
      }
      if (route.request().url().endsWith("/phalaenopsis-preview.glb")) {
        markHeld();
        await gate;
      }
      await route.continue();
    });
    await page.goto(
      viewUrl({ mode: "specimen", specimen: "phalaenopsis", compare: "vanda" }),
      { waitUntil: "domcontentloaded" },
    );
    await Promise.all([held, failed]);
    release();
    await page
      .getByText("The 3D view is unavailable", { exact: true })
      .waitFor({ timeout: 60000 });
    await page.waitForFunction(
      () =>
        window.__florariaWorkers.created > 0 &&
        window.__florariaWorkers.active === 0,
      null,
      { timeout: 30000 },
    );
    const workers = await page.evaluate(() => window.__florariaWorkers);
    assert.equal(
      workers.created,
      workers.terminated,
      "Every decode worker must terminate after both comparison requests settle",
    );
    assert.equal(
      await page.locator(".fl-viewer").getAttribute("data-rendered"),
      "false",
      "A failed comparison must not claim a complete rendered view",
    );
    await rejectedExport(page, scenario, "one comparison asset failed");
    await photo(page, "04-comparison-asset-failure");
    await page.locator("#compare").selectOption("");
    await ready(page);
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      20000,
    );
    await page.waitForFunction(() => window.__florariaWorkers.active === 0);
    assert.deepEqual(scenario.pageErrors, []);
    assert(
      scenario.httpErrors.length >= 1 &&
        scenario.httpErrors.every(
          (item) =>
            item.status === 502 && item.url.endsWith("/vanda-preview.glb"),
        ),
      "Only the deliberately failed comparison side may return an HTTP error",
    );
    pass(
      "Failed comparison settles and terminates decode workers; switching to one specimen recovers",
      { workers },
    );
    await context.close();
  }

  {
    const { context, page, scenario } = await setup(
      "isolation and hidden geometry framing",
    );
    await page.goto(
      viewUrl({
        mode: "anatomy",
        model: "general",
        selected: "ovary",
        isolate: true,
        explode: 1,
      }),
      { waitUntil: "domcontentloaded" },
    );
    await ready(page);
    framed(await alphaBounds(page), "Isolated ovary");
    const selections = [];
    for (const id of ["stigma", "stem", "stigma"]) {
      await page.locator(`[data-part=${id}]`).click();
      await ready(page);
      assert(
        await page
          .getByRole("button", { name: "Show context", exact: true })
          .isVisible(),
        "Isolation must persist when selecting another structure",
      );
      const bounds = await alphaBounds(page);
      framed(bounds, "Isolated " + id);
      selections.push({ id, ...bounds });
    }
    const reference = selections.at(-1);
    await photo(page, "05-isolated-selection-refit");
    const hidden = catalog.structures
      .filter((part) => part.models.includes("general") && part.id !== "stigma")
      .map((part) => part.id);
    await page.goto(
      viewUrl({
        mode: "anatomy",
        model: "general",
        selected: "stigma",
        hidden,
        explode: 1,
      }),
      { waitUntil: "domcontentloaded" },
    );
    await ready(page);
    await page.locator(".fl-viewer").focus();
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await nextFrames(page);
    await page.keyboard.press("Home");
    await ready(page);
    const restored = await alphaBounds(page);
    framed(restored, "Home with every other structure hidden");
    for (const key of ["left", "right", "top", "bottom"])
      assert(
        Math.abs(restored[key] - reference[key]) <= 3,
        `Home must frame the same visible stigma as isolation (${key})`,
      );
    await photo(page, "06-hidden-home-fit");
    assert.deepEqual(scenario.pageErrors, []);
    assert.deepEqual(scenario.httpErrors, []);
    pass(
      "Changing an isolated selection refits visible pixels; Home ignores hidden geometry",
      { selections, hiddenHome: restored, pixelTolerance: 3 },
    );
    await context.close();
  }
  report.pass = true;
} catch (error) {
  report.failure = String(error.stack || error);
  process.exitCode = 1;
  await activePage
    ?.screenshot({ path: resolve(output, "failure.png") })
    .catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  for (const context of contexts) await context.close().catch(() => {});
  for (const browser of browsers) await browser.close().catch(() => {});
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
