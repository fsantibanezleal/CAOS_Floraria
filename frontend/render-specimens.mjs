/** Rebuild real specimen thumbnails from the verified browser renderer, never stock imagery. */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const base = process.env.FLORARIA_URL || "http://127.0.0.1:5902/";
const output = fileURLToPath(new URL("./public/specimens/", import.meta.url));
const catalog = JSON.parse(
  readFileSync(
    new URL("../data/artifacts/catalog.json", import.meta.url),
    "utf8",
  ),
);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const manifest = {
  schemaVersion: 1,
  credit: "Smithsonian Gardens, CC0",
  method:
    "Verified detail GLB rendered through FLORARIA, alpha bounds cropped and resized to 300px; raster bytes depend on browser/GPU.",
  specimens: [],
};
try {
  for (const s of catalog.specimens) {
    const url = new URL(base);
    url.searchParams.set(
      "view",
      JSON.stringify({ specimen: s.id, quality: "detail" }),
    );
    await page.goto(url.href);
    await page
      .locator('.fl-viewer[data-rendered="true"][data-loading="false"]')
      .waitFor({ timeout: 60000 });
    const data = await page
      .locator('canvas[data-testid="atlas-canvas"]')
      .evaluate((source) => {
        const scratch = document.createElement("canvas");
        scratch.width = source.width;
        scratch.height = source.height;
        const ctx = scratch.getContext("2d");
        ctx.drawImage(source, 0, 0);
        const px = ctx.getImageData(0, 0, source.width, source.height).data;
        let left = source.width,
          top = source.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < source.height; y++)
          for (let x = 0; x < source.width; x++)
            if (px[(y * source.width + x) * 4 + 3] > 10) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
        if (right <= left || bottom <= top)
          throw new Error("Empty specimen render");
        const out = document.createElement("canvas");
        out.width = out.height = 300;
        const w = right - left + 1,
          h = bottom - top + 1,
          scale = 282 / Math.max(w, h);
        out
          .getContext("2d")
          .drawImage(
            scratch,
            left,
            top,
            w,
            h,
            (300 - w * scale) / 2,
            (300 - h * scale) / 2,
            w * scale,
            h * scale,
          );
        return out.toDataURL("image/webp", 0.93).split(",")[1];
      });
    const bytes = Buffer.from(data, "base64"),
      path = `${s.id}.webp`;
    writeFileSync(`${output}/${path}`, bytes);
    manifest.specimens.push({
      id: s.id,
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceSha256: s.detail.sha256,
    });
  }
  writeFileSync(
    `${output}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    `Rendered ${manifest.specimens.length} source-linked CC0 thumbnails.`,
  );
} finally {
  await browser.close();
}
