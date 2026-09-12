# FLORARIA

**Move closer. A flower opens into a world of its own.** Point at a structure and use the wheel or pinch gesture: enclosing surfaces open, tissue resolves into cells, and a connected three-dimensional interior emerges. Radial flowers, bilateral orchids and composite sunflower heads have different visible constructions. Water routes, pollen structures and pigment compartments remain active as you explore.

FLORARIA is an anonymous interactive botanical experience with public source and original teaching geometry under the Apache-2.0 [LICENSE](LICENSE). It runs entirely in the browser at **https://floraria.fasl-work.com/** through GitHub Pages. The scene illustrates relationships and processes; it does not predict growth, identify plants or supply measured microscopy.

## Explore

- Travel continuously with wheel, trackpad, pinch, keyboard or the depth rail; reverse the gesture to return through the same structures.
- Explore one selected floral form at a time and switch directly among the radial flower, orchid and composite sunflower. The sunflower head contains hundreds of individual tubular disc florets; its reproductive route enters one of them.
- Select a visible plant part in the three-dimensional scene to change the active botanical pathway and explanation, or use the anatomy map to move directly among Garden, Structure, Tissue, Cell and Inside.
- Follow colour, water, pollen and ovule pathways through persistent tissue, cells and internal structures. Surfaces physically open during travel; the canvas is not replaced with another picture.
- Compare the radial teaching flower's anthocyanin/vacuole example with a sourced sunflower mesophyll/chromoplast pathway. Generic internal examples are explicitly distinguished from species-informed ones.
- Change flower opening and process emphasis, pause movement at an intermediate state, or follow an automatic continuous inward journey.
- Read the explanation and sources for the current geometric anchor automatically. Use a full-viewport interface with an original midnight/coral/cyan palette, self-hosted Outfit typography and English/Spanish text.
- Save a local observation or image and share the current view without personal notes.
- Access the preserved former studio for five Smithsonian scans in both fidelities, comparison, twelve investigations, the detailed field guide and all earlier notebook import/export formats.

Display version: **0.05.000**. The [living exploration contract](docs/architecture/09_living-exploration.md) defines the replacement experience. Publication/verification status belongs to [the release record](docs/architecture/07_release-and-verification.md); a source capability description does not establish that the live site has changed.

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
