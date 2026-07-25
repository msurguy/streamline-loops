import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { bridge } from '../lib/sceneBridge'

/** Copies the pieces of the R3F store the recorder needs into the bridge. */
export function StoreBridge() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)
  const setSize = useThree((s) => s.setSize)
  const setDpr = useThree((s) => s.setDpr)
  const setFrameloop = useThree((s) => s.setFrameloop)

  useEffect(() => {
    bridge.gl = gl
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__gl = gl
    }
    bridge.camera = camera as THREE.PerspectiveCamera
    bridge.advance = (t) => advance(t, true)
    bridge.setSize = setSize
    bridge.setDpr = setDpr
    bridge.setFrameloop = setFrameloop
    return () => {
      bridge.gl = null
      bridge.camera = null
      bridge.advance = null
      bridge.setSize = null
      bridge.setDpr = null
      bridge.setFrameloop = null
    }
  }, [gl, camera, advance, setSize, setDpr, setFrameloop])

  return null
}
