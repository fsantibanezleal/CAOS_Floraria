/** Stage validated immutable data and pinned local decoders; never regenerate source evidence. */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  lstatSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const frontend = fileURLToPath(new URL(".", import.meta.url)),
  root = resolve(frontend, ".."),
  artifacts = resolve(root, "data/artifacts");
const catalog = JSON.parse(
  readFileSync(resolve(artifacts, "catalog.json"), "utf8"),
);
if (
  catalog.schemaVersion !== 1 ||
  catalog.specimens.length !== 5 ||
  catalog.journeys.length !== 12
)
  throw new Error("Incomplete release catalog");
for (const specimen of catalog.specimens)
  for (const key of ["preview", "detail"]) {
    const a = specimen[key];
    if (!/^assets\/[a-z0-9-]+\.glb$/.test(a.path))
      throw new Error("Invalid asset path");
    const b = readFileSync(resolve(artifacts, a.path));
    if (
      b.length !== a.bytes ||
      createHash("sha256").update(b).digest("hex") !== a.sha256.toLowerCase()
    )
      throw new Error(`Artifact mismatch: ${a.path}`);
  }
// Only these two generated, ignored directories are replaced. Refuse symlink targets.
const publicRoot = resolve(frontend, "public");
for (const name of ["data", "draco"]) {
  const target = resolve(publicRoot, name);
  if (
    target !== resolve(frontend, "public", name) ||
    (!target.startsWith(publicRoot + "/") &&
      !target.startsWith(publicRoot + "\\"))
  )
    throw new Error("Generated path escaped public root");
  if (existsSync(target) && lstatSync(target).isSymbolicLink())
    throw new Error("Generated directory must not be a symlink");
  rmSync(target, { recursive: true, force: true });
}
mkdirSync(resolve(frontend, "public/data"), { recursive: true });
cpSync(artifacts, resolve(frontend, "public/data"), { recursive: true });
cpSync(
  resolve(frontend, "node_modules/three/examples/jsm/libs/draco/gltf"),
  resolve(frontend, "public/draco"),
  { recursive: true },
);
let revision = "uncommitted";
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
} catch {}
writeFileSync(
  resolve(frontend, "public/release.json"),
  JSON.stringify(
    {
      schema: "floraria-build/v1",
      product: "FLORARIA",
      version: readFileSync(resolve(root, "VERSION"), "utf8").trim(),
      revision,
      catalog_sha256: createHash("sha256")
        .update(readFileSync(resolve(artifacts, "catalog.json")))
        .digest("hex"),
      state: "local-build",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Validated ${catalog.specimens.length} specimens and ${catalog.journeys.length} investigations; staged data and decoders.`,
);
