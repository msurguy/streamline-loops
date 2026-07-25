import type { Polyline } from '../types'

export type ClipShape = 'sphere' | 'box' | 'cone' | 'pyramid'

export interface ClipParams {
  shape: ClipShape
  /** radius / half-extent in the xz plane */
  sizeXZ: number
  /** full height (y extent) of the shape */
  sizeY: number
  /** vertical offset of the shape's center */
  offsetY: number
}

/**
 * Signed "distance" to the shape surface — negative inside. Only used for
 * inside tests and linear interpolation of the crossing point, so
 * approximate metrics (Chebyshev for box/pyramid) are fine.
 */
function sdf(p: ClipParams, x: number, y: number, z: number): number {
  const yc = y - p.offsetY
  const halfH = p.sizeY / 2
  switch (p.shape) {
    case 'sphere': {
      // ellipsoid when sizeY/2 differs from sizeXZ
      const ny = yc / (halfH / p.sizeXZ)
      return Math.hypot(x, ny, z) - p.sizeXZ
    }
    case 'box':
      return Math.max(Math.abs(x) - p.sizeXZ, Math.abs(z) - p.sizeXZ, Math.abs(yc) - halfH)
    case 'cone': {
      // apex up: allowed radius shrinks linearly from base (y=-halfH) to apex
      const u = (yc + halfH) / p.sizeY
      return Math.max(Math.hypot(x, z) - p.sizeXZ * (1 - u), Math.abs(yc) - halfH)
    }
    case 'pyramid': {
      const u = (yc + halfH) / p.sizeY
      return Math.max(
        Math.max(Math.abs(x), Math.abs(z)) - p.sizeXZ * (1 - u),
        Math.abs(yc) - halfH,
      )
    }
  }
}

/**
 * Cut polylines by the bounding shape: keeps the inside runs (a line that
 * exits and re-enters becomes several polylines) and interpolates the exact
 * boundary crossing so cut edges are clean.
 */
export function clipPolylines(polylines: Polyline[], params: ClipParams): Polyline[] {
  const out: Polyline[] = []

  for (const line of polylines) {
    const n = line.length / 3
    let run: number[] = []

    const flush = () => {
      if (run.length >= 6) out.push(new Float32Array(run))
      run = []
    }

    let dPrev = sdf(params, line[0], line[1], line[2])
    if (dPrev <= 0) run.push(line[0], line[1], line[2])

    for (let i = 1; i < n; i++) {
      const x = line[i * 3], y = line[i * 3 + 1], z = line[i * 3 + 2]
      const d = sdf(params, x, y, z)
      const px = line[(i - 1) * 3], py = line[(i - 1) * 3 + 1], pz = line[(i - 1) * 3 + 2]

      if (dPrev <= 0 && d > 0) {
        // exiting: end the run at the boundary
        const t = dPrev / (dPrev - d)
        run.push(px + (x - px) * t, py + (y - py) * t, pz + (z - pz) * t)
        flush()
      } else if (dPrev > 0 && d <= 0) {
        // entering: start a new run at the boundary
        const t = dPrev / (dPrev - d)
        run.push(px + (x - px) * t, py + (y - py) * t, pz + (z - pz) * t, x, y, z)
      } else if (d <= 0) {
        run.push(x, y, z)
      }
      dPrev = d
    }
    flush()
  }

  return out
}
