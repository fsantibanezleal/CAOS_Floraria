# License and redistribution record

Licenses attach to particular material. Code, original explanations, digitized assets and external pages are separate works.

Every web build includes `/third-party-notices.txt`, assembled from the actual locked runtime packages and the Draco Apache-2.0 terms. The release inventory verifies its bytes along with the served application.

| Material | Terms and boundary |
|---|---|
| FLORARIA code, original documentation and diagrams | Apache License 2.0 under root LICENSE; no rights to cited third-party works implied |
| Selected Smithsonian bloom GLBs and compact variants | CC0 1.0 for specific Open Access records; retain item evidence in the source lock |
| Botanical pages/articles/guides | Referenced for original explanation; their full text/illustrations are not mirrored |
| Three.js/Draco and frontend dependencies | Upstream notices apply to actual locked/bundled versions |
| Shared shell | Its upstream package license applies separately |

The locked shared-shell release 0.6.2 has an upstream inconsistency: npm metadata
labels it MIT, while its bundled `LICENSE` contains Apache-2.0 terms. The build
preserves the included license verbatim in `third-party-notices.txt`; FLORARIA
does not relabel that dependency or remove its notices. The package tarball is
publicly downloadable without authentication. This discrepancy should be
resolved upstream before changing that dependency's license declaration here.

CC0 does not imply endorsement or grant trademark rights. Related museum images/videos/essays do not automatically share selected-media terms. Preserve credits.

No Human Atlas code or assets were copied. It was an interaction reference in the brief.

Before adding an item, establish its exact URL, item rights, credit and hash. If rights remain uncertain, link without mirroring. Public accessibility is not redistribution permission. See [attribution](ATTRIBUTION.md), data/sources/assets.lock.json and [the contract](docs/data-contract.md).
