import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const base =
  process.env.FLORARIA_QA_URL ||
  process.env.FLORARIA_URL ||
  "http://127.0.0.1:4174";
const out = resolve("../build/qa/spatial");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [name, options] of [
    [
      "desktop",
      { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    ],
    [
      "phone",
      { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    ],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(message.text());
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        Number(document.querySelector(".spatial-canvas")?.dataset.triangles) >
        1000,
      null,
      { timeout: 10000 },
    );
    await page.screenshot({ path: resolve(out, `${name}-plant.png`) });
    const initial = await page.locator(".spatial-canvas").evaluate((node) => ({
      triangles: Number(node.dataset.triangles),
      visible: node.dataset.visible,
      focus: node.dataset.focus,
    }));
    if (
      initial.triangles < 1000 ||
      initial.focus !== "overview" ||
      initial.visible.split(",").length !== 8
    )
      failures.push("initial whole plant is incomplete");
    const box = await page.locator(".spatial-canvas").boundingBox();
    let directPoint = null,
      directLabel = null;
    for (const y of [0.35, 0.49, 0.63, 0.78]) {
      if (directPoint) break;
      for (const x of [0.38, 0.46, 0.53, 0.62]) {
        await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
        await page.waitForTimeout(120);
        const label = (await page.locator(".spatial-hover").innerText()).trim();
        if (label && !/aim at|apunta a/i.test(label)) {
          directPoint = { x, y };
          directLabel = label;
          break;
        }
      }
    }
    if (!directPoint) failures.push("no directly aimable 3D part");
    else {
      await page.mouse.move(
        box.x + box.width * directPoint.x,
        box.y + box.height * directPoint.y,
      );
      await page.mouse.wheel(0, -320);
      await page.waitForTimeout(220);
      if (
        (await page.locator(".spatial-canvas").getAttribute("data-focus")) ===
        "overview"
      )
        failures.push(
          "wheel on 3D part did not select it: " +
            (await page
              .locator(".spatial-canvas")
              .getAttribute("data-last-wheel-hit")),
        );
      await page
        .getByRole("button", {
          name: /Return to whole plant|Volver a la planta completa/,
        })
        .click();
      await page.waitForTimeout(200);
    }
    await page.mouse.move(box.x + 22, box.y + box.height * 0.56);
    await page.mouse.wheel(0, -480);
    await page.waitForTimeout(350);
    const general = await page.locator(".spatial-canvas").evaluate((node) => ({
      depth: Number(node.dataset.depth),
      focus: node.dataset.focus,
    }));
    if (general.focus !== "overview" || general.depth <= 0)
      failures.push("unfocused wheel did not unfold the spatial inventory");
    await page.screenshot({ path: resolve(out, `${name}-inventory.png`) });
    await page.getByRole("button", { name: /Root system|Raíces/ }).click();
    await page.waitForTimeout(350);
    const focused = await page.locator(".spatial-canvas").evaluate((node) => ({
      focus: node.dataset.focus,
      depth: Number(node.dataset.depth),
      triangles: Number(node.dataset.triangles),
    }));
    if (focused.focus !== "root" || focused.depth <= 0)
      failures.push("root did not become the focus");
    if (name === "phone") {
      const cdp = await context.newCDPSession(page);
      const x = box.x + box.width * 0.52,
        y = box.y + box.height * 0.57;
      const touches = (span) => [
        { x: x - span, y, id: 0 },
        { x: x + span, y, id: 1 },
      ];
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: touches(27),
      });
      for (const span of [37, 51, 67, 81])
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: touches(span),
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(250);
      if (
        Number(
          await page.locator(".spatial-canvas").getAttribute("data-depth"),
        ) <= focused.depth
      )
        failures.push("real browser touch pinch did not travel inward");
      await cdp.detach();
    }
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.52);
    await page.mouse.wheel(0, -520);
    await page.waitForTimeout(400);
    const inward = await page.locator(".spatial-canvas").evaluate((node) => ({
      depth: Number(node.dataset.depth),
      focus: node.dataset.focus,
      triangles: Number(node.dataset.triangles),
    }));
    if (
      inward.focus !== "root" ||
      inward.depth <= focused.depth ||
      inward.triangles === focused.triangles
    )
      failures.push("focused zoom did not change root anatomy");
    await page.screenshot({ path: resolve(out, `${name}-root-tissue.png`) });
    await page.getByRole("button", { name: /Leaf|Hoja/ }).click();
    for (let i = 0; i < 13; i++)
      await page.getByRole("button", { name: /Move inward|Acercar/ }).click();
    await page.waitForFunction(
      () =>
        Number(document.querySelector(".spatial-canvas")?.dataset.depth) > 3.2,
      null,
      { timeout: 10000 },
    );
    const leaf = await page.locator(".spatial-canvas").evaluate((node) => ({
      focus: node.dataset.focus,
      depth: Number(node.dataset.depth),
      triangles: Number(node.dataset.triangles),
    }));
    if (
      leaf.focus !== "leaf" ||
      leaf.depth < 2.5 ||
      !/Chloroplast|Cloroplast/.test(
        await page.locator(".spatial-context h2").innerText(),
      )
    )
      failures.push("leaf did not resolve its own cell interior");
    await page.screenshot({ path: resolve(out, `${name}-leaf-cell.png`) });
    await page.goto(base + "/?focus=leaf&scale=3.5&route=alternate", {
      waitUntil: "networkidle",
    });
    await page.locator(".spatial-canvas[data-route='alternate']").waitFor();
    const alternate = await page.locator(".spatial-context h2").innerText();
    if (!/Stomatal aperture|Apertura estomática/.test(alternate))
      failures.push("alternative guard-cell route was not restored");
    await page.screenshot({ path: resolve(out, `${name}-leaf-stoma.png`) });
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      vw: innerWidth,
      vh: innerHeight,
    }));
    if (
      dimensions.width > dimensions.vw + 2 ||
      dimensions.height > dimensions.vh + 2
    )
      failures.push("viewport overflow");
    results.push({
      name,
      initial,
      directPoint,
      directLabel,
      general,
      focused,
      inward,
      leaf,
      alternate,
      dimensions,
      failures,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  resolve(out, "report.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.failures.length)) process.exitCode = 1;
