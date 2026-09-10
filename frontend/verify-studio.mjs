/** Real-browser verification of the redesigned botanical instrument.
 * FLORARIA_QA_URL can include the GitHub Pages project base path.
 * FLORARIA_QA_DIR selects receipts; old atlas/resilience suites remain historical.
 */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const base =
  (process.env.FLORARIA_QA_URL || "http://127.0.0.1:5902").replace(/\/$/, "") +
  "/";
const output = resolve(
  process.env.FLORARIA_QA_DIR ||
    fileURLToPath(new URL("../build/qa/studio", import.meta.url)),
);
mkdirSync(output, { recursive: true });
const read = (name) =>
  JSON.parse(
    readFileSync(new URL("../data/artifacts/" + name, import.meta.url), "utf8"),
  );
const catalog = read("catalog.json");
const micro = read("micro-atlas.json");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const downloaded = async (item, name) => {
  const path = resolve(output, name);
  await item.saveAs(path);
  return readFileSync(path);
};
const source = (() => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    }).trim();
  } catch {
    return "unavailable";
  }
})();
const report = {
  schemaVersion: 1,
  suite: "floraria-studio",
  base,
  source,
  filter: process.env.FLORARIA_QA_FILTER || null,
  node: process.version,
  startedAt: new Date().toISOString(),
  pass: false,
  checks: [],
  scenarios: [],
  screenshots: [],
  layouts: [],
  limitations: [
    "Chromium software rendering and device emulation; not a physical-device, screen-reader or measured-learning study.",
    "Historical atlas/resilience receipts retain their original scope and are not rewritten by this suite.",
  ],
};
report.worktree = (() => {
  try {
    return execFileSync("git", ["status", "--porcelain"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    }).trim();
  } catch {
    return "unavailable";
  }
})();
report.inputs = [
  "frontend/src/Studio.tsx",
  "frontend/src/studio.css",
  "frontend/src/render/Viewer.tsx",
  "frontend/src/render/MicroViewer.tsx",
  "frontend/src/render/StructureStudy.tsx",
  "frontend/src/render/micro-experience.css",
  "frontend/src/lib/depthNavigation.ts",
  "frontend/src/lib/exploration.ts",
  "frontend/verify-studio.mjs",
  "data/artifacts/catalog.json",
  "data/artifacts/micro-atlas.json",
  "data/artifacts/micro-atlas.integrity.json",
].map((file) => {
  const bytes = readFileSync(new URL("../" + file, import.meta.url));
  return { file, bytes: bytes.length, sha256: hash(bytes) };
});
// Software WebGL resource disposal across contexts is driver-dependent.
// A fresh Chromium process isolates each scenario and deliberate graphics fault.
let browser, browserServer;
const defaults = {
  mode: "specimen",
  model: "general",
  specimen: "phalaenopsis",
  compare: "",
  selected: "",
  hidden: [],
  explode: 0,
  cut: 0,
  cutEnabled: false,
  cutAxis: "x",
  stage: 0,
  bloom: 1,
  isolate: false,
  labels: true,
  quality: "preview",
  camera: "front",
};
// A backgrounded headless document can throttle requestAnimationFrame forever.
// Readiness is established by renderer/DOM state; this only settles its screenshot.
const pause = (page) => page.waitForTimeout(180);
const ready = async (page) => {
  await page
    .locator(".fl-viewer[data-rendered=true]")
    .waitFor({ timeout: 60000 });
  await page
    .locator(".fl-loading")
    .waitFor({ state: "hidden", timeout: 60000 });
  assert.equal(await page.locator(".fl-viewer-error").count(), 0);
  await pause(page);
};
const stage = (page) => page.locator(".fs-stage");
const depth = async (page, value) =>
  assert.equal(await stage(page).getAttribute("data-depth"), String(value));
const canvasHash = async (page) =>
  hash(await page.locator(".fl-viewer canvas").screenshot());
