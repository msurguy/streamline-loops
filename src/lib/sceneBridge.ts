import type * as THREE from 'three'

/**
 * Mutable escape hatch out of the R3F store so the recorder (plain async
 * code) can drive frame-stepped renders. Populated by <StoreBridge> inside
 * the Canvas. `recording` gates the CameraRig's useFrame so the recorder
 * has exclusive control of the camera.
 */
export interface SceneBridge {
  gl: THREE.WebGLRenderer | null
  camera: THREE.PerspectiveCamera | null
  advance: ((timestamp: number) => void) | null
  setSize: ((width: number, height: number) => void) | null
  setDpr: ((dpr: number) => void) | null
  setFrameloop: ((mode: 'always' | 'demand' | 'never') => void) | null
  recording: boolean
}

export const bridge: SceneBridge = {
  gl: null,
  camera: null,
  advance: null,
  setSize: null,
  setDpr: null,
  setFrameloop: null,
  recording: false,
}
