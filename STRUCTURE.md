# Repository map

The browser and source processing live together. There is no internal Python package or active runtime API.

| Path | Responsibility |
|---|---|
| data/sources/ | Curated source catalog, locked URLs/hashes and rights |
| data-pipeline/run.py | Acquisition, validation, inspection, normalization, export, verification |
| data-pipeline/micro.py | Deterministic microscopic hierarchy validation, export and integrity verification |
| data/artifacts/ | Published catalog and compact/full geometry |
| manifests/ | Artifact identity and processing evidence |
| frontend/src/lib/catalog.types.ts | Source, specimen, component and investigation interfaces |
| frontend/src/lib/catalog.ts | Runtime loading/validation |
| frontend/src/lib/state.ts | Bounded state, sharing and persistence |
| frontend/src/lib/exploration.ts | Connected depth/selection/notebook state, note-free sharing and version-one import |
| frontend/src/lib/micro.ts | Bounded microscopic atlas loading, graph validation and digest checks |
| frontend/src/render/botany.ts | Original flower/orchid teaching geometry |
| frontend/src/render/Viewer.tsx | Three.js scene, loading, camera, picking and transforms |
| frontend/src/Studio.tsx and studio.css | Independent botanical interface and connected exploration flow |
| frontend/src/App.tsx | Preserved original interface source, not mounted by the current entry point |
| frontend/src/render/MicroViewer.tsx | Source-linked tissue, cell and subcellular diagrams and processes |
| frontend/src/GuidePages.tsx | Preserved field-guide content, investigations and evidence |
| frontend/public/specimens/ | Real source-derived CC0 thumbnails and their digest manifest |
| frontend/render-specimens.mjs | Explicit browser rendering pipeline for specimen thumbnails |
| frontend/src/architecture.ts | Bilingual architecture explanations |
| frontend/public/svg/tech/ | Five themed bilingual SVG sources |
| scripts/ and tests/ | Local/delivery entry points and contract/behavior checks |
| docs/ | Architecture, morphology, framework, case and usage documentation |
| app/ and models/ | Dormant-area explanations; no fake API or checkpoint |

The studio at / connects collection, anatomy, microscopic pathways and notebook. The original direct URLs /introduction, /methodology, /implementation, /experiments and /benchmark reopen the corresponding field-guide or investigation surface; /explore also opens the studio. All investigations drive the same explorer state. Pages staging creates actual route files.

Raw/cache storage is an acquisition concern. Credentials and machine-specific configuration do not belong in published data.
