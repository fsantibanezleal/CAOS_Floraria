/** Rendered acceptance of continuous botanical exploration. Run against the exact
 * preview/artifact to promote. Screenshots require a separate visual review;
 * pixel diversity alone cannot establish scientific clarity or learning value. */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base =
  (process.env.FLORARIA_QA_URL || "http://127.0.0.1:4902").replace(/\/$/, "") +
  "/";
const output = resolve(
  process.env.FLORARIA_QA_DIR ||
    fileURLToPath(new URL("../build/qa", import.meta.url)),
  "living",
);
mkdirSync(output, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    }).trim();
  } catch {
    return "unavailable";
  }
};
const report = {
  schemaVersion: 1,
  suite: "floraria-living",
  base,
  source: git(["rev-parse", "HEAD"]),
  worktree: git(["status", "--porcelain"]),
  filter: process.env.FLORARIA_LIVING_FILTER || null,
  node: process.version,
  startedAt: new Date().toISOString(),
  pass: false,
  scenarios: [],
  checks: [],
  screenshots: [],
  layouts: [],
  limitations: [
    "Chromium software WebGL and emulated touch/viewports, not physical-device or screen-reader testing.",
    "Pixel checks detect blank/flat renders; biological visibility and design require inspection of the recorded screenshots.",
  ],
};
report.inputs = [
  "src/LivingExperience.tsx",
  "src/living.css",
  "src/render/LivingScene.tsx",
  "src/render/livingGeometry.ts",
  "src/lib/living.ts",
  "src/lib/livingContent.ts",
  "src/lib/livingNotebook.ts",
  "verify-living.mjs",
].map((file) => {
  const bytes = readFileSync(new URL(file, import.meta.url));
  return { file: "frontend/" + file, bytes: bytes.length, sha256: hash(bytes) };
});
const persist = () =>
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
try {
  const response = await fetch(new URL("release.json", base), {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Release manifest returned HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.product, "FLORARIA");
  assert.match(manifest.artifact_tree_sha256, /^[a-f0-9]{64}$/);
  writeFileSync(resolve(output, "tested-release.json"), bytes);
  report.artifact = {
    releaseId: manifest.release_id,
    version: manifest.version,
    revision: manifest.revision,
    artifactTreeSha256: manifest.artifact_tree_sha256,
    sourceClean: manifest.source_clean,
    status: manifest.source_clean
      ? "committed-build"
      : "candidate-uncommitted-build",
    manifestSha256: hash(bytes),
  };
} catch (error) {
  report.artifactError = String(error.message || error);
}
const check = (name, evidence = {}) => {
  report.checks.push({ name, ...evidence, pass: true });
  persist();
};
const scene = (page) => page.getByTestId("living-scene");
const depth = async (page) =>
  Number(await scene(page).getAttribute("data-depth"));
const ready = async (page, expected) => {
  await scene(page).locator("canvas").waitFor({ timeout: 45000 });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="living-scene"]')?.dataset
        .rendered === "true",
    undefined,
    { timeout: 45000 },
  );
  await page.waitForFunction(() => document.fonts.check('16px "Outfit"'));
  if (expected !== undefined)
    await page.waitForFunction(
      (value) =>
        Math.abs(
          Number(
            document.querySelector('[data-testid="living-scene"]')?.dataset
              .depth,
          ) - value,
        ) < 0.00006,
      expected,
      { timeout: 45000 },
    );
  await page.waitForTimeout(140);
};
const open = async (page, params = {}) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));
  await page.goto(url.href, { waitUntil: "networkidle" });
  await ready(page, Number(params.depth || 0));
};
const pixels = async (page) =>
  page.getByTestId("living-canvas").evaluate((canvas) => {
    const copy = document.createElement("canvas");
    copy.width = 120;
    copy.height = 120;
    const ctx = copy.getContext("2d");
    ctx.drawImage(
      canvas,
      canvas.width * 0.3,
      canvas.height * 0.2,
      canvas.width * 0.4,
      canvas.height * 0.55,
      0,
      0,
      120,
      120,
    );
    const data = ctx.getImageData(0, 0, 120, 120).data;
    const colors = new Set();
    let alpha = 0,
      min = 255,
      max = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 40) {
        alpha++;
        colors.add(`${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`);
        const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
        min = Math.min(min, l);
        max = Math.max(max, l);
      }
    }
    return {
      colors: colors.size,
      coverage: alpha / 14400,
      luminanceRange: max - min,
    };
  });