const microReady = async (page, branch, level) => {
  const panel = page.locator(
    `[data-micro-branch="${branch}"][data-micro-depth="${level}"]`,
  );
  await panel.waitFor({ timeout: 30000 });
  assert(await panel.locator("svg").isVisible());
  await pause(page);
  return panel;
};
const close = async (page) => {
  const dialog = page.getByRole("dialog");
  if (await dialog.count())
    await dialog
      .getByRole("button", { name: "Close / Cerrar", exact: true })
      .click();
};
const photo = async (page, name) => {
  const filename = name.replace(/[^a-z0-9_-]/gi, "-") + ".png";
  const bytes = await page.screenshot({
    path: resolve(output, filename),
    fullPage: page.viewportSize().width <= 760,
  });
  report.screenshots.push({
    file: filename,
    bytes: bytes.length,
    sha256: hash(bytes),
  });
};
const open = async (page, exploration) => {
  const url = new URL(base);
  // Historical scenarios explicitly reopen their preserved museum-collection
  // state. Separate default-entry scenarios exercise the new anatomy-first app.
  exploration ??= { view: defaults, depth: 0, branch: "petal" };
  if (exploration)
    url.search = new URLSearchParams({
      explore: JSON.stringify(exploration),
    }).toString();
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator(".fs-app").waitFor({ timeout: 30000 });
  if (!exploration || exploration.depth < 2) await ready(page);
};
const check = (name, detail = {}) => {
  report.checks.push({ name, pass: true, detail });
  console.log("PASS " + name);
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
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
    expectedFaults: options.fault || null,
  };
  report.scenarios.push(record);
  browserServer = await chromium.launchServer({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  browser = await chromium.connect(browserServer.wsEndpoint());
  report.browser = browser.version();
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 960 },
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: options.reducedMotion || "no-preference",
  });
  await context.addInitScript(() => {
    localStorage.setItem("caos.lang", "en");
    localStorage.setItem("caos.theme", "light");
    localStorage.setItem("floraria.studio.theme", "light");
  });
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage();
  await page.bringToFront();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) =>
    record.errors.push({ kind: "pageerror", message: error.message }),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      record.errors.push({ kind: "console", message: message.text() });
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      record.failedResponses.push({
        url: response.url(),
        status: response.status(),
      });
  });
  try {
    writeFileSync(
      resolve(output, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    await run(page, context, record);
    assert.equal(
      record.errors.filter((x) => x.kind === "pageerror").length,
      0,
      "Uncaught page errors",
    );
    if (!options.fault) {
      assert.deepEqual(record.errors, [], "Unexpected browser console errors");
      assert.deepEqual(
        record.failedResponses,
        [],
        "Unexpected failed HTTP responses",
      );
    }
    record.pass = true;
  } catch (error) {
    record.failure = String(error.stack || error);
    console.error("FAIL " + name + ": " + error.message);
    try {
      await photo(page, "failure-" + name);
    } catch {
      /* Preserve original failure. */
    }
  } finally {
    record.finishedAt = new Date().toISOString();
    // This process belongs solely to this scenario. Terminate the disposable
    // software-GPU server after receipts; driver teardown must not stall QA.
    writeFileSync(
      resolve(output, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log("CLEANUP " + name);
    // Disconnect the protocol client before shutting down its server. Otherwise
    // some Windows software-GPU runs wait for client disposal during kill().
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    const serverProcess = browserServer.process();
    const alive = () => {
      try {
        process.kill(serverProcess.pid, 0);
        return true;
      } catch (error) {
        if (error.code === "ESRCH") return false;
        throw error;
      }
    };
    const ended = await Promise.race([
      browserServer
        .kill()
        .then(() => true)
        .catch(() => false),
      new Promise((resolve) => setTimeout(() => resolve(false), 4000)),
    ]);
    if (!ended && alive() && process.platform === "win32") {
      // This exact PID was returned by the server created above; never enumerate
      // or terminate unrelated browsers. The disposable scenario owns its tree.
      try {
        execFileSync(
          "taskkill",
          ["/PID", String(serverProcess.pid), "/T", "/F"],
          { stdio: "pipe", timeout: 5000 },
        );
      } catch (error) {
        if (alive()) throw error;
      }
    }
    if (!ended && alive() && process.platform !== "win32")
      serverProcess.kill("SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 100));
    record.cleanup = { processExited: !alive(), protocolAcknowledged: ended };
    assert(
      record.cleanup.processExited,
      "The owned browser process must terminate",
    );
    console.log("FINISHED " + name);
  }
}

await scenario("collection-and-comparison", async (page) => {
  await open(page);
  await depth(page, 0);
  assert.equal(
    await page.locator(".fs-specimen").count(),
    catalog.specimens.length,
  );
  for (const specimen of catalog.specimens) {
    await page
      .locator(".fs-specimen")
      .filter({ hasText: specimen.scientificName.split(" ")[0] })
      .click();
    await ready(page);
    await page
      .getByRole("button", { name: "View controls", exact: true })
      .click();
    const quality = page
      .getByRole("dialog")
      .getByLabel("Fine surface detail", { exact: false });
    await quality.uncheck();
    await close(page);
    await ready(page);
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      specimen.preview.triangles,
    );
    await page
      .getByRole("button", { name: "View controls", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Fine surface detail", { exact: false })
      .check();
    await close(page);
    await ready(page);
    assert.equal(
      Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
      specimen.detail.triangles,
    );
    check("Actual scan fidelity: " + specimen.id, {
      preview: specimen.preview.triangles,
      detail: specimen.detail.triangles,
    });
  }
  const broken = await page
    .locator(".fs-specimen img")
    .evaluateAll((images) =>
      images
        .filter((x) => !x.complete || x.naturalWidth === 0)
        .map((x) => x.src),
    );
  assert.deepEqual(broken, [], "Every collection thumbnail must load");
  await page
    .getByLabel("Compare specimen", { exact: true })
    .selectOption("phalaenopsis");
  await ready(page);
  const expected = catalog.specimens
    .filter((s) => ["vanda", "phalaenopsis"].includes(s.id))
    .reduce((n, s) => n + s.detail.triangles, 0);
  assert.equal(
    Number(await page.locator(".fl-viewer").getAttribute("data-triangles")),
    expected,
  );
  assert.match(
    await page.locator(".fs-context-body").innerText(),
    /Compare form, not physical size/,
  );
  await photo(page, "01-compared-scans");
  check("Meaningful scanned comparison and scale limitation", {
    triangles: expected,
  });
});

await scenario("semantic-default-pathways", async (page) => {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await ready(page);
  await depth(page, 1);
  assert.equal(await page.locator("[data-pathway]").count(), 4);
  assert.equal(await page.locator(".fs-specimen").count(), 0);
  await photo(page, "semantic-default-anatomy");
  check(
    "Default entry is a selectable anatomical flower with four purposeful routes",
  );
  for (const branch of ["petal", "anther", "ovary", "stem"]) {
    await page.locator(`[data-pathway="${branch}"]`).click();
    await ready(page);
    await depth(page, 1);
    const hashes = [];
    const titles = [];
    for (const [index, level] of ["tissue", "cell", "organelle"].entries()) {
      await page.locator(".fs-go-inside").click();
      const panel = await microReady(page, branch, level);
      await depth(page, index + 2);
      hashes.push(hash(await panel.locator(":scope > svg").screenshot()));
      titles.push(await page.locator(".fs-stage-heading h1").innerText());
      await photo(page, `semantic-${branch}-${level}`);
    }
    assert.equal(
      new Set(hashes).size,
      3,
      "Each inward transition replaces the actual rendered structure",
    );
    assert.equal(
      new Set(titles).size,
      3,
      "Each inward transition changes the named subject",
    );
    if (["petal", "anther"].includes(branch)) {
      await page.getByRole("button", { name: /^Inspect component: / }).click();
      assert.equal(
        await page.locator(".fs-breadcrumb [aria-current=location]").count(),
        1,
      );
      assert((await page.locator(".fs-breadcrumb .fs-ancestor").count()) >= 4);
    }
    await page
      .getByRole("slider", { name: "Structure depth", exact: true })
      .fill("2");
    await microReady(page, branch, "tissue");
    await page
      .getByRole("button", { name: "Back one detail level", exact: true })
      .click();
    await ready(page);
    await depth(page, 1);
    check("Semantic inward, component ancestry, slider and back: " + branch, {
      distinctViews: hashes.length,
      subjects: titles,
    });
  }
});

await scenario("semantic-structure-and-process-workbench", async (page) => {
  let inspected = 0;
  for (const branch of ["petal", "anther", "ovary", "stem"]) {
    await open(page, {
      view: { ...defaults, mode: "anatomy", selected: branch },
      depth: 4,
      branch,
    });
    const panel = await microReady(page, branch, "organelle");
    const imageHashes = [];
    for (const node of micro.nodes.filter(
      (node) => node.branch === branch && node.depth === "organelle",
    )) {
      await panel
        .getByRole("group", { name: "Structures in this view", exact: true })
        .getByRole("button", { name: node.label.en, exact: true })
        .click();
      await panel
        .getByRole("button", { name: "Inspect structure", exact: true })
        .click();
      await panel.locator(`[data-study-node="${node.id}"]`).waitFor();
      await panel
        .getByRole("slider", { name: "Reveal the interior", exact: true })
        .fill("0");
      const closed = hash(await panel.locator(":scope > svg").screenshot());
      await panel
        .getByRole("slider", { name: "Reveal the interior", exact: true })
        .fill("1");
      const revealed = hash(await panel.locator(":scope > svg").screenshot());
      assert.notEqual(
        closed,
        revealed,
        node.id + " reveal changes the drawing",
      );
      imageHashes.push(revealed);
      inspected++;
    }
    assert.equal(
      new Set(imageHashes).size,
      imageHashes.length,
      branch + " subcellular selections have distinct drawings",
    );
    await photo(page, "semantic-study-" + branch);
    await panel
      .getByRole("button", { name: "See the context", exact: true })
      .click();
    assert.equal(await panel.locator("[data-study-node]").count(), 0);
    await panel
      .getByRole("button", { name: "Trace the function", exact: true })
      .click();
    const stages = panel.getByRole("group", {
      name: "Process stages",
      exact: true,
    });
    assert.equal(await stages.getByRole("button").count(), 4);
    for (let index = 0; index < 4; index++) {
      const button = stages.getByRole("button").nth(index);
      await button.click();
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      assert(
        (await panel.locator(".micro-process-board").innerText()).includes(
          micro.branches.find((b) => b.id === branch).stages[index].body.en,
        ),
      );
    }
    await layout(page, "semantic-process-" + branch);
    check(
      "Distinct subcellular cutaways, working reveal and four process stages: " +
        branch,
      { structures: imageHashes.length },
    );
  }
  check(
    "Every authored subcellular structure has an inspected distinct cutaway",
    { inspected },
  );
});

await scenario(
  "semantic-phone-flow",
  async (page) => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    await ready(page);
    await layout(page, "semantic-phone-default");
    await photo(page, "semantic-phone-default");
    await page.locator("[data-pathway=petal]").click();
    for (const level of ["tissue", "cell", "organelle"]) {
      await page.locator(".fs-go-inside").click();
      await microReady(page, "petal", level);
      await layout(page, "semantic-phone-" + level);
      await photo(page, "semantic-phone-" + level);
    }
    await page
      .getByRole("button", {
        name: "Inspect component: Tonoplast",
        exact: true,
      })
      .click();
    await page.locator(".fs-lang").click();
    await page
      .getByRole("button", { name: "Cambiar tema", exact: true })
      .click();
    await layout(page, "semantic-phone-component-es-dark");
    await photo(page, "semantic-phone-component-es-dark");
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    await page
      .getByRole("button", { name: "Volver un nivel de detalle", exact: true })
      .click();
    await microReady(page, "petal", "cell");
    check(
      "Phone uses the primary inward flow through distinct structures and same-level component, Spanish dark theme and return",
    );
  },
  { viewport: { width: 390, height: 844 } },
);

await scenario("anatomy-controls-and-camera", async (page) => {
  await open(page);
  await page
    .getByRole("button", { name: "Explore its anatomy", exact: false })
    .click();
  await ready(page);
  await depth(page, 1);
  assert(
    await page
      .locator(".fs-parts")
      .getByRole("button", {
        name: catalog.structures.find((s) => s.id === "lip").label.en,
        exact: true,
      })
      .isVisible(),
  );
  assert.equal(
    await page
      .locator(".fs-parts")
      .getByRole("button", { name: "Anther", exact: true })
      .count(),
    0,
  );
  check("Observed specimen leads into explicitly identified orchid anatomy");
  await page
    .getByRole("button", { name: "General flower", exact: true })
    .click();
  await ready(page);
  await page.getByLabel("Find an organ", { exact: true }).fill("ovary");
  assert.equal(await page.locator(".fs-parts button").count(), 1);
  await page
    .locator(".fs-parts")
    .getByRole("button", { name: "Ovary", exact: true })
    .click();
  await page.getByLabel("Find an organ", { exact: true }).fill("");
  await ready(page);
  const assembled = await canvasHash(page);
  await page.getByRole("button", { name: "Isolate part", exact: true }).click();
  await ready(page);
  const isolated = await canvasHash(page);
  assert.notEqual(isolated, assembled);
  await page
    .getByRole("button", { name: "Restore flower", exact: true })
    .click();
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await ready(page);
  const hidden = await canvasHash(page);
  await page.getByRole("button", { name: "Show", exact: true }).click();
  await ready(page);
  assert.notEqual(await canvasHash(page), hidden);
  await page
    .locator(".fs-context")
    .getByLabel("Separate organs", { exact: true })
    .fill("1");
  await ready(page);
  assert.notEqual(await canvasHash(page), assembled);
  await photo(page, "02-decomposed-anatomy");
  check(
    "Organ search, named selection, isolation, visibility and disassembly change the real stage",
  );
  await page
    .getByRole("button", { name: "View controls", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Separate organs", { exact: true })
    .fill("0");
  await page.getByLabel("Section through the model", { exact: true }).check();
  for (const axis of ["x", "y", "z"]) {
    await page.getByLabel("Section axis", { exact: false }).selectOption(axis);
    await page.getByLabel("Section position", { exact: true }).fill("0");
    await close(page);
    await ready(page);
    assert.notEqual(await canvasHash(page), assembled);
    await page
      .getByRole("button", { name: "View controls", exact: true })
      .click();
  }
  await page.getByLabel("Section through the model", { exact: true }).uncheck();
  await page.getByLabel("Open the flower", { exact: true }).fill("0");
  await close(page);
  await ready(page);
  const bud = await canvasHash(page);
  await page
    .getByRole("button", { name: "View controls", exact: true })
    .click();
  await page.getByLabel("Open the flower", { exact: true }).fill("1");
  await close(page);
  await ready(page);
  assert.notEqual(await canvasHash(page), bud);
  check(
    "Three section axes and flower opening visibly transform teaching geometry",
  );
  const before = await canvasHash(page),
    selected = await page.locator(".fs-parts [aria-pressed=true]").innerText();
  const box = await page.locator(".fl-viewer canvas").boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.55, {
    steps: 12,
  });
  await page.mouse.up();
  await ready(page);
  assert.notEqual(await canvasHash(page), before);
  assert.equal(
    await page.locator(".fs-parts [aria-pressed=true]").innerText(),
    selected,
  );
  await page.locator(".fl-viewer").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await page.keyboard.press("Home");
  await ready(page);
  await page.getByRole("button", { name: "Focus view", exact: true }).click();
  assert(await page.locator(".fs-app.fs-focus").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".fs-app.fs-focus").count(), 0);
  check(
    "Pointer orbit preserves selection; keyboard controls and focus return work",
  );
});

const branches = ["petal", "anther", "ovary", "stem"];
for (const branch of branches)
  await scenario("connected-depth-" + branch, async (page) => {
    await open(page);
    await page
      .getByRole("button", { name: "Explore its anatomy", exact: false })
      .click();
    await page
      .getByRole("button", { name: "General flower", exact: true })
      .click();
    await ready(page);
    const organ = catalog.structures.find((x) => x.id === branch);
    await page
      .locator(".fs-parts")
      .getByRole("button", { name: organ.label.en, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Explore related tissue", exact: true })
      .click();
    for (const [index, level] of ["tissue", "cell", "organelle"].entries()) {
      const panel = await microReady(page, branch, level);
      await depth(page, index + 2);
      assert.match(await panel.innerText(), /EDUCATIONAL ILLUSTRATION/);
      assert.match(await panel.innerText(), /Not to scale/);
      const nodes = micro.nodes.filter(
        (n) => n.branch === branch && n.depth === level,
      );
      const controls = panel.getByRole("group", {
        name: "Structures in this view",
        exact: true,
      });
      assert.equal(await controls.getByRole("button").count(), nodes.length);
      for (const node of nodes) {
        const button = controls.getByRole("button", {
          name: node.label.en,
          exact: true,
        });
        await button.focus();
        await page.keyboard.press("Enter");
        assert.equal(await button.getAttribute("aria-pressed"), "true");
        assert(
          (await panel.locator("[aria-live=polite]").innerText()).includes(
            node.detail.en,
          ),
        );
      }
      await panel
        .getByText("Sources and model limits", { exact: true })
        .click();
      assert((await panel.locator("details a").count()) > 0);
      await panel
        .getByText("Sources and model limits", { exact: true })
        .click();
      const before = hash(await panel.locator("svg").screenshot());
      await page
        .locator(".fs-context")
        .getByLabel("Explore the process", { exact: true })
        .fill("1");
      await pause(page);
      const after = hash(await panel.locator("svg").screenshot());
      // Some subcellular scenes intentionally show static pre-fusion structure.
      if (!(branch === "ovary" && level === "organelle"))
        assert.notEqual(
          after,
          before,
          branch + "/" + level + " process must affect its diagram",
        );
      assert(
        (await panel.innerText()).includes(
          micro.branches.find((x) => x.id === branch).stages[3].body.en,
        ),
      );
      await photo(page, "03-" + branch + "-" + level);
      check("Sourced connected teaching: " + branch + "/" + level, {
        nodes: nodes.length,
        diagramChanged: before !== after,
      });
      if (index < 2)
        await page
          .getByRole("button", { name: "Continue inside", exact: true })
          .click();
    }
    await page
      .locator(".fs-breadcrumb")
      .getByRole("button", { name: "Flower anatomy", exact: true })
      .click();
    await ready(page);
    await depth(page, 1);
    assert.equal(
      await page
        .locator(".fs-parts")
        .getByRole("button", { name: organ.label.en, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    check("Return from subcellular view preserves selected organ: " + branch);
  });

await scenario("all-guided-investigations", async (page) => {
  await open(page);
  let steps = 0;
  for (const journey of catalog.journeys) {
    await page
      .getByRole("button", { name: "Investigations", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button")
      .filter({
        has: page.getByRole("heading", { name: journey.title.en, exact: true }),
      })
      .click();
    for (const [index, step] of journey.steps.entries()) {
      await ready(page);
      const player = page.locator(".fs-journey-player");
      assert((await player.innerText()).includes(step.title.en));
      assert((await player.innerText()).includes(step.body.en));
      await depth(page, step.view.mode === "specimen" ? 0 : 1);
      if (step.view.selected) {
        const organ = catalog.structures.find(
          (x) => x.id === step.view.selected,
        );
        assert.equal(
          await page
            .locator(".fs-parts")
            .getByRole("button", { name: organ.label.en, exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
      }
      assert.equal(
        await player
          .getByRole("button", { name: "Previous step", exact: true })
          .isDisabled(),
        index === 0,
      );
      assert.equal(
        await player
          .getByRole("button", { name: "Next step", exact: true })
          .isDisabled(),
        index === journey.steps.length - 1,
      );
      steps++;
      if (index < journey.steps.length - 1)
        await player
          .getByRole("button", { name: "Next step", exact: true })
          .click();
    }
    await page
      .getByRole("button", { name: "End investigation", exact: true })
      .click();
    check("Complete guided investigation: " + journey.id, {
      steps: journey.steps.length,
    });
  }
  assert.equal(
    steps,
    catalog.journeys.reduce((n, j) => n + j.steps.length, 0),
  );
  check("All catalog-driven investigation steps executed", {
    journeys: catalog.journeys.length,
    steps,
  });
});

await scenario("canvas-picking-and-image-export", async (page) => {
  await open(page, {
    view: { ...defaults, mode: "anatomy", selected: "" },
    depth: 1,
  });
  assert.equal(await page.locator(".fs-parts [aria-pressed=true]").count(), 0);
  const box = await page.locator(".fl-viewer canvas").boundingBox();
  for (const [x, y] of [
    [0.5, 0.45],
    [0.45, 0.5],
    [0.55, 0.5],
    [0.5, 0.6],
    [0.4, 0.4],
    [0.6, 0.4],
    [0.5, 0.3],
  ]) {
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    await pause(page);
    if (await page.locator(".fs-parts [aria-pressed=true]").count()) break;
  }
  assert.equal(await page.locator(".fs-parts [aria-pressed=true]").count(), 1);
  const selected = await page
    .locator(".fs-parts [aria-pressed=true]")
    .innerText();
  assert(
    (await page.locator(".fs-context-body").innerText()).includes(selected),
  );
  await page
    .getByRole("button", { name: "Focus selection", exact: true })
    .click();
  await ready(page);
  await page
    .getByRole("button", { name: "Field notebook", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export current image", exact: true })
    .click();
  const image = await pending,
    bytes = await downloaded(image, "export-observation.png");
  assert.match(image.suggestedFilename(), /\.png$/);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert(bytes.length > 10000);
  check(
    "Real canvas ray picking updates contextual organ selection and exports a valid PNG",
    { selected, bytes: bytes.length },
  );
});

await scenario("microscopic-connected-structure-drill", async (page) => {
  let edges = 0;
  for (const node of micro.nodes.filter(
    (n) => n.depth !== "organ" && n.children.length,
  )) {
    for (const childId of node.children) {
      const child = micro.nodes.find((n) => n.id === childId);
      await open(page, {
        view: { ...defaults, mode: "anatomy", selected: node.branch },
        depth: { tissue: 2, cell: 3, organelle: 4 }[node.depth],
        branch: node.branch,
        microSelected: node.id,
      });
      const panel = await microReady(page, node.branch, node.depth);
      const drill = panel
        .getByRole("button")
        .filter({ hasText: "Explore: " + child.label.en });
      assert.equal(
        await drill.count(),
        1,
        node.id + " has a reachable " + child.id + " child",
      );
      await drill.click();
      const next = await microReady(page, node.branch, child.depth);
      await depth(page, { tissue: 2, cell: 3, organelle: 4 }[child.depth]);
      assert.equal(
        await next
          .getByRole("group", { name: "Structures in this view", exact: true })
          .getByRole("button", { name: child.label.en, exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert(
        (await next.locator("[aria-live=polite]").innerText()).includes(
          child.detail.en,
        ),
      );
      edges++;
    }
  }
  check(
    "Every catalogued microscopic child opens its actual level and explanation",
    { edges },
  );
  await open(page, {
    view: { ...defaults, mode: "anatomy", selected: "petal" },
    depth: 4,
    branch: "petal",
    microSelected: "petal-wall",
  });
  const panel = await microReady(page, "petal", "organelle");
  const target = panel.locator('[data-micro-node="petal-nucleus"]');
  await target.focus();
  await page.keyboard.press("Enter");
  assert.equal(await target.getAttribute("aria-pressed"), "true");
  assert(
    await target.evaluate((e) => document.activeElement === e),
    "SVG keyboard selection preserves focus",
  );
  check(
    "Named SVG structures support direct keyboard selection without losing focus",
  );
});

await scenario("notebook-legacy-and-sharing", async (page) => {
  await open(page);
  const legacy = {
    product: "FLORARIA",
    schemaVersion: 1,
    view: {
      ...defaults,
      mode: "anatomy",
      selected: "ovary",
      explode: 0.72,
      cutEnabled: true,
      cut: 0.1,
    },
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "original-v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await ready(page);
  await depth(page, 1);
  assert.equal(
    await page
      .locator(".fs-parts")
      .getByRole("button", { name: "Ovary", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page
      .locator(".fs-context")
      .getByLabel("Separate organs", { exact: true })
      .inputValue(),
    "0.72",
  );
  check("Original schemaVersion 1 file restores real organ exploration");
  await page
    .getByRole("button", { name: "Explore related tissue", exact: true })
    .click();
  await microReady(page, "ovary", "tissue");
  await page
    .getByRole("button", { name: "Continue inside", exact: true })
    .click();
  const panel = await microReady(page, "ovary", "cell");
  const egg = micro.nodes.find((n) => n.id === "ovary-egg");
  await panel
    .getByRole("group", { name: "Structures in this view", exact: true })
    .getByRole("button", { name: egg.label.en, exact: true })
    .click();
  const note = "Private QA observation: compare egg cell and central cell.";
  await page
    .getByRole("button", { name: "Field notebook", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "What did you notice?", exact: true })
    .fill(note);
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("floraria.notebook.v2")),
  );
  assert.equal(stored.schemaVersion, 2);
  assert.equal(stored.exploration.note, note);
  assert.equal(stored.exploration.depth, 3);
  assert.equal(stored.exploration.microSelected, "ovary-egg");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export exploration", exact: true })
    .click();
  const download = await downloadPromise;
  const exported = JSON.parse(
    (await downloaded(download, "export-exploration.json")).toString("utf8"),
  );
  assert.deepEqual(exported, stored);
  await page
    .getByRole("button", { name: "Copy share link", exact: true })
    .click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  const sharedUrl = new URL(shared);
  assert.equal(sharedUrl.origin, new URL(base).origin);
  assert.equal(
    sharedUrl.pathname.replace(/\/$/, ""),
    new URL(base).pathname.replace(/\/$/, ""),
  );
  const sharedState = JSON.parse(sharedUrl.searchParams.get("explore"));
  assert.equal(sharedState.note, "");
  assert(!shared.includes("Private"));
  assert.equal(sharedState.microSelected, "ovary-egg");
  assert.equal(sharedState.depth, 3);
  await page.goto(shared, { waitUntil: "domcontentloaded", timeout: 60000 });
  await microReady(page, "ovary", "cell");
  await page
    .getByRole("button", { name: "Field notebook", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "What did you notice?", exact: true })
      .inputValue(),
    "",
  );
  await page
    .getByRole("button", { name: "Restore saved view", exact: true })
    .click();
  await microReady(page, "ovary", "cell");
  await page
    .getByRole("button", { name: "Field notebook", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "What did you notice?", exact: true })
      .inputValue(),
    note,
  );
  const imagePromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export current image", exact: true })
    .click();
  const image = await imagePromise;
  assert.match(image.suggestedFilename(), /\.svg$/);
  const svg = (
    await downloaded(image, "export-micro-observation.svg")
  ).toString("utf8");
  assert.match(svg, /not a microscope image or measured specimen/);
  assert.match(svg, /<svg/);
  await close(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "new-v2.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await microReady(page, "ovary", "cell");
  await page.locator("input[type=file]").setInputFiles({
    name: "wrong.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"product":"other","schemaVersion":2}'),
  });
  await page
    .getByRole("status")
    .filter({ hasText: "Invalid exploration" })
    .waitFor();
  await depth(page, 3);
  check(
    "Version 2 file/device round trips, micro-selection and private notes; public share excludes notes",
  );
  check(
    "Microscopic image export carries model provenance; malformed file preserves the existing view",
  );
  const other = await browser.newContext();
  const anonymous = await other.newPage();
  await anonymous.bringToFront();
  await anonymous.goto(shared, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await microReady(anonymous, "ovary", "cell");
  assert.equal(
    await anonymous.evaluate(() =>
      localStorage.getItem("floraria.notebook.v2"),
    ),
    null,
  );
  await other.close();
  check("Shared exploration works without the sender notebook or account");
});

await scenario("lifecycle-and-motion", async (page) => {
  await open(page, {
    view: { ...defaults, mode: "anatomy", selected: "pollen" },
    depth: 1,
  });
  await page
    .getByRole("button", { name: "Follow pollen to seed", exact: true })
    .click();
  const digests = [];
  for (const value of [0, 0.25, 0.5, 0.7, 1]) {
    await page
      .getByLabel("Reproductive sequence", { exact: true })
      .fill(String(value));
    await ready(page);
    digests.push(await canvasHash(page));
  }
  assert.equal(new Set(digests).size, 5);
  assert.match(
    await page.locator(".fs-context").innerText(),
    /conceptual sequence, not a growth-rate/,
  );
  await page.getByRole("button", { name: "Play motion", exact: true }).click();
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  const stopped = await page
    .getByLabel("Reproductive sequence", { exact: true })
    .inputValue();
  assert(Number(stopped) > 0 && Number(stopped) < 1);
  await page.waitForTimeout(250);
  assert.equal(
    await page
      .getByLabel("Reproductive sequence", { exact: true })
      .inputValue(),
    stopped,
  );
  check(
    "Five distinct schematic reproductive states; explicit replay and pause",
  );
});

async function languageTheme(page, lang, theme) {
  if ((await page.locator("html").getAttribute("lang")) !== lang)
    await page.locator(".fs-lang").click();
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  if ((await page.locator("html").getAttribute("data-theme")) !== theme)
    await page
      .getByRole("button", {
        name: lang === "en" ? "Change colour theme" : "Cambiar tema",
        exact: true,
      })
      .click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
}
async function verifyGuide(page) {
  const guide = page.locator(".fl-guides");
  const visited = [];
  async function visit(scope, path = []) {
    const lists = scope.getByRole("tablist");
    if (await lists.count()) {
      const tabs = lists.first().getByRole("tab");
      const labels = await tabs.allTextContents();
      for (const label of labels) {
        await lists
          .first()
          .getByRole("tab", { name: label, exact: true })
          .click();
        const panel = scope.getByRole("tabpanel", { name: label, exact: true });
        await panel.waitFor();
        await visit(panel, [...path, label]);
      }
    } else {
      assert(
        await scope.getByRole("heading").count(),
        "Guide leaf has a meaningful heading",
      );
      assert(
        (await scope.locator("p").allTextContents()).some((text) =>
          /[.!?]/.test(text),
        ),
        "Guide leaf contains explanatory prose",
      );
      assert(
        await guide.locator('a[href^="http"]').count(),
        "Guide evidence is source-linked",
      );
      visited.push(
        path.join(" / ") ||
          (await guide.getByRole("heading", { level: 1 }).innerText()),
      );
    }
  }
  await visit(guide);
  return visited;
}
async function layout(page, name) {
  const measured = await page.evaluate(() => {
    const box = (selector) => {
      const e = document.querySelector(selector);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        bottom: b.bottom,
        right: b.right,
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      page: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      stage: box(".fs-stage"),
      diagram: box("[data-micro-depth] svg"),
      depthNavigation: box(".fs-depth-strip"),
      dialog: box("dialog[open]"),
    };
  });
  report.layouts.push({ name, ...measured });
  assert(
    measured.page.width <= measured.viewport.width + 2,
    name + ": document overflows horizontally",
  );
  if (measured.viewport.width > 760)
    assert(
      measured.page.height <= measured.viewport.height + 2,
      name + ": desktop instrument overflows vertically",
    );
  assert(
    measured.stage.width >= 220 && measured.stage.height >= 180,
    name + ": unusable spatial stage",
  );
  if (measured.diagram)
    assert(
      measured.diagram.width >= 200 &&
        measured.diagram.height >= 110 &&
        measured.diagram.x >= measured.stage.x - 2 &&
        measured.diagram.y >= measured.stage.y - 2 &&
        measured.diagram.right <= measured.stage.right + 2 &&
        measured.diagram.bottom <= measured.stage.bottom + 2,
      name + ": microscopic diagram collapsed or was clipped by its stage",
    );
  if (measured.dialog)
    assert(
      measured.dialog.x >= -2 &&
        measured.dialog.y >= -2 &&
        measured.dialog.right <= measured.viewport.width + 2 &&
        measured.dialog.bottom <= measured.viewport.height + 2,
      name + ": dialog leaves viewport",
    );
  await photo(page, name);
}
for (const [size, viewport] of [
  ["desktop", { width: 1440, height: 960 }],
  ["phone", { width: 390, height: 844 }],
]) {
  await scenario(
    "language-theme-depth-matrix-" + size,
    async (page) => {
      for (const lang of ["en", "es"])
        for (const theme of ["light", "dark"]) {
          for (const branch of branches)
            for (const [i, level] of [
              "tissue",
              "cell",
              "organelle",
            ].entries()) {
              await open(page, {
                view: { ...defaults, mode: "anatomy", selected: branch },
                depth: i + 2,
                branch,
                progress: 0.65,
              });
              await languageTheme(page, lang, theme);
              const panel = await microReady(page, branch, level);
              const nodes = micro.nodes.filter(
                (x) => x.branch === branch && x.depth === level,
              );
              const controls = panel.getByRole("group", {
                name:
                  lang === "en"
                    ? "Structures in this view"
                    : "Estructuras de esta vista",
                exact: true,
              });
              for (const node of nodes)
                assert(
                  await controls
                    .getByRole("button", {
                      name: node.label[lang],
                      exact: true,
                    })
                    .count(),
                );
              await layout(
                page,
                `matrix-${size}-${lang}-${theme}-${branch}-${level}`,
              );
            }
          await open(page);
          await languageTheme(page, lang, theme);
          await layout(page, `matrix-${size}-${lang}-${theme}-specimen`);
          await page
            .locator(".fs-masthead nav")
            .getByRole("button")
            .filter({ hasText: lang === "en" ? "Field guide" : "Gu\u00eda" })
            .click();
          for (let i = 0; i < 4; i++) {
            await page.locator(".fs-library-nav button").nth(i).click();
            const leaves = await verifyGuide(page);
            report.guideLeaves ??= [];
            report.guideLeaves.push({ size, lang, theme, section: i, leaves });
            await layout(page, `matrix-${size}-${lang}-${theme}-guide-${i}`);
            await page.locator(".fs-dialog-body").evaluate((e) => {
              e.scrollTop = e.scrollHeight;
            });
          }
          await close(page);
          check(
            "Rendered language/theme matrix: " +
              size +
              "/" +
              lang +
              "/" +
              theme,
            { microscopicViews: 12, specimen: 1, guideSections: 4 },
          );
        }
    },
    { viewport },
  );
}

await scenario(
  "reduced-motion-and-landscape",
  async (page) => {
    await open(page);
    assert(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Pause motion", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Explore its anatomy", exact: false })
      .click();
    await ready(page);
    await page.locator(".fl-viewer").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Home");
    await page
      .getByRole("button", { name: "View controls", exact: true })
      .click();
    await layout(page, "landscape-controls-reduced-motion");
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await layout(page, "landscape-anatomy-reduced-motion");
    check(
      "Reduced-motion starts static; landscape controls and Escape remain usable",
    );
  },
  { viewport: { width: 844, height: 390 }, reducedMotion: "reduce" },
);

await scenario(
  "missing-scan-recovery",
  async (page) => {
    await page.route("**/assets/*.glb", (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Intentional test: unavailable scan",
      }),
    );
    await page.goto(base);
    await page.locator(".fl-viewer-error").waitFor({ timeout: 60000 });
    await photo(page, "fault-missing-scan");
    await page.unroute("**/assets/*.glb");
    await page.locator(".fl-viewer-error").getByRole("button").first().click();
    await ready(page);
    check("Unavailable real scan reports failure and retries successfully");
  },
  { fault: "Only mesh requests deliberately return HTTP 503 before retry." },
);

await scenario(
  "micro-integrity-recovery",
  async (page) => {
    await page.route("**/data/micro-atlas.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await open(page, {
      view: { ...defaults, mode: "anatomy", selected: "petal" },
      depth: 2,
      branch: "petal",
    });
    const error = page
      .getByRole("alert")
      .filter({ hasText: "microscopic atlas could not be verified" });
    await error.waitFor({ timeout: 30000 });
    await photo(page, "fault-micro-integrity");
    await page.unroute("**/data/micro-atlas.json");
    await error.getByRole("button", { name: "Retry", exact: true }).click();
    await microReady(page, "petal", "tissue");
    check(
      "Corrupt microscopic artifact rejected before display; explicit retry recovers",
    );
  },
  {
    fault:
      "Microscopic artifact alone is replaced with corrupt JSON until retry.",
  },
);

await scenario(
  "unavailable-webgl-educational-fallback",
  async (page) => {
    await page.goto(base);
    await page.locator(".fl-viewer-error").waitFor({ timeout: 30000 });
    assert((await page.locator(".fl-viewer-error").innerText()).length > 60);
    await photo(page, "fault-webgl");
    await page.locator(".fs-question").getByRole("button").first().click();
    await microReady(page, "petal", "tissue");
    assert((await page.locator(".micro-scroll").innerText()).length > 200);
    check(
      "Unavailable WebGL exposes guidance and retains sourced microscopic teaching",
    );
  },
  {
    fault:
      "WebGL contexts deliberately unavailable; SVG and other browser APIs remain real.",
    init: () => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (String(type).includes("webgl")) return null;
        return native.call(this, type, ...args);
      };
    },
  },
);

await scenario("pages-direct-routes-and-policy", async (page) => {
  const metadata = await page.request.get(new URL("release.json", base).href);
  if (metadata.ok()) {
    try {
      report.targetRelease = await metadata.json();
    } catch {
      report.targetRelease = null;
    }
  }
  const observed = [];
  for (const route of [
    "",
    "introduction",
    "methodology",
    "implementation",
    "experiments",
    "benchmark",
  ]) {
    const response = await page.goto(new URL(route, base).href, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    assert.equal(response.status(), 200);
    await page.locator(".fs-app").waitFor();
    await ready(page);
    if (route === "experiments")
      assert.equal(
        await page.locator(".fs-journeys > button").count(),
        catalog.journeys.length,
      );
    else if (route) {
      await page.locator(".fl-guides").waitFor();
      assert(
        await page
          .locator(".fl-guides")
          .getByRole("heading", { level: 1 })
          .count(),
      );
    }
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .evaluateAll((nodes) => nodes[0]?.getAttribute("content") ?? null);
    observed.push({ route: route || "/", url: page.url(), policy });
    if (route) {
      await close(page);
      assert.equal(await page.getByRole("dialog").count(), 0);
    }
  }
  report.directRoutes = observed;
  check(
    "Direct legacy paths restore their intended studio reader or investigation and return cleanly",
    { routes: observed.length, cspObserved: observed.every((x) => !!x.policy) },
  );
});

report.finishedAt = new Date().toISOString();
report.pass =
  report.scenarios.length > 0 && report.scenarios.every((x) => x.pass);
report.counts = {
  checks: report.checks.length,
  scenarios: report.scenarios.length,
  passedScenarios: report.scenarios.filter((x) => x.pass).length,
  screenshots: report.screenshots.length,
  layouts: report.layouts.length,
};
writeFileSync(
  resolve(output, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
// Every owned browser PID has been verified terminated. Flush the receipt line
// before exit, including on Windows where disconnected protocol handles linger.
process.stdout.write(
  JSON.stringify({
    pass: report.pass,
    ...report.counts,
    report: resolve(output, "report.json"),
  }) + "\n",
  () => process.exit(report.pass ? 0 : 1),
);
