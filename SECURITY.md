# Security

FLORARIA serves static code and public assets. No visitor account, runtime API secret or database is required. Bookmarks stay in browser storage; sharing/export deliberately carries a view.

Report vulnerabilities privately to the owner through GitHub private reporting where available, or contact information on [the author's site](https://fsantibanezleal.github.io). Do not publish credentials, personal data or private files.

Include version/browser, a minimal reproduction and impact. Integrity reports should identify asset path and observed hash. The maintained line is 0.01.x; no response-time commitment is implied.

Imported JSON/URL state is untrusted until its bounded schema passes. Catalog IDs/references must resolve. Acquisition must match locks; mismatch is not bypassed. External documentation is reference material, not executable input. Deployment settings stay outside the browser.

The public source and its preserved history are intended for inspection. Keep
operator credentials, private operational records and personal files outside
this repository. Required third-party attribution is preserved in the source
and the built notices; see [the redistribution record](LICENSES.md).

GitHub Pages publishes only the verified static artifact. Its workflow uses
short-lived GitHub OIDC permissions in the protected `github-pages` environment;
no SSH identity or runtime API secret is required. A matching release manifest
detects changed bytes; it is not a cryptographic authorship signature.

The generated HTML applies a same-origin CSP before loading resources, with
explicit WebAssembly/blob support for the 3D renderer and local image exports.
Meta CSP cannot enforce `frame-ancestors` or configure arbitrary HTTP security
headers. Pages controls those response headers. See the exact limitations and
verification requirements in [delivery](deploy/README.md).

This atlas does not process patient data or identify plants automatically.