const photo = async (page, name) => {
  const file = name + ".png";
  const bytes = await page.screenshot({
    path: resolve(output, file),
    fullPage: true,
  });
  report.screenshots.push({
    file,
    bytes: bytes.length,
    sha256: hash(bytes),
    form: await scene(page).getAttribute("data-form"),
    branch: await scene(page).getAttribute("data-branch"),
    depth: await depth(page),
  });
  persist();
};
const layout = async (page, name) => {
  const measurement = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        background: style.backgroundColor,
      };
    };
    return {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      font: getComputedStyle(document.body).fontFamily,
      canvas: box('[data-testid="living-canvas"]'),
      context: box(".living-context"),
      header: box(".living-header"),
      dock: box(".living-dock"),
      breadcrumb: box(".living-breadcrumb"),
    };
  });
  assert(
    measurement.scrollWidth <= measurement.width + 1,
    "Horizontal overflow",
  );
  assert(
    measurement.font.includes("Outfit"),
    "Own locally served font is active",
  );
  for (const id of ["header", "dock", "context", "breadcrumb"]) {
    const b = measurement[id];
    assert(
      b &&
        b.x >= -1 &&
        b.right <= measurement.width + 1 &&
        b.y >= -1 &&
        b.bottom <= measurement.height + 1,
      `${id} stays in viewport`,
    );
  }
  assert(
    measurement.context.bottom <= measurement.dock.y + 1,
    "Context does not hide process controls",
  );
  report.layouts.push({ name, ...measurement, pass: true });
  persist();
};
const canvasHash = async (page) =>
  hash(
    Buffer.from(
      await page
        .getByTestId("living-canvas")
        .evaluate((canvas) => canvas.toDataURL().split(",")[1]),
      "base64",
    ),
  );
