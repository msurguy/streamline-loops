/** One streamline: xyz-interleaved points. */
export type Polyline = Float32Array

/** Vector field: writes [vx, vy, vz] into `out`. Must not allocate. */
export type FieldFn = (
  x: number,
  y: number,
  z: number,
  t: number,
  out: number[],
) => void

export type SeedRegion = 'disc' | 'sphere' | 'box'
export type Integrator = 'rk4' | 'euler'
export type RendererKind = 'tubes' | 'meshline'

export interface TraceParams {
  seedCount: number
  steps: number
  stepSize: number
  integrator: Integrator
  uniformSpeed: boolean
  region: SeedRegion
  regionRadius: number
  regionHeight: number
  seed: number
}

export interface Bounds {
  minY: number
  center: [number, number, number]
  radius: number
}

export function computeBounds(polylines: Polyline[]): Bounds {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const line of polylines) {
    for (let i = 0; i < line.length; i += 3) {
      const x = line[i], y = line[i + 1], z = line[i + 2]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
  }
  if (minY === Infinity) return { minY: -0.5, center: [0, 0, 0], radius: 1.5 }
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ
  return {
    minY,
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    radius: Math.max(dx, dy, dz) / 2,
  }
}
