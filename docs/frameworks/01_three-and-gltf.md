# Three.js and glTF

Three.js renders, rather than infers botanical anatomy. Its scene graph supports named authored groups; GLTFLoader reads scans; DRACOLoader decodes their geometry. Reuse the decoder, host pinned resources locally and bound worker count.

Orbit/camera changes observation. Raycasting resolves a mesh to its component identifier. Clipping changes visibility. Neither creates missing scientific evidence.

Viewer.tsx owns renderer lifetime, asynchronous loads and GPU cleanup; botany.ts owns authored structure. Idle rendering is demand-driven and motion bounded/user-controlled. The dependency lockfile supplies exact versions. Install through the frontend manifest, not globally.

Run frontend tests/build, then inspect the real browser. Compilation cannot establish model appearance or usable picking.

Official references: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [DRACOLoader](https://threejs.org/docs/pages/DRACOLoader.html), [Raycaster](https://threejs.org/docs/pages/Raycaster.html), [glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
