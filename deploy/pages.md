# GitHub Pages publication

The application and committed artifacts are served statically. There is no backend at request time. The workflow `.github/workflows/deploy-pages.yml`:

1. verifies the locked source, canonical artifacts, tests and exact selected source revision;
2. builds the frontend with locked dependencies; copy-data.mjs copies verified data/artifacts and local decoders;
3. stages build/pages with a CSP, real direct-route files and a complete release manifest;
4. uploads the validated Pages artifact and deploys with scoped Actions permissions.

One-time setup enables GitHub Actions as the Pages source and configures the custom domain through repository Pages settings. A CNAME file alone does not set the domain for Actions deployments. The complete [publication runbook](README.md) records configuration, verification and rollback.

The original VPS tooling is retained under the [legacy deployment procedure](legacy-vps.md). It is not the current publishing path. Builds never redownload the museum collection or silently regenerate canonical evidence.
