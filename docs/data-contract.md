# Source and artifact contracts

The atlas validates source content and published data. Silent coercion must not change what a specimen represents.

## Source contract

catalog-source.json contains sources, specimens, structures and journeys. Localized fields have nonempty en/es values. IDs are unique; references resolve; structure membership is explicit (general/orchid). The asset lock records URL, variant, bytes, SHA-256 and rights evidence.

Journey steps use supported mode/model/specimen/compare/component IDs and bounded explosion, cut, cutEnabled and stage values. Invalid or contradictory records fail instead of opening an unrelated object.

## Artifact contract

Catalog schemaVersion is 1. Source contains id/label/citation/url. Specimen contains id/scientificName/localized commonName/description/facts/sourceIds/credit and preview/detail. Variants carry path/sha256/bytes/triangles. Structure carries id/localized label/group/models/summary/detail/sourceIds. Journey carries id/localized title/question/summary/sourceIds and ordered steps with localized title/body/view.

The TypeScript mirror is frontend/src/lib/catalog.types.ts. Runtime validation checks shape/references rather than trusting a type assertion. The collection UI reads these records directly.

## Geometry, units and missing data

Use supported self-contained glTF 2.0 GLBs and inspect actual metadata/extensions. Normalized framing is dimensionless presentation; undocumented scale must not become invented millimeters. Missing scale is a limitation, not zero.

A single scan mesh implies no organ segmentation. Interior anatomy belongs to explicitly authored geometry. Corrupt bytes, invalid dimensions/counts, unknown references and incompatible extensions need actionable rejection.

Add new evidence and locked assets, validate in a sandbox, inspect renders and update artifacts/manifest together. See [acquisition](guides/02_acquisition-and-extension.md). Changing hashes merely to bypass rejection defeats the contract.
