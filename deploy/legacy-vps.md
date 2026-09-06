> Historical VPS implementation, retained to preserve prior work. The active publishing target is GitHub Pages; see [current delivery](README.md). These commands are explicitly manual legacy operations and are never run by the Pages workflow. They must not be used after the old host has been retired.

# Historical Floraria VPS delivery

The original private-source release used a public anonymous nginx site at `https://floraria.fasl-work.com`. That historical implementation serves an immutable artifact directory through `/var/www/<domain>/current`. The source is being published with its original history; this runbook describes the preserved former delivery mechanism, not the current Pages host. There is no runtime account system, API, application process, database, provider credential or visitor login.

## Operator inputs

Set `FLORARIA_SSH_KEY` to an existing operator-managed identity file, `FLORARIA_SSH_TARGET` to `user@host`, and optionally `FLORARIA_DOMAIN` to the public hostname (default `floraria.fasl-work.com`). The SSH identity remains outside the repository. Scripts use the existing known-host trust store with strict host-key checking; they do not disable verification, discover credentials or save keys. The operator must be authorized to modify the selected nginx host.

The host needs nginx, Python 3, OpenSSH, `flock`, and certbot with its nginx plugin. First-time domain bootstrap also requires existing DNS to resolve to that host and a reachable HTTP challenge. No paid provider or new subscription is required. This runbook does not assume the production host has unlimited disk.

## Review and package

Release commands require an exact 40-character `--revision` equal to the current HEAD and a clean worktree, including untracked non-ignored files. By default the script refreshes `origin/main` and verifies that it contains the revision. If a different exact revision is explicitly approved by the operator, `--approved-sha` must exactly equal that same revision; it is an explicit approval record, not an automatic fallback.

```powershell
scripts/package-release.ps1 --revision <exact-40-character-sha>
```

```bash
./scripts/package-release.sh --revision <exact-40-character-sha>
```

The command runs all tests and builds from the verified source, then creates a deterministic archive and SHA-256 sidecar under `build/releases/`. `release.json` identifies the exact revision, display version and SHA-256/byte inventory of every built file. A recorded build digest prevents changes to an ignored `dist` file from being packaged unnoticed. The release identifier combines version, source revision and artifact-tree digest. Reusing an identifier with different bytes is refused.

## First deployment

Complete the concrete artifact review before invoking deployment. Set the operator environment variables in the current shell, then run:

```powershell
scripts/legacy-vps-deploy.ps1 --revision <exact-40-character-sha> --bootstrap --certificate-email <operator-email>
```

```bash
./scripts/legacy-vps-deploy.sh --revision <exact-40-character-sha> --bootstrap --certificate-email <operator-email>
```

The explicit bootstrap flag creates only the new hostname configuration, refuses an existing configuration or hostname claim, validates nginx, obtains a Let's Encrypt certificate using certbot, and validates/reloads nginx. Its temporary empty root is replaced by the verified release immediately afterward. If bootstrap fails, inspect the reported stage before retrying; it never overwrites an existing hostname configuration.

Subsequent deployments omit `--bootstrap` and `--certificate-email`:

```powershell
scripts/legacy-vps-deploy.ps1 --revision <exact-40-character-sha>
scripts/smoke.ps1 --url https://floraria.fasl-work.com
```

```bash
./scripts/legacy-vps-deploy.sh --revision <exact-40-character-sha>
./scripts/smoke.sh --url https://floraria.fasl-work.com
```

Uploads use a remote root-owned private `mktemp` directory (0700), so a predictable shared temporary
filename cannot be replaced by another local user. The installer checks the directory ownership/mode and
rejects symlinked upload paths. Bootstrap takes the same domain lock and refuses any existing site root,
configuration path or dangling symlink; it creates the new configuration exclusively.

The installer locks this domain, checks the archive SHA-256, rejects path traversal/links/duplicate entries, checks disk headroom, extracts to a separate staging directory, and verifies the full file inventory. Only then does it atomically replace `current` with a symlink to the new immutable release. nginx is checked before and after switching. A failed post-switch check restores the previous release when one exists. Historical releases are retained; no retention cleanup happens implicitly. The successful upload directory is removed when empty. Failed uploads/staging remain for explicit operator inspection.

The local command verifies the public HTTPS release identity after installation. Verify the rendered production app, keyboard/touch controls, both languages/themes, assets, console and network state before calling the release delivered. GitHub Quality CI validates both supported Node versions and uploads a reviewable static artifact; it does not hold SSH credentials or deploy automatically.

## Exact rollback

Choose the exact existing release identifier from the prior successful receipt or server release directory. Rollback validates its entire immutable file inventory and nginx configuration before switching. It never rebuilds an older revision from current dependencies.

```powershell
scripts/legacy-vps-rollback.ps1 --release-id <existing-vX.XX.XXX-revision-digest>
```

```bash
./scripts/legacy-vps-rollback.sh --release-id <existing-vX.XX.XXX-revision-digest>
```

Verify public release identity and rendered behavior again after rollback. A TLS, DNS or upstream host incident cannot be repaired merely by switching a static artifact.
