# Microscopic atlas contract

The browser consumes a static authored catalog and its integrity sidecar. It needs no external science API, account or server process.

| File | Purpose |
| --- | --- |
| `data/sources/micro-atlas.json` | Reviewed bilingual content, sources, topology and assumptions. |
| `data-pipeline/micro.py` | Standard-library validator, deterministic export and read-only verification. |
| `data/artifacts/micro-atlas.json` | Browser catalog. |
| `data/artifacts/micro-atlas.integrity.json` | SHA-256, byte count, semantic source digest and record counts. |
| `frontend/src/lib/micro.ts` | Types, runtime validation and bounded static loader. |
| `frontend/src/render/MicroViewer.tsx` | Original pickable SVG diagrams and compact explanations. |

Authoring command: `python data-pipeline/micro.py export`. Verification command: `python data-pipeline/micro.py verify`. Both accept `--root` for an isolated sandbox. Export touches only the two microscopic artifacts. It does not regenerate museum assets or the original catalog. The canonical `run.py verify` also verifies the microscopic extension, allowing exactly its two filenames while retaining all existing manifest and asset checks. Legacy isolated pipeline fixtures may omit the independent extension; partial extensions fail.

JSON export uses sorted keys, two-space indentation, UTF-8 and LF. Its source digest represents this canonical JSON encoding, so Git newline conversion does not change semantic source identity. Verification compares exact artifact bytes and exact expected sidecar bytes without rewriting anything. Source and artifact reads are capped at 1 MB. Topology validation rejects unknown references, duplicate IDs, cycles, unreachable nodes, mixed branches and missing depth levels.

The browser independently checks HTTP status, bounded streaming bytes, a 12-second timeout, UTF-8 decoding, SHA-256, schema, bilingual fields, topology and sidecar record counts before rendering. It caches only a verified result and resets failed attempts so Retry can fetch again. URLs must use HTTP(S) without embedded credentials. All successful runtime requests are for local static data; article links open only when chosen by the user.

```ts
interface MicroViewerProps {
  branch: string;
  depth: 'tissue' | 'cell' | 'organelle';
  selected: string;
  onSelect: (id: string) => void;
  onDrill?: (id: string, depth: MicroDepth) => void;
  lang: 'en' | 'es';
  theme: 'light' | 'dark';
  progress: number;
}
```

Both named and default component exports are available. `micro.ts` exports `MICRO_BRANCHES`, `MICRO_DEPTHS`, `MICRO_BRANCH_META`, types, `validateMicroAtlas` and `loadMicroAtlas`. Branch IDs are `petal`, `stem`, `anther`, `ovary`. Default tissue nodes are `petal-epidermis`, `stem-xylem`, `anther-pollen-sac`, `ovary-ovule`. An unknown selection falls back to the first node at the current branch and depth. Finite progress is clamped to 0-1 and divided into four explanatory stages. It is a sequence position, not elapsed time.

Node depth represents the view grouping. Node `kind` records the biological category, distinguishing gametophytes, cell groups, walls, membranes and spaces from cells and organelles. There are 34 nodes across four branches, including the four organ roots. Child edges describe containment or an explanatory structural connection; related nodes may share a depth. The optional `onDrill` callback follows the actual child edge, preserving the target ID even for a same-depth transition.

SVG shapes and matching HTML buttons support pointer selection and keyboard activation. Child buttons allow hierarchy traversal. Focusable SVG targets have stable component identity across progress and selection updates. Details and sources scroll inside the stage; the parent controls broader context and depth navigation. No new image, mesh or quantitative observation is claimed when a user enters the microscopic atlas.

Meaningful regressions are in `tests/test_micro.py` and `frontend/src/test/micro.test.ts`. They cover topology, translation, scientific classification boundaries, corruption, deterministic sandbox processing, bounded reads and integration with the strict canonical verifier. Scientific provenance and assumptions are documented in [the research ledger](research/micro-atlas.md).
