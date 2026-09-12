# FLORARIA

**Move through a whole plant.** Point at a root, stem, branch, leaf, sepal, petal, stamen or pistil and scroll or pinch inward. Each organ opens into its own tissue, cell and internal structures. Zoom through open space to separate the complete plant into a spatial inventory; click a different part to change destination without restarting a tour.

FLORARIA is an anonymous interactive botanical experience with public source and original teaching geometry under the Apache-2.0 [LICENSE](LICENSE). It runs entirely in the browser at **https://floraria.fasl-work.com/** through GitHub Pages. The scene illustrates relationships and processes; it does not predict growth, identify plants or supply measured microscopy.

## Explore

- Aim at a visible structure and scroll or pinch inward. Reverse the gesture to return to its parent. Drag to orbit; scroll on empty space to unfold all eight regions.
- Compare two different internal routes per organ: root hair or root xylem; stem vessel or phloem; leaf photosynthetic cell or stomatal guard cell; anther pollen or supporting tapetum; ovule or style tissue, plus the other organ pairs.
- Read bilingual field notes and primary-source links as focus and visible anatomy change. Selected subparts have their own notes instead of a generic label.
- Use keyboard-accessible organ choices, zoom buttons and Home/Escape as alternatives to gestures. Share the current spatial view or save a canvas image.
- Access the preserved three-flower living experience at `/?living-archive=1` and the former studio/Smithsonian collection at `/?archive=1`, including earlier investigations and notebook import/export.

Display version: **0.06.000**. The [spatial exploration architecture](docs/architecture/10_spatial-plant-exploration.md) and [source dossier](docs/research/spatial-plant-anatomy-2026-09-12.md) define the new default experience. Publication status belongs to [the release record](docs/architecture/07_release-and-verification.md).

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

Five blooms with two fidelity variants are five biological examples, not ten. Each scan has one surface mesh and no organ segmentation. The new whole plant is authored schematic geometry informed by botanical sources, not an individual scan. Its proportions, apparent scale, separation and cell counts are illustrative. It does not establish equal physical size, measured microscopy, physiological dynamics or species-specific internal structure.

Source URLs, rights and hashes live under data/sources; browser assets under data/artifacts; the manifest under manifests. The collection page reads actual catalog metadata. File integrity is distinct from botanical correctness and educational effectiveness.

See the [wiki](docs/README.md), [repository map](STRUCTURE.md), [contracts](docs/data-contract.md), [attribution](ATTRIBUTION.md) and [licenses](LICENSES.md).

Developed by Felipe Santibáñez-Leal. Source institutions do not thereby endorse the application.
