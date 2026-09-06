# Build, deploy and rollback

Setup/test/build/preview/smoke/deploy/rollback have paired PowerShell/shell scripts. Their Python helpers own the CLI. Read [deployment instructions](../../deploy/README.md) and [local scripts](../../scripts/local/README.md).

Build runs guards, Python checks and frontend test/build. An immutable release must identify a clean trusted 40-character revision, archive SHA-256 and per-file receipt.

Deploy accepts --revision, with --approved-sha only for the exact explicitly authorized revision. Optional --bootstrap requires the documented certificate configuration. Operator variables are FLORARIA_SSH_KEY, FLORARIA_SSH_TARGET and FLORARIA_DOMAIN, never browser settings. Strict known-host checks remain enabled.

Verify HTTPS/deep links, geometry/catalog, version and identity after atomic activation. Repeat critical pointer/keyboard/persistence flows. Upload success alone is not completion.

Rollback requires --release-id for an existing validated release. It does not rebuild earlier evidence using current sources. Record receipts in [release verification](../architecture/07_release-and-verification.md).
