import { useEffect, useMemo } from 'react'
import type { Polyline } from '../types'
import { buildMergedTubeGeometry } from '../lib/tubes'

export function TubesRenderer({
  polylines,
  radius,
  radialSegments,
  taper,
  color,
}: {
  polylines: Polyline[]
  radius: number
  radialSegments: number
  taper: boolean
  color: string
}) {
  const geometry = useMemo(
    () => buildMergedTubeGeometry(polylines, { radius, radialSegments, taper }),
    [polylines, radius, radialSegments, taper],
  )

  // These buffers are multi-MB; free them the moment they're replaced.
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} metalness={0} />
    </mesh>
  )
}
