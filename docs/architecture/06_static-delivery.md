# Static delivery

The private source repository delivers a public no-login static HTTPS app. No runtime Python process, database or paid API is needed.

Build validates/copies artifacts. Deploy packages an immutable archive with SHA-256 and per-file manifest, transfers through an operator connection and activates atomically. Rollback selects an existing validated release. [Deployment documentation](../../deploy/README.md) owns exact options.

FLORARIA_SSH_KEY, FLORARIA_SSH_TARGET and FLORARIA_DOMAIN are operator settings, never frontend variables. Their values stay outside browser code and committed examples.

Verify HTTPS, SPA deep links, geometry/catalog requests, source links and exact identity. Upload success or a reachable root is insufficient. Repeat critical controls in both languages/themes.

Rollback activates an earlier immutable artifact rather than rebuild it with current sources. Deployment never replaces locks or reruns acquisition.
