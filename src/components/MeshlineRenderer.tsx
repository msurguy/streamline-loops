import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { extend, useThree, type ThreeElement } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import type { Polyline } from '../types'
import { buildMergedMeshLineGeometry } from '../lib/meshlines'

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}

extend({ MeshLineGeometry, MeshLineMaterial })

export function MeshlineRenderer({
  polylines,
  lineWidth,
  taper,
  color,
}: {
  polylines: Polyline[]
  lineWidth: number
  taper: boolean
  color: string
}) {
  const size = useThree((s) => s.size)
  const initialResolution = useMemo(() => new THREE.Vector2(1, 1), [])

  const geometry = useMemo(
    () => buildMergedMeshLineGeometry(polylines, taper),
    [polylines, taper],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        args={[{ resolution: initialResolution }]}
        lineWidth={lineWidth}
        color={color}
        sizeAttenuation={1}
        // must track every canvas resize, including the recorder's
        resolution={[size.width, size.height]}
      />
    </mesh>
  )
}
