import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import type { Bounds, Polyline, RendererKind } from '../types'
import { CameraRig, type OrbitParams } from './CameraRig'
import { StoreBridge } from './StoreBridge'
import { TubesRenderer } from './TubesRenderer'
import { MeshlineRenderer } from './MeshlineRenderer'

export type Projection = 'perspective' | 'orthographic'

/**
 * Switchable default camera. The rig positions whichever camera is default,
 * so projection is orthogonal to the orbit modes. Ortho framing is set by
 * orthoScale (visible world height): zoom = viewport px height / scale,
 * recomputed automatically when the recorder resizes the canvas.
 */
function Cameras({ projection, orthoScale }: { projection: Projection; orthoScale: number }) {
  const size = useThree((s) => s.size)
  if (projection === 'orthographic') {
    return (
      <OrthographicCamera
        makeDefault
        position={[6, 3, 6]}
        zoom={size.height / orthoScale}
        near={0.1}
        far={200}
      />
    )
  }
  return <PerspectiveCamera makeDefault position={[6, 3, 6]} fov={35} near={0.1} far={200} />
}

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
  projection,
  orthoScale,
}: {
  polylines: Polyline[]
  bounds: Bounds
  render: RenderParams
  orbit: OrbitParams
  projection: Projection
  orthoScale: number
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
    >
      <color attach="background" args={[render.bgColor]} />
      {/* fades the distant ground into the background (hides the plane edge,
          which is otherwise visible in orthographic projection) */}
      <fog attach="fog" args={[render.bgColor, 25, 110]} />

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
      <Cameras projection={projection} orthoScale={orthoScale} />
      <CameraRig params={orbit} />

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
