import { Canvas } from '@react-three/fiber'
import type { Bounds, Polyline, RendererKind } from '../types'
import { CameraRig, type OrbitParams } from './CameraRig'
import { StoreBridge } from './StoreBridge'
import { TubesRenderer } from './TubesRenderer'
import { MeshlineRenderer } from './MeshlineRenderer'

export interface RenderParams {
  renderer: RendererKind
  tubeRadius: number
  radialSegments: number
  lineWidth: number
  taper: boolean
  lineColor: string
  bgColor: string
}

export function Scene({
  polylines,
  bounds,
  render,
  orbit,
  freeLook,
}: {
  polylines: Polyline[]
  bounds: Bounds
  render: RenderParams
  orbit: OrbitParams
  freeLook: boolean
}) {
  const groundY = bounds.minY - 0.15
  const shadowExtent = Math.max(3, bounds.radius * 1.6)

  return (
    <Canvas
      // VSM: soft blurred shadows without drei's PCSS shader patch, which
      // breaks against three r185's shadow chunks
      shadows="variance"
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 35, near: 0.1, far: 100, position: [4, 2, 4] }}
    >
      <color attach="background" args={[render.bgColor]} />

      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#ffffff', '#666668', 0.5]} />
      <directionalLight
        position={[4, 7, 3]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-radius={6}
        shadow-blurSamples={16}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} />

      <StoreBridge />
      <CameraRig params={orbit} freeLook={freeLook} />

      {polylines.length > 0 &&
        (render.renderer === 'tubes' ? (
          <TubesRenderer
            polylines={polylines}
            radius={render.tubeRadius}
            radialSegments={render.radialSegments}
            taper={render.taper}
            color={render.lineColor}
          />
        ) : (
          <MeshlineRenderer
            polylines={polylines}
            lineWidth={render.lineWidth}
            taper={render.taper}
            color={render.lineColor}
          />
        ))}

      <mesh rotation-x={-Math.PI / 2} position-y={groundY} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={render.bgColor} roughness={1} metalness={0} />
      </mesh>
    </Canvas>
  )
}
