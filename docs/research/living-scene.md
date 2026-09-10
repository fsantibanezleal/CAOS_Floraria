# Evidence behind the living scene

Verified 2026-09-10. The implementation uses original authored geometry and copy.
The reference informed interaction observations; no reference code, meshes or
figures are redistributed.

## Spatial interaction

[Human Atlas](https://github.com/ashemag/human-atlas) demonstrates continuous
decomposition of persistent identifiable meshes and panel-aware framing. Browser
inspection found that its wheel changes camera distance. Automatic tissue/cell
reveal is a separate explicit Floraria user requirement, not a claimed reference
feature. Floraria uses one canvas, real-valued depth, anchored geometry, surface
opening and synchronized source context to implement that additional behavior.

## Distinct floral constructions

- [Kew Orchidaceae](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000046-2/general-information): the orchid teaching form has bilateral organization, three sepals, two petals, a differentiated lip, column and inferior ovary.
- [Kew sunflower](https://www.kew.org/plants/sunflower) and [Helianthus](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000729-2/general-information): an inflorescence contains different ray and disc florets. The reproductive zoom follows one disc floret, not a fictional giant central anther.
- [OSU reproductive plant parts](https://extension.oregonstate.edu/catalog/em-9900-reproductive-plant-parts): general whorl/organ relationships support the radial example.

## Sunflower colour belongs to a different compartment

[Wiland-Szymańska et al., Scientific Reports 16, 25041 (2026)](https://www.nature.com/articles/s41598-026-53788-7),
DOI 10.1038/s41598-026-53788-7, was cross-checked with [PubMed 42225694](https://pubmed.ncbi.nlm.nih.gov/42225694/).
The reported sunflower ray-ligule mesophyll has globular chromoplasts containing
xanthophyll pigments. This supports a separate yellow plastid route, rather than
reusing the pink anthocyanin-bearing vacuole as an explanation of sunflower colour.
The model does not reproduce measured dimensions, cultivar-specific cellular
arrangements, spectroscopy or kinetic/thermal predictions. Its quantities and
movement remain illustrative.

The four new source records and their reciprocal parent chain are preserved in
`data/sources/living-content.json`, deterministically exported by `data-pipeline/living.py`
and checked by both Python and browser-side integrity/structure validation. The
existing 34-node corpus remains byte-for-byte preserved. Other microscopic
pathways retain the assumptions in [the original dossier](micro-atlas.md).

## Typography

The original visual identity uses Outfit from the [official Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/outfit),
pinned to revision `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`, with the original
SIL Open Font License and byte hashes in `frontend/public/fonts/provenance.json`.
No external font request or runtime service is required.
