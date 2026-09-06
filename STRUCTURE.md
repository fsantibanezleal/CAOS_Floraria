# Repository map

The browser and source processing live together. There is no internal Python package or active runtime API.

| Path | Responsibility |
|---|---|
| data/sources/ | Curated source catalog, locked URLs/hashes and rights |
| data-pipeline/run.py | Acquisition, validation, inspection, normalization, export, verification |
| data/artifacts/ | Published catalog and compact/full geometry |
| manifests/ | Artifact identity and processing evidence |
| frontend/src/lib/catalog.types.ts | Source, specimen, component and investigation interfaces |
| frontend/src/lib/catalog.ts | Runtime loading/validation |
| frontend/src/lib/state.ts | Bounded state, sharing and persistence |
| frontend/src/render/botany.ts | Original flower/orchid teaching geometry |
| frontend/src/render/Viewer.tsx | Three.js scene, loading, camera, picking and transforms |
| frontend/src/App.tsx | Connected explorer and controls |
| frontend/src/GuidePages.tsx | Five supporting routes, real investigations and evidence |
| frontend/src/architecture.ts | Bilingual architecture explanations |
| frontend/public/svg/tech/ | Five themed bilingual SVG sources |
| scripts/ and tests/ | Local/delivery entry points and contract/behavior checks |
| docs/ | Architecture, morphology, framework, case and usage documentation |
| app/ and models/ | Dormant-area explanations; no fake API or checkpoint |

Routes: / Explore, /introduction Field guide, /methodology Morphology, /implementation How it works, /experiments Investigations, /benchmark Collection & evidence. All investigations open the same explorer.

Raw/cache storage is an acquisition concern. Credentials and machine-specific configuration do not belong in published data.
