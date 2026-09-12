# Spatial plant anatomy: evidence and representation contract

The new default explorer is an **authored teaching reconstruction of a generalized flowering plant**, not a segmented scan or a measured individual. The five Smithsonian orchid scans remain preserved in the collection and must never be presented as evidence for the internal geometry below. The full plant must remain navigable from root to flower; a focused organ resolves its own tissue and cell architecture through continuous pointer/wheel/pinch travel. Unfocused travel separates the organs into a spatial inventory.

## Primary sources and directly supported relationships

| Region | Sourced relationship | Source |
| --- | --- | --- |
| Root | Epidermis/root hairs outside cortex; central vascular cylinder; root hairs take up water. | [OpenStax Biology 2e, 30.3 Roots](https://openstax.org/books/biology-2e/pages/30-3-roots) |
| Stem and branch | Nodes support leaves/branches; vascular bundles contain xylem inward of phloem; xylem vessels and phloem sieve tubes have different cell organization. | [OpenStax Biology 2e, 30.2 Stems](https://openstax.org/books/biology-2e/pages/30-2-stems) |
| Leaf and sepal | Epidermis, mesophyll, vascular bundles; palisade and spongy layers, chloroplasts and stomatal guard cells are characteristic leaf structures. Sepal greenness is a *teaching example*, not universal. | [OpenStax Biology 2e, 30.4 Leaves](https://openstax.org/books/biology-2e/pages/30-4-leaves) |
| Petal | The pre-existing micro-atlas documents an **example** anthocyanin-bearing petal with epidermal papilla, vacuole and tonoplast. Not universal among flowers. | [Existing curated micro-atlas](../../data/sources/micro-atlas.json) and its per-node source IDs |
| Stamen/anther | Pollen develops in anther microsporangia; pollen grain wall and pollen-cell contents differ from leaf/vascular cells. | [OpenStax Biology 2e, 32.1 Reproductive Development and Structure](https://openstax.org/books/biology-2e/pages/32-1-reproductive-development-and-structure) |
| Pistil/ovary | Ovary surrounds ovules; female gametophyte develops within an ovule. A seed is a post-fertilization outcome, not a cell inside an unpollinated ovary. | [OpenStax Biology 2e, 32.1 Reproductive Development and Structure](https://openstax.org/books/biology-2e/pages/32-1-reproductive-development-and-structure) |

## Representation and interaction decisions

1. Anatomical parts have stable IDs. The renderer binds one 3D assembly to each organ and a distinct organ-specific tissue/cell assembly to its focus path. A hit on visible geometry changes the spatial target; zoom never silently reuses an unrelated organ's cell model.
2. A continuous zoom scalar drives physical opening, camera travel, material opacity and deeper geometry together. The focus is spatial, not a numbered page. General travel produces a packed organ layout; aiming at one part enters it.
3. The `sourceIds` on every authored content node resolve to the primary sources above. The app labels all unobserved geometry **schematic**, and its apparent scale is illustrative rather than metric. No microscopy resolution, measured diameter, physiological rate or species-specific internal structure is claimed.
4. Test both the scientific graph (all modeled regions have organ/tissue/cell content and valid references) and the input contract (pointer focus, unfocused layout, inward/outward continuity, keyboard and touch alternatives). Browser inspection must include intermediate depths, not just endpoints.

This dossier is the source boundary for the spatial rebuild. It does not license copying imagery or geometry from the textbooks.
