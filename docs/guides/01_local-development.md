# Local development

Prerequisites: Git, Python 3.13, Node 22 or 24 and npm. Use repository environments/lockfiles.

~~~powershell
./scripts/setup.ps1
python data-pipeline/run.py all
npm --prefix frontend run dev
~~~

Paired shell scripts and numbered local steps cover prerequisites, initialization, generation and development. See [local scripts](../../scripts/local/README.md).

~~~sh
npm --prefix frontend run check
npm --prefix frontend run test
npm --prefix frontend run build
python data-pipeline/run.py verify
~~~

Acquisition needs network unless the verified cache is present and --offline is selected. Investigate checksum failure rather than bypass it.

Open the dev-server URL, follow every route, change specimen/anatomy controls, open investigations, switch language/theme and inspect the architecture dialog. TypeScript success does not prove a GLB decoded or a diagram is readable.

Use preview after a build for a production-shaped check. Keep environments, raw caches and temporary screenshots out of canonical artifacts.
