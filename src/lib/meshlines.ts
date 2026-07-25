import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MeshLineGeometry } from 'meshline'
import type { Polyline } from '../types'

/**
 * Build ONE geometry for all polylines: each becomes a MeshLineGeometry
 * (which is a plain BufferGeometry with identical attribute sets), then all
 * are merged so a single mesh + MeshLineMaterial renders in one draw call.
 */
export function buildMergedMeshLineGeometry(
  polylines: Polyline[],
  taper: boolean,
): THREE.BufferGeometry {
  const widthFn = taper
    ? (u: number) => Math.max(0.05, Math.min(1, u / 0.12, (1 - u) / 0.12))
    : undefined
  const geoms = polylines.map((pts) => {
    const g = new MeshLineGeometry()
    g.setPoints(pts, widthFn)
    return g
  })
  const merged = mergeGeometries(geoms, false)
  for (const g of geoms) g.dispose()
  if (!merged) throw new Error('meshline merge failed')
  merged.computeBoundingSphere()
  return merged
}
