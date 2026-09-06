# Floraria commands

Use the numbered [local workflow](local/README.md) for a fresh clone. Every local command has equivalent PowerShell and Bash launchers; both call the same standard-library Python implementation.

| Command | Purpose |
|---|---|
| `setup.ps1` / `setup.sh` | Reuse/create Python 3.13 environment, preserve `.env`, validate existing artifacts or process initial data, install locked frontend dependencies. |
| `dev.ps1` / `dev.sh` | Run local Vite at port 5902 with strict port ownership. |
| `test.ps1` / `test.sh` | Check content, source boundaries, artifact integrity, Python sandbox tests and frontend tests. |
| `build.ps1` / `build.sh` | Run release gates, build TypeScript/Vite and record immutable built-file metadata. |
| `preview.ps1` / `preview.sh` | Serve the verified production build at port 4902. |
| `verify-ui.ps1` / `verify-ui.sh` | Run real Chromium integration checks against an explicitly chosen running site; optional explicit browser installation and configurable cache. |
| `precompute.ps1` / `precompute.sh` | Data-agent pipeline wrapper; see the pipeline contract and local sandbox workflow before regenerating canonical artifacts. |
| `package-release.ps1` / `package-release.sh` | Build and package one exact trusted clean source revision. |
| `deploy.ps1` / `deploy.sh` | Install an immutable archive via operator-supplied SSH environment; optional explicit first-time TLS bootstrap. |
| `rollback.ps1` / `rollback.sh` | Restore one exact already-existing validated release. |
| `smoke.ps1` / `smoke.sh` | Check public HTTPS transport and release identity; does not substitute for rendered QA. |

`check_artifacts.py` verifies canonical files without regeneration. `check_release.py` checks display/semantic version consistency, required community files, forbidden package metadata, static-artifact hygiene and optional executable Git modes. `check_content_standards.py` checks tracked and untracked non-ignored source text for banned dashes/pictographic emoji. `check_template_residue.py` retains the archetype example/residue markers and refuses an unremoved template sentinel in this instantiated product.

No backend API, visitor authentication, internal Python package or provider secret is required. See [the delivery runbook](../deploy/README.md) for release trust, atomic switching, TLS and rollback.

Browser QA is `scripts/verify-ui.ps1 --url http://127.0.0.1:4902` (or `.sh`) after starting the matching
preview in another terminal. Its first run needs explicit `--install-browser`; optional `--browser-cache`
or `PLAYWRIGHT_BROWSERS_PATH` selects the cache, otherwise it uses ignored `build/playwright`. It calls
`npm --prefix frontend run test:browser`, which runs `frontend/verify-atlas.mjs`. It starts no server and
installs no browser unless requested. Detailed desktop/phone screenshots and receipts are written to
`build/qa/atlas` or `FLORARIA_QA_DIR`. See [local testing instructions](local/README.md#browser-integration).
