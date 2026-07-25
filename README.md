# Streamline Loops

Generate looping animations of formula-defined 3D objects: streamlines traced
through a vector field, rendered as lit tubes or meshline ribbons, with the
camera orbiting 360° around the stationary object for a seamless loop.
Reference look: `reference/Screenshot 2026-07-24 at 3.55.44 PM.png`.

```bash
npm install
npm run dev
```

## How it works

1. You define a **vector field** with three expressions (vx, vy, vz) over
   `x, y, z` — either via the preset dropdown or by typing formulas directly
   in the Leva panel (any edit flips the preset to *Custom*). Starters:
   *Curl Vortex Disc* (the reference look), *Curl Dome*, *Vortex Array*,
   *Torus Flow*, *Magnetic Dipole*, *Lorenz Attractor*, *Tornado*,
   *Galaxy Spiral*, *ABC Flow*, *Wind Ribbons*, *Sink + Swirl*, plus
   top-down designs (flat 2D fields — pair with the eased top-down camera
   and orthographic projection): *Star Mandala*, *Wave Interference*,
   *Whirlpool*, *Flat Curl*, *Vortex Quilt*, *Tree Rings*.
2. Seed points are scattered in a region (disc / sphere / box) with a seeded
   RNG, then integrated through the field (RK4 or Euler) into polylines.
3. Optionally the traced lines are **cut by a bounding shape** (Clip folder:
   sphere / box / cone / pyramid, sized and offset vertically) — lines are
   split into their inside runs with the exact boundary crossing
   interpolated, so cut edges are clean. Applies instantly, no re-trace.
4. All polylines are merged into **one geometry / one draw call** — either
   shaded tubes (parallel-transport frames, casts soft shadows) or
   [meshline](https://github.com/pmndrs/meshline) ribbons (flat plotter look).
5. Projection is switchable between **perspective** and **orthographic**
   (`orthoScale` sets the visible world height; distant ground fades into
   fog). Camera modes: **orbit** (constant elevation), **eased top-down** (starts
   looking straight down, sweeps down to `minElevation` and back over one
   loop while circling — `easePower` shapes the dwell, camera distance
   auto-tracks object size + `distanceOffset`), or **free (mouse)**
   OrbitControls. One loop per `loopSeconds`. **Record loop** re-renders one
   full orbit frame-by-frame (`frameloop: 'never'` + manual `advance`) and
   encodes it with [mediabunny](https://github.com/vanilagy/mediabunny) —
   frame-perfect MP4 (H.264, WebM fallback) or a zip of PNG frames.
   Frame `i` uses phase `i / totalFrames`, so the video loops seamlessly.
   Options: base resolution up to 4K, a 1×/1.5×/2× pixel-scale multiplier,
   30/60 fps, durations 2–20 s or a custom length, and encoder quality
   (draft / good / high / max).

Same seed + same formula ⇒ identical object, every time.

## Formula scope

Expressions can use:

- `x, y, z` — position; `t` — reserved (0 for now)
- `curlX(x,y,z)`, `curlY`, `curlZ` — divergence-free curl noise (seeded);
  the three calls share one evaluation when sampled at the same point
- `noise(x,y,z)` — seeded 3D simplex noise
- `freq`, `amp` — the `noiseFrequency` / `fieldScale` panel values
- math: `sin cos tan atan2 asin acos abs sign sqrt pow exp log min max floor
  round clamp(v,lo,hi) mix(a,b,u) length(x,y,z) smoothstep(lo,hi,v) PI TAU E`

Example (the default preset):

```text
vx: curlX(x*freq, y*freq, z*freq) * amp
vy: curlY(x*freq, y*freq, z*freq) * amp * 0.15   ← flattened → disc of vortices
vz: curlZ(x*freq, y*freq, z*freq) * amp
```

Errors (syntax or non-finite values) show in a red banner; the last good
object keeps rendering.

## Source map

```text
src/lib/
  trace.ts      seeding + RK4/Euler streamline integration (pure data in/out)
  fields.ts     curl-noise helpers (central differences over 3 offset potentials)
  formula.ts    expression compiler (new Function + probe validation)
  clip.ts       SDF bounding-shape cut (sphere/box/cone/pyramid) of polylines
  tubes.ts      merged parallel-transport tube geometry builder
  meshlines.ts  N × MeshLineGeometry → mergeGeometries → one mesh
  recorder.ts   frame-stepped capture → mediabunny MP4/WebM or fflate PNG zip
  presets.ts    presets as editable expression strings
src/components/
  Scene.tsx     Canvas, PCSS soft shadows, lights, ground, renderer switch
  CameraRig.tsx setCameraAngle(camera, u) — shared by preview + recorder
```

Notes: generation is synchronous (~150 ms at defaults, debounced 300 ms);
`trace.ts` is pure data-in/out so moving it to a Worker is a drop-in upgrade
if you push the sliders to the max.
