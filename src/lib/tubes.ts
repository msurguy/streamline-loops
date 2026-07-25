import * as THREE from 'three'
import type { Polyline } from '../types'

export interface TubeOptions {
  radius: number
  radialSegments: number
  taper: boolean
}

// Linear taper over the first/last 12% of each line when enabled.
function widthProfile(u: number, taper: boolean): number {
  if (!taper) return 1
  return Math.max(0.05, Math.min(1, u / 0.12, (1 - u) / 0.12))
}

/**
 * Build ONE BufferGeometry containing every polyline as a shaded tube.
 * Frames are propagated by parallel transport (no Frenet twist), vertices
 * written straight into preallocated buffers — no per-line THREE objects.
 */
export function buildMergedTubeGeometry(
  polylines: Polyline[],
  { radius, radialSegments: R, taper }: TubeOptions,
): THREE.BufferGeometry {
  let vertCount = 0
  let triCount = 0
  for (const line of polylines) {
    const n = line.length / 3
    vertCount += n * R + 2 // rings + 2 cap centers
    triCount += (n - 1) * R * 2 + 2 * R
  }

  const positions = new Float32Array(vertCount * 3)
  const normals = new Float32Array(vertCount * 3)
  const index = new Uint32Array(triCount * 3)

  const tan = new THREE.Vector3()
  const prevTan = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const binormal = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  let vo = 0 // vertex cursor
  let io = 0 // index cursor

  for (const line of polylines) {
    const n = line.length / 3
    const base = vo

    for (let i = 0; i < n; i++) {
      const px = line[i * 3], py = line[i * 3 + 1], pz = line[i * 3 + 2]

      // central-difference tangent (one-sided at the ends)
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1)
      tan.set(
        line[i1 * 3] - line[i0 * 3],
        line[i1 * 3 + 1] - line[i0 * 3 + 1],
        line[i1 * 3 + 2] - line[i0 * 3 + 2],
      )
      if (tan.lengthSq() < 1e-12) tan.copy(prevTan)
      tan.normalize()

      if (i === 0) {
        // initial normal: any vector not parallel to the tangent
        tmp.set(0, 1, 0)
        if (Math.abs(tan.dot(tmp)) > 0.9) tmp.set(1, 0, 0)
        normal.crossVectors(tan, tmp).normalize()
      } else {
        // parallel transport: rotate the previous normal by the rotation
        // carrying prevTan onto tan
        axis.crossVectors(prevTan, tan)
        const axisLen = axis.length()
        if (axisLen > 1e-8) {
          axis.divideScalar(axisLen)
          const angle = Math.acos(THREE.MathUtils.clamp(prevTan.dot(tan), -1, 1))
          normal.applyAxisAngle(axis, angle)
        }
      }
      prevTan.copy(tan)
      binormal.crossVectors(tan, normal)

      const w = radius * widthProfile(n === 1 ? 0 : i / (n - 1), taper)
      for (let j = 0; j < R; j++) {
        const a = (j / R) * Math.PI * 2
        const cos = Math.cos(a), sin = Math.sin(a)
        const nx = normal.x * cos + binormal.x * sin
        const ny = normal.y * cos + binormal.y * sin
        const nz = normal.z * cos + binormal.z * sin
        const o = (base + i * R + j) * 3
        positions[o] = px + nx * w
        positions[o + 1] = py + ny * w
        positions[o + 2] = pz + nz * w
        normals[o] = nx
        normals[o + 1] = ny
        normals[o + 2] = nz
      }

      // side quads to the previous ring
      if (i > 0) {
        for (let j = 0; j < R; j++) {
          const j1 = (j + 1) % R
          const a = base + (i - 1) * R + j
          const b = base + (i - 1) * R + j1
          const c = base + i * R + j
          const d = base + i * R + j1
          index[io++] = a; index[io++] = c; index[io++] = b
          index[io++] = b; index[io++] = c; index[io++] = d
        }
      }
    }

    // cap centers (fan over the existing end rings)
    const startCap = base + n * R
    const endCap = startCap + 1
    const so = startCap * 3
    positions[so] = line[0]; positions[so + 1] = line[1]; positions[so + 2] = line[2]
    const eo = endCap * 3
    positions[eo] = line[(n - 1) * 3]
    positions[eo + 1] = line[(n - 1) * 3 + 1]
    positions[eo + 2] = line[(n - 1) * 3 + 2]
    // cap normals: approximate with ±tangent at the ends (tan holds the last)
    normals[eo] = tan.x; normals[eo + 1] = tan.y; normals[eo + 2] = tan.z
    tmp.set(
      line[3] - line[0],
      line[4] - line[1],
      line[5] - line[2],
    ).normalize()
    normals[so] = -tmp.x; normals[so + 1] = -tmp.y; normals[so + 2] = -tmp.z

    for (let j = 0; j < R; j++) {
      const j1 = (j + 1) % R
      index[io++] = startCap; index[io++] = base + j1; index[io++] = base + j
      const last = base + (n - 1) * R
      index[io++] = endCap; index[io++] = last + j; index[io++] = last + j1
    }

    vo += n * R + 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setIndex(new THREE.BufferAttribute(index, 1))
  geometry.computeBoundingSphere()
  return geometry
}