const setRange = async (page, label, value) => {
  await page
    .getByRole("slider", { name: label, exact: true })
    .evaluate((element, next) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(element, String(next));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
};
const getDownload = async (page, action, filename) => {
  const promise = page.waitForEvent("download");
  await action();
  const item = await promise;
  assert(!(await item.failure()));
  await item.saveAs(resolve(output, filename));
  return readFileSync(resolve(output, filename));
};
async function scenario(name, run, options = {}) {
  if (
    report.filter &&
    !report.filter.split(",").some((part) => name.includes(part.trim()))
  )
    return;
  console.log("SCENARIO " + name);
  const record = {
    name,
    startedAt: new Date().toISOString(),
    pass: false,
    errors: [],
    failedResponses: [],
  };
  report.scenarios.push(record);
  persist();
  const server = await chromium.launchServer({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const browser = await chromium.connect(server.wsEndpoint());
  report.browser = browser.version();
  const context = await browser.newContext({
    viewport: options.phone
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
    isMobile: !!options.phone,
    hasTouch: !!options.phone,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion || "no-preference",
    permissions: ["clipboard-read", "clipboard-write"],
    locale: "en-US",
  });
  await context.addInitScript(() => {
    localStorage.setItem("caos.lang", "en");
    localStorage.setItem("caos.theme", "dark");
    localStorage.setItem("floraria.studio.theme", "dark");
  });
  const page = await context.newPage();
  await page.bringToFront();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => record.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") record.errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      record.failedResponses.push({
        url: response.url(),
        status: response.status(),
      });
  });
  try {
    await run(page, context, record);
    assert.deepEqual(record.errors, [], "Browser errors");
    assert.deepEqual(record.failedResponses, [], "Failed HTTP responses");
    record.pass = true;
  } catch (error) {
    record.failure = String(error.stack || error);
    console.error("FAIL " + name + ": " + error.message);
    try {
      await photo(page, "failure-" + name);
    } catch {}
  } finally {
    record.finishedAt = new Date().toISOString();
    persist();
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    await Promise.race([
      server.kill(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    const process = server.process();
    try {
      if (process.exitCode === null) process.kill("SIGKILL");
    } catch {}
    console.log((record.pass ? "PASS " : "FAIL ") + name);
  }
}

const expectedNodes = {
  petal: ["petal-papilla", "petal-vacuole"],
  stem: ["stem-vessel", "stem-pit"],
  anther: ["anther-pollen", "anther-aperture"],
  ovary: ["ovary-embryo-sac", "ovary-egg-nucleus"],
};
for (const phone of [false, true])
  for (const form of ["sunflower", "radial", "orchid"]) {
    await scenario(
      `render-${phone ? "phone" : "desktop"}-${form}`,
      async (page) => {
        for (const branch of Object.keys(expectedNodes))
          for (const [index, target] of [2.8, 4].entries()) {
            await open(page, { form, path: branch, depth: target, paused: 1 });
            const expected =
              form === "sunflower" && branch === "petal"
                ? ["sunflower-ray-cell", "sunflower-chromoplast"][index]
                : expectedNodes[branch][index];
            await page
              .getByTestId("living-context")
              .and(page.locator(`[data-node="${expected}"]`))
              .waitFor();
            assert(
              await page
                .getByTestId("living-context")
                .locator("h2")
                .innerText(),
            );
            const stats = await pixels(page);
            assert(
              stats.colors > 20 &&
                stats.coverage > 0.005 &&
                stats.luminanceRange > 18,
              "Focal region contains distinct rendered structures",
            );
            const name = `${phone ? "phone" : "desktop"}-${form}-${branch}-${target}`;
            await photo(page, name);
            await layout(page, name);
            check(name, {
              node: expected,
              pixels: stats,
              triangles: Number(
                await scene(page).getAttribute("data-triangles"),
              ),
            });
          }
      },
      { phone },
    );
  }

await scenario("canvas-first-continuity-and-process", async (page) => {
  await open(page);
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator("select").count(), 0);
  assert.equal(await page.getByTestId("living-canvas").count(), 1);
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  const identity = await page.getByTestId("living-canvas").elementHandle();
  await photo(page, "garden-desktop");
  await layout(page, "garden-desktop");
  const rect = await scene(page).boundingBox();
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  const initial = await canvasHash(page);
  await page.mouse.wheel(0, 560);
  await ready(page);
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[data-testid="living-scene"]').dataset.depth,
      ) > 0.8,
  );
  const intermediate = await depth(page);
  assert(intermediate > 0.8 && intermediate < 1.2);
  assert.notEqual(await canvasHash(page), initial);
  assert.equal(await page.getByRole("dialog").count(), 0);
  await photo(page, "wheel-intermediate");
  await page.mouse.wheel(0, 1100);
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[data-testid="living-scene"]').dataset.depth,
      ) > 2.6,
  );
  const inside = await canvasHash(page);
  assert.notEqual(inside, initial);
  assert(
    await identity.evaluate(
      (element) =>
        element === document.querySelector('[data-testid="living-canvas"]'),
    ),
  );
  await page.mouse.wheel(0, -700);
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('[data-testid="living-scene"]').dataset.depth,
      ) < 1.8,
  );
  await scene(page).focus();
  await page.keyboard.press("End");
  await ready(page, 4);
  const pausedA = await canvasHash(page);
  await page.waitForTimeout(350);
  assert.equal(await canvasHash(page), pausedA);
  await page.getByRole("button", { name: "Play motion", exact: true }).click();
  await page.waitForTimeout(400);
  assert.notEqual(await canvasHash(page), pausedA);
  const pauseStarted = Date.now();
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  check("motion-pause-response", {
    elapsedMs: Date.now() - pauseStarted,
    rendering: await scene(page).evaluate((element) => ({
      triangles: element.dataset.triangles,
      calls: element.dataset.renderCalls,
      pixelRatio: element.dataset.pixelRatio,
      frameMs: element.dataset.frameMs,
    })),
  });
  await setRange(page, "Flower opening", 0.3);
  await page.waitForTimeout(180);
  const closed = await canvasHash(page);
  await setRange(page, "Flower opening", 0.94);
  await page.waitForTimeout(180);
  assert.notEqual(await canvasHash(page), closed);
  await page
    .getByRole("button", { name: "Reset camera and depth", exact: true })
    .click();
  await ready(page, 0);
  assert(
    await identity.evaluate(
      (element) =>
        element === document.querySelector('[data-testid="living-canvas"]'),
    ),
  );
  await page
    .getByRole("button", { name: "Follow a drop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow inside", exact: true })
    .click();
  const before = await depth(page);
  const journeyStarted = Date.now();
  await page.waitForFunction(
    (value) =>
      Number(
        document.querySelector('[data-testid="living-scene"]').dataset.depth,
      ) >
      value + 0.04,
    before,
    { timeout: 15000 },
  );
  check("guided-travel-advances-without-input", {
    elapsedMs: Date.now() - journeyStarted,
    delta: (await depth(page)) - before,
  });
  await scene(page).focus();
  await page.keyboard.press("ArrowUp");
  assert.equal(
    await page
      .getByRole("button", { name: "Pause journey", exact: true })
      .count(),
    0,
  );
  check(
    "direct-wheel-reverse-keyboard-pause-opening-tour-preserves-one-canvas",
  );
  await page
    .getByRole("button", { name: "Follow inside", exact: true })
    .click();
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.45);
  await page.mouse.down();
  assert.equal(
    await page
      .getByRole("button", { name: "Pause journey", exact: true })
      .count(),
    0,
  );
  await page.mouse.move(
    rect.x + rect.width * 0.58,
    rect.y + rect.height * 0.49,
    { steps: 5 },
  );
  await page.mouse.up();
  check("pointer-down-and-orbit-return-control-from-guided-travel");
});

