# Connected exploration

FLORARIA opens as a botanical collection. Choose any of the five Smithsonian specimens to inspect its real scanned outer surface, or choose a second specimen for a paired view. Orbit with the pointer, use the camera controls, and compare shape without assuming equal physical scale.

**Explore its anatomy** enters an original orchid teaching model. The evidence label changes with the representation. Select a named part on the model or in the organ list; its explanation, citations, isolation and related-tissue action stay connected. The general flower remains separately available for its different arrangement. Sectioning and separation explain structure, and the pollen-to-seed sequence remains explicitly conceptual.

The depth strip connects flower, organs, tissue, cell and subcellular views. Four microscopic pathways introduce new geometry and information at each depth:

| Pathway | Investigative question |
|---|---|
| Petal | How can pigment stored inside a cell contribute to visible colour? |
| Anther | How do the pollen wall and the cells of the male gametophyte differ? |
| Ovary | How are an ovule, an embryo sac and an egg cell related? |
| Stem | How does a mature xylem vessel conduct water through a reinforced hollow cell? |

These diagrams illustrate source-supported general relationships; they are not microscopic scans of the selected orchid. Cell walls and empty spaces are not organelles, and gametophytes can contain multiple cells. Each diagram identifies its selected structure and sources. The process slider changes an explanatory sequence; it does not represent measured elapsed time.

The twelve original guided investigations remain available from the masthead. Their steps drive the same camera and anatomy controls used by free exploration. The field guide preserves morphology chapters, collection records and implementation explanations.

The notebook records the complete view, selected microscopic structure, depth, sequence position and personal notes. Save on the current device or explicitly export a JSON file. Shared URLs deliberately exclude personal notes. Version-one files from the original application still import. Browser storage is optional; file export works when storage is unavailable. Image export includes the original 3D credit or an explanatory SVG title.

The interface supports English and Spanish, light and dark themes, keyboard structure selection and native modal focus handling. Animation starts only after a deliberate user action. On small screens, the collection moves above the instrument and observation details scroll below it; focus view expands the instrument.

## Rebuilding real collection thumbnails

Run a verified local app, then use `node frontend/render-specimens.mjs` from the repository root with `PLAYWRIGHT_BROWSERS_PATH` configured if required. `FLORARIA_URL` can identify an alternate local URL. The command renders the actual detailed GLBs, crops their transparent bounds and writes the five WebP images and source-hash manifest under `frontend/public/specimens`. These are derived CC0 collection images. Browser/GPU differences can change raster bytes; source geometry remains locked and verified separately.
