# FLORARIA artifact pipeline

The product uses one plain Python script, `run.py`, invoked by path. It is not a Python distribution or an internal installable package. CPython 3.13 and its standard library provide deterministic JSON normalization, bounded HTTPS acquisition, SHA256 verification and GLB inspection. No third-party Python dependency, paid service or API key is required.

## Inputs and outputs

- `data/sources/catalog-source.json`: authoritative original English/Spanish educational content and source citations.
- `data/sources/assets.lock.json`: ten approved Smithsonian files, exact URLs, CC0 evidence, source title, byte size, triangle count and SHA256.
- `data/raw/assets/`: ignored verified acquisition cache. A corrupt existing cache fails rather than being silently replaced.
- `data/artifacts/catalog.json` and `data/artifacts/assets/*.glb`: committed browser artifacts.
- `manifests/catalog.json`: deterministic source fingerprints, all output hashes, counts and GLB structural inspection.

Asset filenames containing `100k` actually declare 150,000 triangles. Every detailed model is under 5 MB. Five 20,000-triangle previews total 763,964 bytes; five detailed models total 7,626,992 bytes. Every file is one continuous surface with embedded textures. The meshes do not encode internal organs or separately removable anatomical parts.

## Commands

Use the repository `.venv` created by `scripts/setup`. PowerShell uses `.venv/Scripts/python.exe`; Linux uses `.venv/bin/python`.

```text
python data-pipeline/run.py validate-source
python data-pipeline/run.py acquire
python data-pipeline/run.py inspect
python data-pipeline/run.py normalize
python data-pipeline/run.py export
python data-pipeline/run.py verify --offline
python scripts/check_artifacts.py
python -m unittest discover -s tests -v
```

`all` performs the full pipeline and verifies the exported result. Source/rights validation occurs before network acquisition; normalization follows successful mesh inspection. The independent `normalize` stage writes `data/raw/catalog.normalized.json`; `export` normalizes directly into the final catalog and writes the integrity manifest. `verify` and `scripts/check_artifacts.py` never regenerate files and never need network access. Acquisition downloads only absent, allowlisted, size-bounded, hash-pinned files. External textures and buffers are rejected.

For experiments use `--root ABSOLUTE_SANDBOX_PATH`. This means the entire input/output root, not merely an output directory. Seed the sandbox with copies of `data/sources/*.json` and `data/raw/assets/` (the committed `data/artifacts/assets/` can supply that raw cache), then run `all --root ... --offline`. The numbered processing script prepares this sandbox. Canonical release export is an explicit operator action.

## Verification boundaries

Thirteen pipeline tests cover read-only canonical verification, full deterministic sandbox export, corrupted/missing cached files, unapproved origins, non-CC0 licenses, path traversal, missing translation/source references, forbidden orchid lifecycle/seed mappings, actual triangle counts, external texture references and stale/unexpected artifacts. They use temporary directories and do not regenerate canonical output.

GLB inspection verifies the envelope, declared topology, self-contained assets and registry fingerprints; browser decoding/rendering still requires the frontend QA suite. Source links support the explanations but do not automatically license their illustrations or full prose. Only the identified CC0 specimen assets are redistributed. Original teaching geometry is a separate explanatory layer, and the general lifecycle does not represent orchid germination.
