import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type * as THREE from 'three'
import { bridge } from '../lib/sceneBridge'

export type CameraMode = 'orbit' | 'eased top-down' | 'free (mouse)'

export interface OrbitParams {
  mode: CameraMode
  loopSeconds: number
  /** fixed-orbit: radius + elevation */
  orbitRadius: number
  elevationDeg: number
  /** eased orbit: camera distance = object radius + distanceOffset */
  distance: number
  minElevationDeg: number
  easePower: number
  /** object center the camera circles around and looks at */
  target: [number, number, number]
}

// exactly 90° makes lookAt's up vector degenerate; visually identical
const TOP_ELEVATION = 89.9

/**
 * Places the camera at loop phase u ∈ [0,1). The single source of truth for
 * the loop — the preview useFrame and the recorder both call it, so what you
 * preview is exactly what gets recorded. 'free (mouse)' records as 'orbit'.
 *
 * 'eased top-down': one full azimuth turn while elevation eases from
 * straight-down (u=0) to minElevation (u=0.5) and back — symmetric, so the
 * loop is seamless. easePower shapes the dwell: >1 lingers near the top
 * with a quick dip; <1 dives early and stays low.
 */
export function setCameraAngle(
  camera: THREE.Camera,
  u: number,
  rig: Omit<OrbitParams, 'loopSeconds'>,
): void {
  const { target } = rig
  const theta = u * Math.PI * 2
  let phiDeg = rig.elevationDeg
  let radius = rig.orbitRadius

  if (rig.mode === 'eased top-down') {
    const w = Math.sin(Math.PI * u)
    const eased = Math.pow(w, rig.easePower)
    phiDeg = TOP_ELEVATION - (TOP_ELEVATION - rig.minElevationDeg) * eased
    radius = rig.distance
  }

  const phi = (phiDeg * Math.PI) / 180
  camera.position.set(
    target[0] + radius * Math.cos(theta) * Math.cos(phi),
    target[1] + radius * Math.sin(phi),
    target[2] + radius * Math.sin(theta) * Math.cos(phi),
  )
  camera.lookAt(target[0], target[1], target[2])
}

export function CameraRig({ params }: { params: OrbitParams }) {
  const camera = useThree((s) => s.camera)
  const free = params.mode === 'free (mouse)'

  useFrame((state) => {
    if (free || bridge.recording) return
    const u = (state.clock.elapsedTime / params.loopSeconds) % 1
    setCameraAngle(state.camera, u, params)
  })

  if (free && !bridge.recording) {
    return <OrbitControls camera={camera} target={params.target} makeDefault />
  }
  return null
}
