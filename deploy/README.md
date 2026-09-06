# GitHub Pages delivery

The publishing target is **https://floraria.fasl-work.com**, served as a
self-contained static artifact by GitHub Pages. Source, history and original
release evidence are preserved. No visitor login, server process, private npm
package access or browser API key is required. A configured workflow is not a
deployment receipt: verify the successful Actions deployment and public bytes
before describing a revision as live.

## One-time repository configuration

After the source-publication audit, an authorized repository administrator
configures Pages to use **GitHub Actions** and sets the custom domain to
`floraria.fasl-work.com`. The DNS CNAME points directly to
`fsantibanezleal.github.io`. Enable **Enforce HTTPS** when GitHub has provisioned
the certificate. The workflow deliberately uses `enablement: false`; it does
not change repository visibility, create a Pages site or claim an unconfigured
domain. The build refuses any other hostname or a repository subpath.

GitHub Pro supports Pages in private repositories too. Making this product
public is the owner's source-publication choice; it is not a prerequisite
imposed by that plan. The custom workflow requires Pages to be enabled first.
See [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
With Actions publishing, the custom domain is repository Pages configuration;
a DNS record or an artifact CNAME file alone does not enable publishing. See
[GitHub's custom-domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Build, inspect and publish

Run setup once, then the full local checks and build:

```powershell
scripts/build.ps1
scripts/prepare-pages.ps1
```

```bash
bash scripts/build.sh
bash scripts/prepare-pages.sh
```

The second command stages `frontend/dist` into ignored `build/pages` without
modifying canonical data or the original build. Local dirty builds are marked
`floraria-local-build/v1` with `source_clean: false`; they cannot pass the
publishing guard. For a reviewed clean commit, use
`--require-clean --revision <exact-40-character-sha>`. An ordinary static server
can preview `build/pages` directly; use an available local port and run the
browser QA against that origin. This tests actual directory-based route files
and meta CSP, unlike Vite's development fallback.

[The workflow](../.github/workflows/deploy-pages.yml) publishes only `main`.
Each main push runs the canonical artifact checks, Python and frontend tests,
build and exact-SHA clean-tree validation. Python 3.13 and Node 24 are used for
publication; Quality CI also tests Node 22. Actions are pinned to complete
commit IDs. The build job has only read permissions; only the isolated deploy
job receives `pages: write` and `id-token: write` through the `github-pages`
environment. No long-lived deployment credential is used.

An operator can explicitly request a deployment of the already-promoted main
revision with GitHub CLI authentication:

```powershell
scripts/deploy.ps1 --revision <exact-40-character-sha>
```

```bash
bash scripts/deploy.sh --revision <exact-40-character-sha>
```

This dispatches the same Pages workflow; it does not use SSH. Both the local
command and workflow compare the requested SHA to main to reject a race or
wrong revision. A dispatch message alone does not establish success.

## Routes and integrity

[pages-routes.json](pages-routes.json) declares the supported deep links.
Preparation writes a real `index.html` under each route directory, so a direct
visit reaches HTML with HTTP 200 after any directory-slash redirect. Query
parameters remain application state. The router normalizes trailing slashes.
`404.html` lets the application show unsupported routes, but its HTTP status
remains 404; it is not used to claim successful deep-link transport.

The final public `release.json` records source revision, source cleanliness,
version, release ID, hosting identity and SHA-256/byte length for every staged
file except itself. It includes all generated route files, final HTML/CSP,
bundled JavaScript, fonts, Draco decoders, catalog, GLBs and third-party notices.
The tree digest is calculated after staging. The workflow preserves a separate
release-identity artifact for 30 days and the deployable Pages artifact for
seven days. These retention periods are recovery windows, not permanent backup.

After publication, verify default TLS, HTTP-to-HTTPS behavior, the exact
revision and every public file hash against `release.json`. Open the root and
every declared route unauthenticated; exercise real controls, mobile/desktop,
languages/themes, state imports/exports, catalog/models, console and network.
All runtime assets must come from the site origin. Public citation links may
navigate externally when the visitor chooses them. Preserve the transport and
rendered receipts for the published revision before retiring any previous host.

## Security policy on Pages

Preparation inserts CSP immediately after the opening head tag, before any
resource element. Scripts and network assets are same-origin. WebAssembly and
blob workers/textures are explicitly allowed for Draco and GLTF; blob/data
images support local exports. Inline scripts, remote executable resources and
hidden/key files are rejected during preparation. Fonts and dependency code
are bundled in the artifact.

GitHub Pages controls HTTP response headers. The HTML meta policy does not
provide `frame-ancestors`, a CSP report endpoint, X-Frame-Options,
X-Content-Type-Options or Permissions-Policy. Do not carry over guarantees from
the historical nginx deployment to this host. See
[CSP's meta-delivery specification](https://www.w3.org/TR/CSP3/#meta-element).
Capture the actual response headers during production verification.

## Recovery and historical host

For a source regression, revert the reviewed change through the normal branch
and promotion process. The resulting main commit produces a new fully tested
release identity. Where the prior workflow artifact is still retained, an
authorized operator can rerun that run's deployment job and then verify its
exact public identity. Do not rebuild a historical revision from unpinned
dependencies or describe a rebuild as identical without comparing all bytes.

The original VPS tooling and its tested atomic-release implementation remain
in [the historical runbook](legacy-vps.md). Their CLI commands are explicitly
named `legacy-vps-deploy` and `legacy-vps-rollback`; Pages CI cannot call them.
Retiring the old site, timer and files is a separate scoped operation allowed
only after the replacement Pages deployment passes live verification. It is
not performed by this workflow or any local build command.
