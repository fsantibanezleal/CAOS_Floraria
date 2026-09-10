# Local workflow

The paired PowerShell and Bash scripts share one Python command implementation. Python 3.13 and Node.js 22 or 24 are supported. The project declares no Python package and no runtime server.

1. Run `scripts/local/00_install-prereqs.ps1` to check existing Python, Node, npm and Git. This never installs or replaces system software.
2. Run `scripts/local/01_init.ps1` to create or reuse `.venv`, install the development requirement file, materialize `.env` only when missing, verify existing canonical artifacts or acquire/process the initial data, and install frontend dependencies with the committed npm lockfile.
3. Run `scripts/local/03_dev.ps1` to open the local Vite service at `http://127.0.0.1:5902`. The script occupies the terminal and refuses to silently take another port.

Bash equivalents use the same names ending in `.sh`. The flat `scripts/setup.*` and `scripts/dev.*` commands remain equivalent entry points.

## Data regeneration

`scripts/local/02_generate-data.ps1` defaults to `build/local`, seeds that sandbox with committed source metadata and packaged source assets, and runs the complete pipeline offline. It never overwrites the canonical result by default. The explicit `--release` flag regenerates canonical artifacts and must be followed by artifact validation, review and a scoped commit.

## Validation and preview

```powershell
scripts/test.ps1
scripts/build.ps1
scripts/preview.ps1
```

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/preview.sh
```

Tests validate source/artifact contracts, exercise processing and release packaging in temporary sandboxes, and run the frontend tests. Build repeats these gates, performs the TypeScript/Vite build, checks the static release and records its immutable file digest. Preview serves the result at `http://127.0.0.1:4902`.

The smoke command checks deployed transport and release identity. Full rendered browser testing remains a separate release gate; a successful HTTP response is not a visual or scientific validation.

## Browser integration

Keep the dev server or preview that you started running in a separate terminal. The browser suite never
launches a server or changes its port. Run the first integration check with an explicit Chromium download:

```powershell
scripts/verify-ui.ps1 --url http://127.0.0.1:4902 --install-browser --browser-cache build/playwright
```

```bash
./scripts/verify-ui.sh --url http://127.0.0.1:4902 --install-browser
```

Later runs omit `--install-browser` and use the same cache. `--browser-cache` overrides
`PLAYWRIGHT_BROWSERS_PATH`; the default is ignored `build/playwright`. Chromium comes from the locally
pinned Playwright dependency, installed by `npm ci`. No system browser is installed or changed. On Linux,
install the OS libraries required by Playwright through the workstation's normal administrator workflow
if Chromium reports missing dependencies; the launcher never performs a privileged system installation.

`--url` selects an HTTP(S) origin. If omitted, the launcher uses `FLORARIA_QA_URL` or
`http://127.0.0.1:5902`. For production use `--url https://floraria.fasl-work.com` after deploying.
Screenshots, exports and the integration receipt go to `build/qa/atlas`, configurable with
`FLORARIA_QA_DIR`. The underlying command is `npm --prefix frontend run test:browser`; that direct
entry point reads the same environment variables but uses Playwright's normal cache default unless
`PLAYWRIGHT_BROWSERS_PATH` is set. The paired launcher explicitly sets the local project cache.

The suite inspects actual WebGL views and controls, catalog variants, state import/export and rejection,
guided investigations, languages/themes, page navigation, phone layouts, console and response failures.
Review the resulting screenshots as well as the machine report. It is intentionally separate from unit
tests because it needs a running site, browser installation and more rendering resources.

See [the delivery runbook](../../deploy/README.md) for immutable release packaging, first-time TLS bootstrap, promotion and rollback.
