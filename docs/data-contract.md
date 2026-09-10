# Source and artifact contracts

The atlas validates source content and published data. Silent coercion must not change what a specimen represents.

## Source contract

catalog-source.json contains sources, specimens, structures and journeys. Localized fields have nonempty en/es values. IDs are unique; references resolve; structure membership is explicit (general/orchid). The asset lock records URL, variant, bytes, SHA-256 and rights evidence.

Journey steps use supported mode/model/specimen/compare/component IDs and bounded explosion, cut, cutEnabled and stage values. Invalid or contradictory records fail instead of opening an unrelated object.

## Artifact contract

Catalog schemaVersion is 1. Source contains id/label/citation/url. Specimen contains id/scientificName/localized commonName/description/facts/sourceIds/credit and preview/detail. Variants carry path/sha256/bytes/triangles. Structure carries id/localized label/group/models/summary/detail/sourceIds. Journey carries id/localized title/question/summary/sourceIds and ordered steps with localized title/body/view.

The TypeScript mirror is frontend/src/lib/catalog.types.ts. Runtime validation checks shape/references rather than trusting a type assertion. The collection UI reads these records directly.

## Microscopic atlas

The separately versioned [microscopic contract](micro-atlas-contract.md) preserves the original collection schema. Four source-linked branches form a validated, reciprocal, acyclic hierarchy. Every node has English/Spanish labels and explanations, an explicit biological kind and an illustrated evidence classification. The accompanying integrity sidecar is verified before browser use. The original museum manifest remains unchanged; the exact micro and living artifact pairs are separately verified beside it.

## Connected exploration and notebook

The primary living experience uses separately validated `living-content.json` and
`living-content.integrity.json`. This exact pair contains the source-backed four-node
sunflower ray/mesophyll/cell/chromoplast chain. Python and TypeScript validate the
same hierarchy, bilingual fields and credential-free HTTPS citations. The browser
checks byte length and SHA-256 before use. These two filenames are admitted beside
the original museum manifest and the preserved micro pair; unexpected or partial
artifacts fail verification.

`living.ts` bounds real-valued travel to 0..4, opening/activity to 0..1 and form/path
to known identifiers. `livingNotebook.ts` accepts only its version-one
`floraria-living` envelope, valid bounded state and at most 12,000 note characters
within a 64 KB UTF-8 file. Import backs up the previous view and exposes a restore
action. The shared URL contains only view coordinates; private notes are excluded.
Original studio notebook formats remain separate and unchanged.

frontend/src/lib/exploration.ts wraps the original bounded viewer state with a five-level depth, one of four microscopic branches, selected node, bounded process position, guided-step position and optional notes. JSON files identify FLORARIA and schemaVersion 2. Imports reject unsupported products and files over 64 KB; version-one files retain their original viewer state. Notes are limited to 10,000 characters and excluded from share URLs. Unknown selections, malformed links and unsupported levels recover through explicit bounds rather than reaching renderer code unchecked.

## Geometry, units and missing data

Use supported self-contained glTF 2.0 GLBs and inspect actual metadata/extensions. Normalized framing is dimensionless presentation; undocumented scale must not become invented millimeters. Missing scale is a limitation, not zero.

A single scan mesh implies no organ segmentation. Interior anatomy belongs to explicitly authored geometry. Corrupt bytes, invalid dimensions/counts, unknown references and incompatible extensions need actionable rejection.

Add new evidence and locked assets, validate in a sandbox, inspect renders and update artifacts/manifest together. See [acquisition](guides/02_acquisition-and-extension.md). Changing hashes merely to bypass rejection defeats the contract.
