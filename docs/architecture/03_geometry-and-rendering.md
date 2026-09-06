# Geometry and rendering

Self-contained GLBs carry geometry, materials and images. Inspection records nodes, meshes, extensions and index-derived triangles. Filenames are not authoritative counts. Fidelity variants remain one specimen.

[glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) defines structure; [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) reads it; [DRACOLoader](https://threejs.org/docs/pages/DRACOLoader.html) decodes geometry. Reuse the decoder and local versioned resources with bounded concurrency.

$$\mathbf{x}_{view}=s(\mathbf{x}-\mathbf{c}).$$

Center c and scale s keep point x visible; they do not turn undocumented coordinates into millimeters. Comparison concerns arrangement/appearance, not equal physical size.

Authored groups expose component IDs. Picking resolves written records. Isolation changes visibility; explosion changes transforms; clipping removes a half-space:

$$\mathbf{n}\cdot\mathbf{x}+d=0.$$

n is the plane normal, d its signed offset. A clipped scan does not reveal internal tissue. See [Raycaster](https://threejs.org/docs/pages/Raycaster.html) and [Plane](https://threejs.org/docs/pages/Plane.html).

Render on demand when idle, bound playback, dispose replaced GPU resources and cancel stale loads. Errors preserve readable context. Measure browser/device/viewport/cache/fidelity before reporting performance; bytes/triangles alone are not FPS evidence.
