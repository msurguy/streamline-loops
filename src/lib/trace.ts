import type { FieldFn, Polyline, TraceParams } from '../types'
import { mulberry32 } from './rng'

const MIN_SPEED = 1e-6

function seedPoints(params: TraceParams): Float32Array {
  const { seedCount, region, regionRadius, regionHeight, seed } = params
  const rng = mulberry32(seed)
  const pts = new Float32Array(seedCount * 3)
  for (let i = 0; i < seedCount; i++) {
    let x = 0, y = 0, z = 0
    if (region === 'disc') {
      const r = regionRadius * Math.sqrt(rng())
      const a = rng() * Math.PI * 2
      x = r * Math.cos(a)
      z = r * Math.sin(a)
      y = (rng() - 0.5) * regionHeight
    } else if (region === 'sphere') {
      // rejection-sample the unit ball
      do {
        x = rng() * 2 - 1
        y = rng() * 2 - 1
        z = rng() * 2 - 1
      } while (x * x + y * y + z * z > 1)
      x *= regionRadius
      y *= regionRadius
      z *= regionRadius
    } else {
      x = (rng() - 0.5) * 2 * regionRadius
      z = (rng() - 0.5) * 2 * regionRadius
      y = (rng() - 0.5) * regionHeight
    }
    pts[i * 3] = x
    pts[i * 3 + 1] = y
    pts[i * 3 + 2] = z
  }
  return pts
}

/**
 * Integrate streamlines through `field` from seeded start points.
 * Deterministic for a given (field, params). Lines terminate early on
 * near-zero velocity, escape beyond the kill radius, or non-finite values.
 */
export function generatePolylines(field: FieldFn, params: TraceParams): Polyline[] {
  const { steps, stepSize, integrator, uniformSpeed, regionRadius } = params
  const seeds = seedPoints(params)
  const killRadius = Math.max(regionRadius * 3, 4)
  const killSq = killRadius * killRadius
  const lines: Polyline[] = []

  const v = [0, 0, 0]
  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0]

  // Samples the field, optionally normalized to unit speed (direction field
  // → all lines share arc length, matching the reference's even density).
  const sample = (x: number, y: number, z: number, out: number[]): boolean => {
    field(x, y, z, 0, out)
    let m = Math.hypot(out[0], out[1], out[2])
    if (!Number.isFinite(m) || m < MIN_SPEED) return false
    if (uniformSpeed) {
      out[0] /= m; out[1] /= m; out[2] /= m
    }
    return true
  }

  for (let s = 0; s < seeds.length; s += 3) {
    let x = seeds[s], y = seeds[s + 1], z = seeds[s + 2]
    const buf = new Float32Array((steps + 1) * 3)
    buf[0] = x; buf[1] = y; buf[2] = z
    let count = 1

    for (let i = 0; i < steps; i++) {
      let ok: boolean
      if (integrator === 'euler') {
        ok = sample(x, y, z, v)
      } else {
        const h = stepSize
        ok =
          sample(x, y, z, k1) &&
          sample(x + k1[0] * h * 0.5, y + k1[1] * h * 0.5, z + k1[2] * h * 0.5, k2) &&
          sample(x + k2[0] * h * 0.5, y + k2[1] * h * 0.5, z + k2[2] * h * 0.5, k3) &&
          sample(x + k3[0] * h, y + k3[1] * h, z + k3[2] * h, k4)
        if (ok) {
          v[0] = (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6
          v[1] = (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6
          v[2] = (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) / 6
        }
      }
      if (!ok) break

      x += v[0] * stepSize
      y += v[1] * stepSize
      z += v[2] * stepSize
      if (!Number.isFinite(x + y + z) || x * x + y * y + z * z > killSq) break

      buf[count * 3] = x
      buf[count * 3 + 1] = y
      buf[count * 3 + 2] = z
      count++
    }

    if (count >= 2) {
      lines.push(count === steps + 1 ? buf : buf.subarray(0, count * 3))
    }
  }
  return lines
}
