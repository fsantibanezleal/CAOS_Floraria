# Living exploration: continuous geometry and context

Status: implemented for v0.05.000; rendered correction and release gates remain in progress. The deployed v0.04.000 is a preserved, user-rejected checkpoint. Its passing technical checks did not establish that its forced travel and simultaneous models met the requested experience.

## Decision and evidence

The default application is a persistent three-dimensional botanical scene. It
presents one selected authored form at a time: a radial flower, a bilateral orchid,
or a sunflower head composed of ray and disc florets. Direct selection of rendered
parts changes the active pathway and explanatory context without leaving the scene.
These are explicit teaching models, not anatomical reconstructions of the retained
Smithsonian surface scans. Their internal illustrative pathways do not purport to
be segmented species-specific microscopy. The sunflower colour pathway separately
represents the source-informed mesophyll/chromoplast compartment, instead of the
generic anthocyanin/vacuole example. See [the research record](../research/living-scene.md).

The reference [Human Atlas](https://github.com/ashemag/human-atlas) was reviewed in
source and in its deployed browser interface. Its strength is the spatial continuity
of many individually identifiable meshes, continuous decomposition, meaningful
selection and framing. Its wheel interaction changes camera distance; it does not
claim cellular semantic zoom. Floraria's additional continuous-reveal requirement
comes directly from the user.

Primary morphology sources are Kew's [sunflower profile](https://www.kew.org/plants/sunflower)
and [Orchidaceae description](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30000046-2/general-information).
The four connected internal pathways transcribe the evidence and boundaries in
[the microscopic source dossier](../research/micro-atlas.md). Source illustrations,
photographs and third-party geometry are not copied into the authored models.

## Interaction contract

- Point and wheel, trackpad or pinch travel into the structure under the pointer.
  Opening surfaces, connected tissue and cells emerge during that same gesture.
  No menu selection or click is necessary to enter a deeper representation.
- Continuous depth is a bounded real number, not an index that replaces one canvas
  with another. Camera position, target, reveal geometry and context follow it.
  Intermediate positions remain visible, reversible and explorable.
- Parent structures remain spatial anchors while finer geometry resolves inside.
  Cells and compartments use real three-dimensional geometry. A fade between flat
  images does not meet this contract.
- The scene includes active explanatory routes and a visible pause control.
  Opening and process controls change geometry. Animation shows sequence and
  location; it does not assert measured times, flow rates or predicted physiology.
- On-screen context follows the represented structure automatically. Evidence and
  limits remain accessible without making a catalog or two sidebars the primary flow.
- The instrument fills the viewport. Tool containers remain fixed; overflow belongs
  to a named inner reading container. Keyboard and single-pointer controls provide
  equivalents for wheel/pinch interaction. Reduced-motion preferences are respected.
- The previous collection, notebooks, linked records, scans and source history remain
  available. No original data or paid work is deleted.

## Acceptance evidence required

Browser checks must drive wheel and pinch through intermediate depths without
clicking level controls; verify connected geometric reveal, changing explanations,
reversal, distinct forms, visible process changes and pause. Inspect rendered desktop
and phone views in both themes, verify viewport fit and focus, and test preserved
collection/notebook paths. A green build alone is not evidence of this experience.

Public delivery remains the existing GitHub Pages custom domain. No new VPS service,
account, paid API, private data or runtime secret is introduced.

## Rendering responsiveness

The first Linux software-WebGL run exposed stalls when resuming motion and restoring
a distant saved depth. The correction retains all original scene objects but omits
fully transparent enclosing macro meshes from GPU submission after their continuous
retraction/fade. Returning outward restores the same objects. Active tissue and
compartment geometry remain visible. Rendering is paced to at most about30frames/s,
and sustained slow frames lower drawing-buffer pixel ratio while CSS layout, text
and the geometric hierarchy remain unchanged. Paused stable views render on demand.
Camera convergence uses elapsed time at low frame rates, verified at2,5,30,60and120Hz,
instead of silently slowing travel with a per-frame time cap. Browser receipts record
pause latency and actual render workload; these are not physical-device benchmarks.
