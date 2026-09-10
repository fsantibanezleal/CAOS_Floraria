# FLORARIA

**Open a flower. Follow what makes it work.** Begin with a dissectable anatomical flower, choose a question about colour, pollen, seeds or water, and follow actual structural relationships into tissues, cells and subcellular components. The original Smithsonian scan collection remains available separately.

FLORARIA is a no-login educational atlas with open source, documentation and original diagrams under Apache-2.0 [LICENSE](LICENSE). Museum scans record outer surfaces; separately identified teaching models explain floral anatomy and microscopic relationships. The application runs entirely in the browser and deploys to GitHub Pages. No identification, clinical, growth-prediction or biological measurement service is provided.

## Explore

- Rotate, frame and compare five real bloom specimens with compact/detailed fidelity.
- Select, isolate, separate and section named teaching components.
- Follow four complete microscopic pathways: petal pigmentation, pollen protection, ovule development and xylem transport. Each depth introduces distinct structures, explanations and interactions.
- Use named inward actions, semantic depth controls and a full ancestry trail. Progress changes the subject and content; camera magnification only changes framing.
- Inspect dedicated subcellular cutaways, reveal their interiors, return to their context, and step through a named functional sequence.
- Scrub a bounded reproductive explanation, distinguishing pollen transfer, fertilization and seed/fruit identities.
- Open twelve guided investigations in the same explorer.
- Preserve views and personal observations in a local notebook; share links exclude notes. Export/import version-two files and retain compatibility with the original version-one files; export a view image.
- Read the guide, morphology, implementation and evidence in English/Spanish with light/dark themes.

Display version: **0.03.000**. The [exploration contract](docs/architecture/08_structure-and-function-exploration.md) defines the reimplemented flow. Final publication/verification status belongs to [the release record](docs/architecture/07_release-and-verification.md); capability descriptions do not establish delivery.

## Run locally

Use Python 3.13 and Node 22 or 24, isolated to this repository.

~~~powershell
./scripts/setup.ps1
./scripts/dev.ps1
~~~

Equivalent shell scripts accompany the PowerShell entry points.

~~~sh
./scripts/setup.sh
./scripts/dev.sh
~~~

The source process acquires locked public assets. Offline mode uses the verified cache. See [local development](docs/guides/01_local-development.md), [acquisition](docs/guides/02_acquisition-and-extension.md) and [delivery](deploy/README.md).

Use `scripts/test.*` and `scripts/build.*` for all release gates, `scripts/preview.*` for the built app, and `scripts/verify-ui.*` for browser acceptance against an already-running URL. `scripts/local/02_generate-data.*` reproduces data in a sandbox by default; setup and builds verify the committed corpus without a fresh museum download.

## Evidence and limits

Five blooms with two fidelity variants are five biological examples, not ten. Each scan has one surface mesh and no organ segmentation. Normalized framing does not establish equal physical size. Authored proportions, separation, colors and progress are explanatory conventions.

Source URLs, rights and hashes live under data/sources; browser assets under data/artifacts; the manifest under manifests. The collection page reads actual catalog metadata. File integrity is distinct from botanical correctness and educational effectiveness.

See the [wiki](docs/README.md), [repository map](STRUCTURE.md), [contracts](docs/data-contract.md), [attribution](ATTRIBUTION.md) and [licenses](LICENSES.md).

Developed by Felipe Santibáñez-Leal. Source institutions do not thereby endorse the application.
