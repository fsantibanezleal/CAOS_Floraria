import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const output =
  process.env.FLORARIA_QA_DIR || "../build/qa/historical-visual-smoke";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const results = [];
for (const [name, width, height] of [
  ["desktop", 1440, 960],
  ["phone", 390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.FLORARIA_QA_URL || "http://127.0.0.1:5902/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .locator(".fl-viewer[data-rendered=true]")
    .waitFor({ timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${output}/${name}-specimen.png` });
  results.push({
    name,
    errors,
    geometry: await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      stage: document
        .querySelector(".fl-viewer")
        ?.getBoundingClientRect()
        .toJSON(),
    })),
  });
  if (name === "desktop") {
    await page.locator("#view-mode").selectOption("anatomy");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/desktop-anatomy.png` });
    await page.getByLabel("Separate components", { exact: true }).fill("0.75");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/desktop-exploded.png` });
    await page.locator("#teaching-model").selectOption("orchid");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/desktop-orchid.png` });
  }
  await page.close();
}
writeFileSync(`${output}/smoke.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await browser.close();
