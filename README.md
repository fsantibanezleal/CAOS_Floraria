# FLORARIA

**The architecture of a flower.** Explore digitized Smithsonian orchid blooms, take apart an explicitly authored teaching model, and follow questions about floral organization and reproduction.

FLORARIA is a public-facing, no-login educational atlas. The source repository is private; original code, documentation and diagrams use Apache-2.0 under [LICENSE](LICENSE). Museum scans record outer surfaces; the general flower and orchid models expose named relationships for explanation. No identification, clinical, growth-prediction or biological measurement service is provided.

## Explore

- Rotate, frame and compare five real bloom specimens with compact/detailed fidelity.
- Select, isolate, separate and section named teaching components.
- Scrub a bounded reproductive explanation, distinguishing pollen transfer, fertilization and seed/fruit identities.
- Open twelve guided investigations in the same explorer.
- Preserve views through bookmarks, share links and JSON export/import; export a view image.
- Read the guide, morphology, implementation and evidence in English/Spanish with light/dark themes.

Display version: **0.01.000**. Final publication/verification status belongs to [the release record](docs/architecture/07_release-and-verification.md); capability descriptions do not establish delivery.

## Run locally

Use Python 3.13 and Node 22 or 24, isolated to this repository.

~~~powershell
./scripts/setup.ps1
python data-pipeline/run.py all
npm --prefix frontend run dev
~~~

Equivalent shell scripts accompany the PowerShell entry points.

~~~sh
npm --prefix frontend run test
npm --prefix frontend run build
~~~

The source process acquires locked public assets. Offline mode uses the verified cache. See [local development](docs/guides/01_local-development.md), [acquisition](docs/guides/02_acquisition-and-extension.md) and [delivery](deploy/README.md).

## Evidence and limits

Five blooms with two fidelity variants are five biological examples, not ten. Each scan has one surface mesh and no organ segmentation. Normalized framing does not establish equal physical size. Authored proportions, separation, colors and progress are explanatory conventions.

Source URLs, rights and hashes live under data/sources; browser assets under data/artifacts; the manifest under manifests. The collection page reads actual catalog metadata. File integrity is distinct from botanical correctness and educational effectiveness.

See the [wiki](docs/README.md), [repository map](STRUCTURE.md), [contracts](docs/data-contract.md), [attribution](ATTRIBUTION.md) and [licenses](LICENSES.md).

Developed by Felipe Santibáñez-Leal. Source institutions do not thereby endorse the application.
