# Structure and function exploration

2026-09-09. Version 0.03.000. This decision replaces the scan-first interaction as the default mounted experience while preserving the collection, original models, sources, routes and saved-file compatibility.

## Problem and resulting behavior

Camera enlargement of one scanned surface does not expose internal anatomy. The previous experience exposed real teaching layers through small navigation controls, but its main entry still emphasized a single external scan. Selecting a structure and entering a depth could also leave the chosen branch inconsistent. Users could therefore see magnification without a useful change in subject.

The default now opens a selectable general anatomical flower. Four visible routes answer concrete questions: where colour is located, what pollen protects and carries, how an ovule participates in seed formation, and how water is conducted. Moving inward changes the representation, selected structure, content and available actions. A complete ancestry trail explains the relationship and provides a route back. Same-depth components remain traversable; a vacuole can lead to its tonoplast even though both occupy the subcellular display tier.

The museum scans are an explicit preserved collection. Their outer meshes are never represented as segmented organs or microscopic evidence. The scan collection retains all five examples, both fidelity variants and comparison.

## Interaction contract

- An inward action names its destination before activation. It uses the actual validated parent-child graph.
- The depth control changes structural context and representation. Camera magnification is a secondary framing action.
- Selecting an anatomical organ selects a compatible functional pathway before going inward.
- Subcellular inspection displays dedicated geometry for the selected component, including the vacuole/tonoplast, nucleus, cell wall, xylem lumen/perforation/secondary-wall/pit regions, pollen wall/aperture, and reproductive nuclei.
- Interior reveal changes an illustrative cutaway. Context mode restores its surrounding arrangement. Functional mode exposes the four named stages of the sourced teaching sequence.
- Process positions are explanatory states, not elapsed time, concentration, growth rate or physical forces. Symbolic chromosome and pigment marks are not counts from a specimen.
- Local notes remain excluded from share links; existing import versions and original routes remain supported.

## Evidence boundary

The validated [source atlas](../../data/sources/micro-atlas.json) remains the botanical content authority: 4 branches, 34 connected records and 12 source references. No source or original scan is replaced. New SVG cutaways are original explanatory geometry built from those records, not microscopy, a species-specific internal reconstruction, or a new quantitative model. Nuclei, compartments, membranes, walls and spaces retain their distinct biological identities.

Tests cover graph transitions, branch consistency, predecessor recovery and same-depth children. Browser checks cover the visible default flow, all pathways, node-specific geometry, context/function controls, preserved scan operations, both languages, both themes and phone layouts. Passing those checks demonstrates implementation behavior; it does not assert physical measurement or owner acceptance of the design.
