# Plain Python tooling

Run python data-pipeline/run.py by path. The product is not pip-installed. Root pyproject.toml configures tools rather than declaring a library.

A repository environment pins dependencies. Network acquisition is explicit and source-locked. Verification is read-only over canonical outputs. Sandbox roots permit corruption/repeatability checks without replacing evidence.

The registry is structured source data; names/comments/current websites do not replace versioned fields. Normalize into the artifact contract, retain transformations and generate manifest facts from actual files.

Read [source processing](../architecture/04_source-processing.md) and [pipeline commands](../../data-pipeline/README.md). Build/deploy consume canonical artifacts. Cache reuse still validates integrity.
