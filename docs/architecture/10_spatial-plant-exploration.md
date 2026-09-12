# Whole-plant spatial exploration

The default `/` route is a source-linked, authored 3D reconstruction of a generalized flowering plant. It is not the Smithsonian specimen viewer, and its internal structures are not derived by segmenting a scan. The five original scans, the first studio and the previous three-flower living scene are preserved at `/?archive=1` and `/?living-archive=1`.

## User-facing contract

The visitor begins with one connected plant from roots to flower. A wheel or pinch gesture aimed at any visible organ assigns that organ as the spatial focus and travels inward. A wheel gesture aimed at open space keeps focus unset and moves the eight organ regions into a two-row inventory. A visitor may change focus by pointing at another visible structure or using the keyboard-accessible organ choices. Reverse travel restores surrounding geometry. Drag orbits the camera. Home/Escape resets. Share links preserve organ, illustrative scale and primary/alternate route without personal data.

The anatomy card follows focus and scale. It shows a level-specific bilingual explanation, a selected subpart note when supported, its source URLs and the prominent representation limit. The panel has its own scroll region; its position returns to the heading when focus/content changes. It does not require a separate page click to discover the current geometric destination.

## Scene hierarchy and navigation

`frontend/src/render/spatialGeometry.ts` authors independent macro, tissue, cell and interior geometry for eight regions. The model root stores a stable region ID and every pickable mesh a part ID. Regions share a global camera/gesture field but their cell destinations differ:

| Region | Primary destination | Alternative destination |
| --- | --- | --- |
| Root | Epidermal root-hair cell and vacuole | Stele xylem vessel and conducting lumen |
| Stem | Xylem vessel and wall/pits | Phloem sieve-tube element and sieve plate |
| Branch | Phloem sieve tube and companion cell | Branch xylem vessel and perforation |
| Leaf | Palisade cell and chloroplasts | Guard-cell pair and stomatal aperture |
| Sepal | Green parenchyma and chloroplasts | Vascular trace and vessel lumen |
| Petal | Epidermal papilla and pigment-bearing vacuole | Petal vein and vessel lumen |
| Stamen | Pollen grain and exine/cells | Pollen-sac tapetum and support-cell interior |
| Pistil | Ovule/embryo sac and egg/central cells | Style transmitting tissue and possible pollen-tube route |

The mesh under a wheel/pinch/click is picked with a Three.js raycaster. `routeFromPart` maps a small number of anatomically distinct targets to the alternative route; other subparts keep the primary route. A recent hover target is retained when a very thin line mesh misses on the subsequent wheel sample, so the gesture does not unexpectedly become a general zoom. Direct clicking and the accessible organ controls both set the same state. `SpatialView` is `{focus, depth, part, route}`; it is independent of the historical `LivingState`.

`depth` is a continuous illustrative coordinate from 0 to 3.75, not a metric magnification. Every frame interpolates the current value toward the requested one. Smooth intervals drive region separation, camera distance, tissue/cell/interior visibility and local scale together. The contextual node index changes as the relevant structure becomes visible; the geometry itself is not swapped by page navigation. At high scale the enclosing macro geometry becomes transparent and then hidden, preventing unrelated layers from obscuring the selected internal structure.

The general inventory is produced by interpolating every region's original world position toward a fixed two-row spatial layout. A selected region instead approaches the scene center while nonselected regions part and fade. The scene maintains stable part/region IDs across these transforms. The initial plant uses no inherited three-flower offsets.

## Source and processing contract

`data/sources/spatial-atlas.json` owns the six source records, eight regions, 16 routes and 24 selected-part notes. `data-pipeline/spatial.py` checks every route length, ID, parent/child relation, bilingual field, source link and supported region; it exports deterministic UTF-8 JSON and a byte-count/SHA-256 integrity receipt to `data/artifacts/`. The main `run.py` verifies these alongside the five-source museum pipeline, the 34-node preserved micro-atlas and the four-node sunflower path. The frontend bounded loader rechecks byte count and SHA-256 before accepting the graph. The browser fails closed on malformed/missing source content while keeping the 3D scene available with an error message.

To extend the anatomy, add a sourced region or additional route in the source graph, update the region/route contract in both validators, author corresponding target-specific geometry, regenerate with `python data-pipeline/spatial.py build`, and run the repository checks. A label without an implemented destination is not an anatomy route. Do not assign measured scales, microscopy resolution, pigment location or species identity without evidence. The illustrated cell counts and forms do not represent a measured sample.

## Verification and limits

`frontend/verify-spatial.mjs` exercises initial visibility, direct 3D aim/wheel focus, unfocused separation, inward anatomy change, real Chromium touch-event pinch, a second organ, alternate-route deep link, console errors and fixed-viewport dimensions on desktop and emulated phone. It records screenshots for visual review. Python and Vitest cover deterministic export, corrupt artifact rejection, bilingual references and alternate path mapping. The historical living/studio browser suites remain separate regression gates.

The geometry teaches topology and distinction, not specimen identification, microscopy measurements, real-time cell physiology or quantitative transport. Browser emulation does not establish physical-device performance or learning effectiveness. Rendered and scientific review remain distinct from passing automated checks.
