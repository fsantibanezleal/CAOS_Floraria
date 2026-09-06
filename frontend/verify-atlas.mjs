/** Real Chromium integration checks; run against dev, preview or public production. */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const base = process.env.FLORARIA_QA_URL || "http://127.0.0.1:5902";
const output = resolve(process.env.FLORARIA_QA_DIR || "../build/qa/atlas");
mkdirSync(output, { recursive: true });
const catalog = JSON.parse(
  readFileSync(
    new URL("../data/artifacts/catalog.json", import.meta.url),
    "utf8",
  ),
);
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const report = {
  base,
  browser: browser.version(),
  startedAt: new Date().toISOString(),
  checks: [],
  errors: [],
  networkFailures: [],
  layouts: [],
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  permissions: ["clipboard-read", "clipboard-write"],
});
await context.addInitScript(() => {
  localStorage.setItem("caos.lang", "en");
  localStorage.setItem("caos.theme", "light");
});
const page = await context.newPage();
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400)
    report.networkFailures.push({ url: r.url(), status: r.status() });
});
const pass = (name, detail) =>
  report.checks.push({ name, pass: true, ...(detail ? { detail } : {}) });
const ready = async () => {
  await page
    .locator(".fl-loading")
    .waitFor({ state: "hidden", timeout: 60000 });
  await page
    .locator(".fl-viewer[data-rendered=true]")
    .waitFor({ timeout: 60000 });
  await page.waitForTimeout(180);
};
const open = async (search = "") => {
  await page.goto(base + "/" + search, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await ready();
};
const canvasDigest = async () =>
  createHash("sha256")
    .update(await page.locator("canvas").screenshot())
    .digest("hex");
const photo = async (name) => {
  await page.screenshot({ path: resolve(output, name + ".png") });
};
const selectMode = async (mode) => {
  await page.locator("#view-mode").selectOption(mode);
  await ready();
};
try {
  await open();
  const initial = await canvasDigest();
  assert(initial);
  pass("Anonymous first scan rendered");
  await photo("01-collection-light");
  for (const specimen of catalog.specimens) {
    await page.locator("#specimen").selectOption(specimen.id);
    await ready();
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      specimen.preview.triangles,
    );
    await page.getByLabel("Load fine detail", { exact: false }).check();
    await ready();
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      specimen.detail.triangles,
    );
    await page.getByLabel("Load fine detail", { exact: false }).uncheck();
    await ready();
    pass("Both real scan levels: " + specimen.id);
  }
  await page.locator("#compare").selectOption("phalaenopsis");
  await ready();
  assert.equal(
    Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
    40000,
  );
  await photo("02-comparison");
  pass("Two scanned specimens render together with independent scaling");
  await selectMode("anatomy");
  const assembled = await canvasDigest();
  await page.getByLabel("Separate components", { exact: true }).fill("1");
  await ready();
  assert.notEqual(await canvasDigest(), assembled);
  await photo("03-unfolded");
  pass("Disassembly changes actual rendered geometry");
  await page.locator("[data-part=ovary]").click();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  await ready();
  const isolated = await canvasDigest();
  await page.getByRole("button", { name: "Show context", exact: true }).click();
  await ready();
  assert.notEqual(await canvasDigest(), isolated);
  pass("Named selection, isolation and context restoration");
  await page.getByLabel("Hide Ovary", { exact: true }).click();
  await ready();
  assert(await page.getByLabel("Show Ovary", { exact: true }).isVisible());
  await page.getByLabel("Show Ovary", { exact: true }).click();
  await ready();
  pass("Visibility controls restore hidden geometry");
  await page.getByLabel("Separate components", { exact: true }).fill("0");
  await ready();
  await page.getByLabel("Cut through the model", { exact: true }).check();
  for (const axis of ["x", "y", "z"]) {
    await page.locator("#cut-axis").selectOption(axis);
    await page.getByLabel("Plane position", { exact: true }).fill("0");
    await ready();
    assert.notEqual(await canvasDigest(), assembled);
  }
  await photo("04-section");
  await page.getByLabel("Cut through the model", { exact: true }).uncheck();
  pass("Three section-plane axes alter the 3D canvas");
  await page.getByLabel("Flower opening", { exact: true }).fill("0");
  await ready();
  const bud = await canvasDigest();
  await page.getByLabel("Flower opening", { exact: true }).fill("1");
  await ready();
  assert.notEqual(await canvasDigest(), bud);
  pass("Flower-opening deformation");
  await page.locator("#teaching-model").selectOption("orchid");
  await ready();
  assert.equal(await page.locator("[data-part=anther]").count(), 0);
  assert.equal(await page.locator("[data-part=lip]").count(), 1);
  await page.locator("[data-part=lip]").click();
  await ready();
  await photo("05-orchid-morphology");
  pass("Orchid-specific anatomy and selection");
  await selectMode("anatomy");
  await page.locator("#teaching-model").selectOption("general");
  await ready();
  // Dragging orbits; it must not manufacture a clicked selection.
  await page
    .getByRole("button", { name: "Reset exploration", exact: true })
    .click();
  await ready();
  const box = await page.locator("canvas").boundingBox();
  const beforeDrag = await canvasDigest();
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.57, {
    steps: 12,
  });
  await page.mouse.up();
  await ready();
  assert.equal(await page.locator(".fl-part-row.selected").count(), 0);
  assert.notEqual(await canvasDigest(), beforeDrag);
  pass("Pointer drag rotates without selecting a part");
  await page.locator(".fl-viewer").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await page.keyboard.press("Home");
  await ready();
  pass("Keyboard rotation, zoom and reset");
  // Scan real canvas pixels in the central flower area until one named part is picked.
  for (const fraction of [
    [0.5, 0.4],
    [0.48, 0.47],
    [0.55, 0.45],
    [0.5, 0.53],
    [0.5, 0.6],
  ]) {
    await page.mouse.click(
      box.x + box.width * fraction[0],
      box.y + box.height * fraction[1],
    );
    await page.waitForTimeout(100);
    if (await page.locator(".fl-part-row.selected").count()) break;
  }
  assert.equal(await page.locator(".fl-part-row.selected").count(), 1);
  pass("Canvas ray picking selects a named part");
  await selectMode("lifecycle");
  const lifecycleDigests = [];
  for (const stage of [0, 0.25, 0.5, 0.7, 1]) {
    await page
      .getByLabel("Scrub the sequence", { exact: true })
      .fill(String(stage));
    await ready();
    lifecycleDigests.push(await canvasDigest());
  }
  assert.equal(new Set(lifecycleDigests).size, 5);
  await photo("06-seeds");
  await page
    .getByRole("button", { name: "Play sequence", exact: true })
    .click();
  await page.waitForTimeout(550);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await page
    .getByLabel("Scrub the sequence", { exact: true })
    .inputValue();
  assert(Number(paused) > 0);
  await page.waitForTimeout(300);
  assert.equal(
    await page.getByLabel("Scrub the sequence", { exact: true }).inputValue(),
    paused,
  );
  pass("Five lifecycle states and actual play/pause");
  await page.getByRole("tab", { name: "Journeys", exact: true }).click();
  for (const journey of catalog.journeys) {
    await page
      .locator(".fl-journey-list button")
      .filter({ hasText: journey.title.en })
      .click();
    await ready();
    for (let i = 0; i < journey.steps.length; i++) {
      assert.equal(
        (await page.locator(".fl-journey-card h3").innerText()).trim(),
        journey.steps[i].title.en,
      );
      if (i < journey.steps.length - 1) {
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await ready();
      }
    }
    assert(
      await page
        .getByRole("button", { name: "Next", exact: true })
        .isDisabled(),
    );
    pass("Complete guided investigation: " + journey.id, {
      steps: journey.steps.length,
    });
  }
  await page
    .getByRole("button", { name: "Close journey", exact: true })
    .click();
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await selectMode("anatomy");
  await page.getByLabel("Separate components", { exact: true }).fill("0.63");
  await page.locator("[data-part=petal]").click();
  await page.getByRole("tab", { name: "Notebook", exact: true }).click();
  await page
    .getByRole("button", { name: "Save bookmark", exact: true })
    .click();
  const bookmark = JSON.parse(
    await page.evaluate(() => localStorage.getItem("floraria.bookmark.v1")),
  );
  assert.equal(bookmark.view.explode, 0.63);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export exploration", exact: true })
    .click();
  const stateDownload = await downloaded;
  const statePath = resolve(output, "roundtrip-view.json");
  await stateDownload.saveAs(statePath);
  assert.equal(
    JSON.parse(readFileSync(statePath, "utf8")).view.selected,
    "petal",
  );
  await page
    .getByRole("button", { name: "Reset exploration", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles(statePath);
  await ready();
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  assert.equal(
    await page.getByLabel("Separate components", { exact: true }).inputValue(),
    "0.63",
  );
  pass("Bookmark and downloaded JSON import/export round trip");
  await page.getByRole("tab", { name: "Notebook", exact: true }).click();
  await page
    .getByRole("button", { name: "Share exploration link", exact: true })
    .click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  assert(shared.includes("view="));
  const pngDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save view as PNG", exact: true })
    .click();
  const png = await pngDownload;
  const pngPath = resolve(output, "exported-canvas.png");
  await png.saveAs(pngPath);
  assert(readFileSync(pngPath).subarray(1, 4).equals(Buffer.from("PNG")));
  pass("PNG download contains an actual image");
  await page.goto(shared, { waitUntil: "domcontentloaded" });
  await ready();
  assert.equal(
    await page.getByLabel("Separate components", { exact: true }).inputValue(),
    "0.63",
  );
  assert(
    await page
      .locator("[data-part=petal]")
      .locator("..")
      .evaluate((e) => e.classList.contains("selected")),
  );
  pass("Shared URL reopens selection and controls");
  await page.getByRole("tab", { name: "Notebook", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await page.getByRole("status").filter({ hasText: "Invalid file" }).waitFor();
  pass("Malformed imported file rejected visibly");
  await open();
  for (const [name, width, height] of [
    ["desktop", 1280, 800],
    ["wide", 1600, 900],
    ["ultrawide", 2560, 1440],
    ["phone", 390, 844],
    ["small-phone", 320, 740],
    ["landscape", 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await ready();
    const layout = await page.evaluate(() => {
      const r = document.querySelector(".fl-stage").getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        stageArea: (r.width * r.height) / (innerWidth * innerHeight),
      };
    });
    assert.equal(layout.scrollWidth, width);
    assert.equal(layout.scrollHeight, height);
    assert(layout.stageArea >= 0.5, `${name}: stage ${layout.stageArea}`);
    report.layouts.push({ name, ...layout });
    const headerOverflow = await page
      .locator(".header-actions .icon-btn")
      .evaluateAll((items) =>
        items.some((e) => {
          const r = e.getBoundingClientRect();
          return r.left < 0 || r.right > innerWidth;
        }),
      );
    assert.equal(headerOverflow, false, `${name}: clipped header controls`);
    await photo("layout-" + name);
    if (width < 761) {
      await page
        .locator(".fl-mobile-actions")
        .getByRole("button", { name: "Explore", exact: true })
        .click();
      assert(await page.locator(".fl-rail.open").isVisible());
      await page
        .getByRole("button", { name: "Close controls", exact: true })
        .click();
      await page
        .locator(".fl-mobile-actions")
        .getByRole("button", { name: "Field note", exact: true })
        .click();
      assert(await page.locator(".fl-detail.shown").isVisible());
      await page
        .getByRole("button", { name: "Close detail", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Expand the scene", exact: true })
      .click();
    await ready();
    const coverage = await page.locator(".fl-stage").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return (r.width * r.height) / (innerWidth * innerHeight);
    });
    assert(coverage >= 0.8, `${name}: expanded ${coverage}`);
    await page
      .getByRole("button", { name: "Return to cabinet", exact: true })
      .click();
    await ready();
    pass("Responsive controls and expansion: " + name, { coverage });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page
    .getByRole("button", { name: "Toggle light / dark", exact: true })
    .click();
  await ready();
  await photo("07-collection-dark");
  await page.getByRole("button", { name: /language|idioma/i }).click();
  await ready();
  assert.equal(await page.locator("html").getAttribute("lang"), "es");
  await photo("08-collection-dark-spanish");
  pass("Light/dark and English/Spanish shell controls");
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
  assert.equal(
    report.networkFailures.length,
    0,
    JSON.stringify(report.networkFailures),
  );
  // Deliberate failures get separate contexts so expected browser errors do not pollute normal-use results.
  const broken = await browser.newContext();
  await broken.route("**/data/catalog.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"schemaVersion":999}',
    }),
  );
  const failPage = await broken.newPage();
  await failPage.goto(base);
  await failPage
    .getByRole("heading", { name: "The collection could not load" })
    .waitFor();
  await broken.close();
  pass("Malformed catalog gives a recoverable failure screen");
  const noGpu = await browser.newContext();
  await noGpu.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  const noGpuPage = await noGpu.newPage();
  await noGpuPage.goto(base);
  await noGpuPage
    .getByText("The 3D view is unavailable", { exact: true })
    .waitFor();
  await noGpuPage
    .getByRole("link", { name: "Field guide", exact: true })
    .click();
  await noGpuPage.locator(".fl-guides").waitFor();
  await noGpu.close();
  pass("No-WebGL fallback preserves access to botanical guide");
  report.finishedAt = new Date().toISOString();
  report.pass = true;
} catch (error) {
  report.pass = false;
  report.failure = String(error.stack || error);
  await page
    .screenshot({ path: resolve(output, "failure.png") })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
