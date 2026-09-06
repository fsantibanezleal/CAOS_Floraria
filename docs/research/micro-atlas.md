# Microscopic teaching atlas: evidence and assumptions

Access date: 2026-09-06. The 34 nodes, bilingual explanations and SVG geometry are authored educational interpretations. They are not microscopy images, segmented museum scans, specimen measurements or predictions. The five Smithsonian surface scans remain separate evidence. No article illustration, photograph or microscopic dataset is copied into this atlas.

The interaction follows a botanical connection: choose a structure, read its role, then follow one of its child links into a new diagram. A change in depth replaces the represented organisation; it does not merely magnify the previous image. All nodes cite sources in `data/sources/micro-atlas.json`.

## Primary research consulted

| Source ID | Publication and stable link | Claim supported; scope used |
| --- | --- | --- |
| `petal-pigment` | Zhang et al., 2006. [New insight into the structures and formation of anthocyanic vacuolar inclusions in flower petals](https://pubmed.ncbi.nlm.nih.gov/17173704/). DOI 10.1186/1471-2229-6-29. | Vacuolar location of anthocyanin pigments in studied petal cells. The atlas illustrates this pigment class, without assigning it to every flower or to a specific Smithsonian specimen. |
| `petal-shape` | Gorton and Vogelmann, 1996. [Effects of epidermal cell shape and pigmentation on optical properties of Antirrhinum petals](https://pubmed.ncbi.nlm.nih.gov/12226425/). DOI 10.1104/pp.112.3.879. | Conical epidermal shape as an Antirrhinum example. A raised petal cell is not a universal morphology. |
| `pollen-aperture` | Dobritsa et al., 2018. [Pollen Aperture Factor INP1 Acts Late in Aperture Formation](https://pubmed.ncbi.nlm.nih.gov/28899962/). DOI 10.1104/pp.17.00720. | Areas lacking exine form apertures in the studied Arabidopsis pollen. The display does not claim all pollen has one aperture or this ornamentation. |
| `pollen-wall` | Suzuki et al., 2008. [Identification of kaonashi mutants showing abnormal pollen exine structure in Arabidopsis thaliana](https://pmc.ncbi.nlm.nih.gov/articles/PMC2566931/). DOI 10.1093/pcp/pcn131. | Distinct exine and intine layers. Illustrated wall thicknesses are not measured. |
| `female-cells` | Gross-Hardt et al., 2007. [LACHESIS restricts gametic cell fate in the female gametophyte of Arabidopsis](https://pubmed.ncbi.nlm.nih.gov/17326723/). DOI 10.1371/journal.pbio.0050047. | Differentiated cell identities in the female gametophyte. The diagram uses a common Polygonum-type arrangement, rather than asserting a universal angiosperm pattern. |
| `synergid-reception` | [Fertilization-induced synergid cell death by RALF12-triggered ROS production and ethylene signaling](https://www.nature.com/articles/s41467-025-58246-y), Nature Communications, 2025. DOI 10.1038/s41467-025-58246-y. | Synergid participation in pollen-tube reception. The atlas explains destination and sequence without implementing the paper's molecular signaling model. |

DOI, journal and publication metadata were cross-checked against PubMed/Europe PMC records or the original publisher. A paper's presence on a public website was not treated as permission to reuse its figures.

## Authoritative teaching references

- [OSU Extension: Reproductive plant parts](https://extension.oregonstate.edu/catalog/em-9900-reproductive-plant-parts) supports the organ context.
- OpenStax Biology 2e, [30.2 Stems](https://openstax.org/books/biology-2e/pages/30-2-stems) and [30.5 Transport of Water and Solutes in Plants](https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants), support xylem/phloem and water-route distinctions.
- OpenStax [4.3 Eukaryotic Cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells) supplies general plant-cell context.
- OpenStax [32.1 Reproductive Development and Structure](https://openstax.org/books/biology-2e/pages/32-1-reproductive-development-and-structure) and [32.2 Pollination and Fertilization](https://openstax.org/books/biology-2e/pages/32-2-pollination-and-fertilization) support the pollen and ovule sequence. Organ terminology is cross-checked against OSU: ovules develop into seeds; ovary tissues contribute to the fruit. No source diagram is reproduced.

## Explicit limits implemented in content and geometry

1. **Petal:** the illustrated anthocyanin pigment is inside vacuoles, including in the tissue view. Other pigments, petal cell shapes and organelles are possible. Chloroplasts are not added to every petal cell. Increasing visible dots highlights a compartment; it does not model pigment production, measured concentration or time.
2. **Stem:** connected mature vessel elements are dead and hollow. The renderer does not add a nucleus or vacuole. Lumen is a space, perforation plates are end-wall structures, and pits retain a thin membrane. Arrow movement indicates a route, without calculating pressure, flow rate or transpiration. Phloem is distinguished but not simulated.
3. **Anther:** a pollen sac is a compartment; pollen is a male gametophyte, not one universal single-cell object. A two-celled pollen example is shown with a vegetative nucleus and generative cell. The generic grain is not an orchid pollinium. Development inside the anther is separate from tube emergence after release and suitable pollination. Ornamentation, apertures and developmental cell number vary.
4. **Ovule:** surrounding integuments and nucellus are maternal tissues. The illustrated embryo sac contains seven cells, with two polar nuclei shown before their fusion. Egg and central cell are different destinations in double fertilization. Sperm trajectories are explanatory marks; molecular signaling, individual durations and complete post-fertilization development are not modeled.

`organelle` remains the internal depth key for compatibility, but the interface must call this level **Subcellular / Subcelular**: membranes, cell walls and lumen are not organelles. The separate `kind` field preserves this distinction. Every screen and node identifies illustrated evidence and the absence of a metric scale.

The source ledger records scientific provenance, not a claim that the selected museum flowers were sampled for internal anatomy. Taxonomic differences and simplifications remain visible in the atlas's Sources and model limits disclosure.
