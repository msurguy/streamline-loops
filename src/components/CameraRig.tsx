import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type * as THREE from 'three'
import { bridge } from '../lib/sceneBridge'

export interface OrbitParams {
  loopSeconds: number
  orbitRadius: number
  elevationDeg: number
  /** object center the orbit circles around and looks at */
  target: [number, number, number]
}

/**
 * Places the camera on its orbit at phase u ∈ [0,1). The single source of
 * truth for the loop — the preview useFrame and the recorder both call it,
 * so what you preview is exactly what gets recorded.
 */
export function setCameraAngle(
  camera: THREE.Camera,
  u: number,
  { orbitRadius, elevationDeg, target }: Omit<OrbitParams, 'loopSeconds'>,
): void {
  const theta = u * Math.PI * 2
  const phi = (elevationDeg * Math.PI) / 180
  camera.position.set(
    target[0] + orbitRadius * Math.cos(theta) * Math.cos(phi),
    target[1] + orbitRadius * Math.sin(phi),
    target[2] + orbitRadius * Math.sin(theta) * Math.cos(phi),
  )
  camera.lookAt(target[0], target[1], target[2])
}

export function CameraRig({
  params,
  freeLook,
}: {
  params: OrbitParams
  freeLook: boolean
}) {
  const camera = useThree((s) => s.camera)

  useFrame((state) => {
    if (freeLook || bridge.recording) return
    const u = (state.clock.elapsedTime / params.loopSeconds) % 1
    setCameraAngle(state.camera, u, params)
  })

  if (freeLook && !bridge.recording) {
    return <OrbitControls camera={camera} target={params.target} makeDefault />
  }
  return null
}