await scenario(
  "touch-responsive-and-reduced-motion",
  async (page, context) => {
    await open(page, { form: "orchid", path: "ovary", depth: 1.4 });
    assert.equal(
      await page
        .getByRole("button", { name: "Play motion", exact: true })
        .count(),
      1,
    );
    const beforeTime = await scene(page).getAttribute("data-time");
    await page.waitForTimeout(300);
    assert.equal(await scene(page).getAttribute("data-time"), beforeTime);
    const cdp = await context.newCDPSession(page);
    const rect = await scene(page).boundingBox();
    const x = rect.x + rect.width * 0.5,
      y = rect.y + rect.height * 0.44;
    const points = (span) => [
      { x: x - span, y, id: 0 },
      { x: x + span, y, id: 1 },
    ];
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points(35),
    });
    for (const span of [42, 52, 64, 80])
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: points(span),
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(200);
    assert((await depth(page)) > 2, "Two-finger spread travels inward");
    await photo(page, "phone-pinch-intermediate");
    await layout(page, "phone-pinch-intermediate");
    await scene(page).focus();
    await page.keyboard.press("End");
    await ready(page, 4);
    await page
      .getByRole("button", { name: "Sources for this structure", exact: true })
      .click();
    assert(await page.getByRole("dialog").isVisible());
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(250);
    await layout(page, "phone-landscape");
    await photo(page, "phone-landscape");
    check("touch-pinch-reduced-motion-dialog-keyboard-orientation");
  },
  { phone: true, reducedMotion: "reduce" },
);

