import type { NoiseFunction3D } from 'simplex-noise'

export interface CurlHelpers {
  curlX: (x: number, y: number, z: number) => number
  curlY: (x: number, y: number, z: number) => number
  curlZ: (x: number, y: number, z: number) => number
}

const EPS = 1e-3

/**
 * Divergence-free curl-noise helpers over three offset potentials of one
 * simplex noise instance, via central differences.
 *
 * A one-entry position cache makes curlX/curlY/curlZ share the 18 noise
 * evaluations when the vx/vy/vz expressions sample the same point (the
 * common case: all three components call curl*(x*freq, ...) in one field
 * evaluation).
 */
export function makeCurlHelpers(noise: NoiseFunction3D): CurlHelpers {
  const p1 = (x: number, y: number, z: number) => noise(x, y, z)
  const p2 = (x: number, y: number, z: number) => noise(x + 31.4, y + 5.9, z + 27.1)
  const p3 = (x: number, y: number, z: number) => noise(x - 12.3, y + 44.2, z + 8.5)

  let cx = NaN, cy = NaN, cz = NaN
  const out = [0, 0, 0]

  const compute = (x: number, y: number, z: number) => {
    if (x === cx && y === cy && z === cz) return out
    const inv = 1 / (2 * EPS)
    const dp3dy = (p3(x, y + EPS, z) - p3(x, y - EPS, z)) * inv
    const dp2dz = (p2(x, y, z + EPS) - p2(x, y, z - EPS)) * inv
    const dp1dz = (p1(x, y, z + EPS) - p1(x, y, z - EPS)) * inv
    const dp3dx = (p3(x + EPS, y, z) - p3(x - EPS, y, z)) * inv
    const dp2dx = (p2(x + EPS, y, z) - p2(x - EPS, y, z)) * inv
    const dp1dy = (p1(x, y + EPS, z) - p1(x, y - EPS, z)) * inv
    out[0] = dp3dy - dp2dz
    out[1] = dp1dz - dp3dx
    out[2] = dp2dx - dp1dy
    cx = x; cy = y; cz = z
    return out
  }

  return {
    curlX: (x, y, z) => compute(x, y, z)[0],
    curlY: (x, y, z) => compute(x, y, z)[1],
    curlZ: (x, y, z) => compute(x, y, z)[2],
  }
}