await scenario(
  "sources-private-notebook-share-and-exports",
  async (page, context) => {
    await open(page, { form: "sunflower", path: "petal", depth: 4, paused: 1 });
    await page
      .getByRole("button", { name: "Sources for this structure", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert((await dialog.locator('a[href*="s41598-026-53788-7"]').count()) > 0);
    assert((await dialog.innerText()).includes("chromoplast"));
    await photo(page, "chromoplast-sources");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Notebook", exact: true }).click();
    const note =
      "Private QA observation: chromosome color is illustrative. qa-not-for-share-72";
    await page.getByRole("textbox").fill(note);
    await page.getByRole("button", { name: "Save here", exact: true }).click();
    const bytes = await getDownload(
      page,
      () =>
        page
          .getByRole("button", { name: "Export notebook", exact: true })
          .click(),
      "notebook.json",
    );
    const saved = JSON.parse(bytes.toString("utf8"));
    assert.equal(saved.note, note);
    assert.equal(saved.state.depth, 4);
    assert.equal(saved.kind, "floraria-living");
    const choose = async (buffer) => {
      const pending = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Import notebook", exact: true })
        .click();
      await (
        await pending
      ).setFiles({
        name: "qa-notebook.json",
        mimeType: "application/json",
        buffer,
      });
    };
    await choose(Buffer.from('{"schemaVersion":99}'));
    await page
      .getByRole("status")
      .filter({ hasText: "not a valid living notebook" })
      .waitFor();
    assert.equal(await page.getByRole("textbox").inputValue(), note);
    await page.getByRole("textbox").fill("Unsaved observation before import");
    await choose(bytes);
    await page
      .getByRole("status")
      .filter({ hasText: "Notebook imported" })
      .waitFor();
    assert.equal(await page.getByRole("textbox").inputValue(), note);
    const backup = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("floraria.living.before-import")),
    );
    assert.equal(backup.note, "Unsaved observation before import");
    await page
      .getByRole("button", { name: "Restore previous view", exact: true })
      .click();
    assert.equal(
      await page.getByRole("textbox").inputValue(),
      "Unsaved observation before import",
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Share exploration", exact: true })
      .click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    assert(
      !link.includes(note) &&
        !link.includes("qa-not-for-share") &&
        !new URL(link).searchParams.has("note"),
    );
    const shared = await context.newPage();
    await shared.goto(link);
    await ready(shared, 4);
    assert.equal(await scene(shared).getAttribute("data-form"), "sunflower");
    await shared.close();
    await page.bringToFront();
    await page
      .getByRole("button", { name: "Reset camera and depth", exact: true })
      .click();
    await ready(page, 0);
    await page.getByRole("button", { name: "Notebook", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore saved view", exact: true })
      .click();
    await ready(page, 4);
    await page.getByRole("button", { name: "Notebook", exact: true }).click();
    assert.equal(await page.getByRole("textbox").inputValue(), note);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const png = await getDownload(
      page,
      () =>
        page
          .getByRole("button", { name: "Save scene image", exact: true })
          .click(),
      "scene-export.png",
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert(png.length > 10000);
    await page
      .getByRole("button", { name: "Change theme", exact: true })
      .click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "light",
    );
    await photo(page, "chromoplast-light-theme");
    await page
      .getByRole("button", { name: "Switch to Spanish", exact: true })
      .click();
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    await photo(page, "chromoplast-spanish");
    check(
      "primary-sources-device-save-restore-private-note-free-share-json-png-theme-language",
      {
        exportedNotebookSha256: hash(bytes),
        scenePngSha256: hash(png),
        sharedParams: [...new URL(link).searchParams.keys()],
      },
    );
  },
);
await scenario("source-integrity-failure-and-retry", async (page) => {
  const route = "**/data/living-content.json";
  await page.route(route, (request) =>
    request.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"schemaVersion":99}',
    }),
  );
  await open(page, { form: "sunflower", path: "petal", depth: 4, paused: 1 });
  await page
    .getByRole("button", { name: "Sources for this structure", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Detailed source content did not load" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .locator('a[href*="s41598-026-53788-7"]')
      .count(),
    0,
  );
  await photo(page, "source-integrity-rejected");
  await page.unroute(route);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator('a[href*="s41598-026-53788-7"]')
    .waitFor();
  assert.equal(await page.getByRole("alert").count(), 0);
  check(
    "invalid-source-content-is-not-presented-as-verified-and-retry-recovers",
  );
});

report.pass =
  report.scenarios.length > 0 &&
  report.scenarios.every((scenario) => scenario.pass) &&
  !!report.artifact;
report.finishedAt = new Date().toISOString();
persist();
console.log(
  JSON.stringify({
    pass: report.pass,
    scenarios: report.scenarios.length,
    checks: report.checks.length,
    screenshots: report.screenshots.length,
    output,
  }),
);
process.exitCode = report.pass ? 0 : 1;
