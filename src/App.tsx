import { useEffect, useMemo, useRef, useState } from 'react'
import { Leva, button, useControls } from 'leva'
import { computeBounds, type Integrator, type Polyline, type RendererKind, type SeedRegion } from './types'
import { makeNoise3D } from './lib/noise'
import { makeCurlHelpers } from './lib/fields'
import { compileField, type FormulaScope } from './lib/formula'
import { generatePolylines } from './lib/trace'
import { clipPolylines, type ClipShape } from './lib/clip'
import { DEFAULT_PRESET, PRESETS, PRESET_NAMES } from './lib/presets'
import { Scene } from './components/Scene'
import { RecordButton } from './components/RecordButton'

const DP = PRESETS[DEFAULT_PRESET]

export default function App() {
  const [polylines, setPolylines] = useState<Polyline[]>([])
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const setTraceRef = useRef<((v: Record<string, unknown>) => void) | null>(null)

  const [{ preset, vx, vy, vz, noiseFrequency, fieldScale }, setField] = useControls(
    'Field',
    () => ({
      preset: { value: DEFAULT_PRESET, options: PRESET_NAMES },
      vx: { value: DP.vx },
      vy: { value: DP.vy },
      vz: { value: DP.vz },
      noiseFrequency: { value: DP.noiseFrequency, min: 0.1, max: 5, step: 0.05 },
      fieldScale: { value: DP.fieldScale, min: 0.1, max: 3, step: 0.05 },
    }),
  )

  const [
    { seedCount, steps, stepSize, integrator, uniformSpeed, region, regionRadius, regionHeight, seed },
    setTrace,
  ] = useControls('Trace', () => ({
    seedCount: { value: 1500, min: 100, max: 3000, step: 50 },
    steps: { value: DP.steps, min: 10, max: 120, step: 1 },
    stepSize: { value: DP.stepSize, min: 0.005, max: 0.08, step: 0.005 },
    integrator: { value: DP.integrator as Integrator, options: ['rk4', 'euler'] as Integrator[] },
    uniformSpeed: { value: DP.uniformSpeed },
    region: { value: DP.region as SeedRegion, options: ['disc', 'sphere', 'box'] as SeedRegion[] },
    regionRadius: { value: DP.regionRadius, min: 0.2, max: 3, step: 0.05 },
    regionHeight: { value: DP.regionHeight, min: 0.05, max: 3, step: 0.05 },
    seed: { value: 1234, min: 0, max: 99999, step: 1 },
    randomize: button(() =>
      setTraceRef.current?.({ seed: Math.floor(Math.random() * 99999) }),
    ),
  }))
  setTraceRef.current = setTrace as (v: Record<string, unknown>) => void

  const render = useControls('Render', {
    renderer: { value: 'tubes' as RendererKind, options: ['tubes', 'meshline'] as RendererKind[] },
    tubeRadius: { value: 0.006, min: 0.002, max: 0.03, step: 0.001 },
    radialSegments: { value: 4, min: 3, max: 6, step: 1 },
    lineWidth: { value: 0.012, min: 0.002, max: 0.06, step: 0.002 },
    taper: { value: true },
    lineColor: { value: '#e8e8e8' },
    bgColor: { value: '#3d3d3f' },
  })

  const clip = useControls('Clip', {
    enabled: { value: false },
    shape: { value: 'sphere' as ClipShape, options: ['sphere', 'box', 'cone', 'pyramid'] as ClipShape[] },
    sizeXZ: { value: 1.1, min: 0.1, max: 3, step: 0.05 },
    sizeY: { value: 1.6, min: 0.1, max: 4, step: 0.05 },
    offsetY: { value: 0, min: -1.5, max: 1.5, step: 0.05 },
  })

  const cameraCtl = useControls('Camera', {
    loopSeconds: { value: 8, min: 2, max: 30, step: 0.5 },
    orbitRadius: { value: 6, min: 2, max: 15, step: 0.1 },
    elevationDeg: { value: 30, min: -10, max: 85, step: 1 },
    freeLook: { value: false },
  })

  // Applying a preset writes many controls; this flag stops the
  // custom-detection effect from flipping the dropdown back to Custom
  // while those writes land.
  const applyingPreset = useRef(false)

  useEffect(() => {
    if (preset === 'Custom') return
    const p = PRESETS[preset]
    applyingPreset.current = true
    setField({
      vx: p.vx,
      vy: p.vy,
      vz: p.vz,
      noiseFrequency: p.noiseFrequency,
      fieldScale: p.fieldScale,
    })
    setTrace({
      region: p.region,
      regionRadius: p.regionRadius,
      regionHeight: p.regionHeight,
      steps: p.steps,
      stepSize: p.stepSize,
      uniformSpeed: p.uniformSpeed,
      integrator: p.integrator,
      ...(p.seedCount !== undefined ? { seedCount: p.seedCount } : {}),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  useEffect(() => {
    if (preset === 'Custom') return
    const p = PRESETS[preset]
    const matches = vx === p.vx && vy === p.vy && vz === p.vz
    if (applyingPreset.current) {
      if (matches) applyingPreset.current = false
      return
    }
    if (!matches) setField({ preset: 'Custom' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vx, vy, vz, preset])

  // Debounced regeneration off Field + Trace params only.
  const genId = useRef(0)
  useEffect(() => {
    const id = ++genId.current
    const timer = setTimeout(() => {
      setGenerating(true)
      // let the overlay paint before blocking the main thread
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (id !== genId.current) return
          const noise = makeNoise3D(seed)
          const scope: FormulaScope = {
            ...makeCurlHelpers(noise),
            noise,
            freq: noiseFrequency,
            amp: fieldScale,
          }
          const result = compileField(vx, vy, vz, scope)
          if (result.error !== undefined) {
            setFormulaError(result.error)
            setGenerating(false)
            return
          }
          setFormulaError(null)
          const t0 = performance.now()
          const lines = generatePolylines(result.fn, {
            seedCount, steps, stepSize, integrator, uniformSpeed,
            region, regionRadius, regionHeight, seed,
          })
          if (import.meta.env.DEV && lines.length > 0) {
            let h = 0
            const l0 = lines[0]
            for (let i = 0; i < l0.length; i++) h = (h * 31 + Math.round(l0[i] * 1e4)) | 0
            console.log(
              `[gen] ${lines.length} lines in ${(performance.now() - t0).toFixed(0)}ms, hash(line0)=${h}`,
            )
          }
          setPolylines(lines)
          setGenerating(false)
        }),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [
    vx, vy, vz, noiseFrequency, fieldScale,
    seedCount, steps, stepSize, integrator, uniformSpeed,
    region, regionRadius, regionHeight, seed,
  ])

  // Clipping is a cheap pure transform over the traced lines, so it applies
  // instantly without re-tracing the field.
  const clippedPolylines = useMemo(
    () =>
      clip.enabled
        ? clipPolylines(polylines, {
            shape: clip.shape,
            sizeXZ: clip.sizeXZ,
            sizeY: clip.sizeY,
            offsetY: clip.offsetY,
          })
        : polylines,
    [polylines, clip.enabled, clip.shape, clip.sizeXZ, clip.sizeY, clip.offsetY],
  )

  const bounds = useMemo(() => computeBounds(clippedPolylines), [clippedPolylines])

  const orbit = {
    orbitRadius: cameraCtl.orbitRadius,
    elevationDeg: cameraCtl.elevationDeg,
    target: bounds.center,
  }

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Scene
          polylines={clippedPolylines}
          bounds={bounds}
          render={render}
          orbit={{ ...orbit, loopSeconds: cameraCtl.loopSeconds }}
          freeLook={cameraCtl.freeLook}
        />
      </div>

      <Leva titleBar={{ title: 'Streamlines' }} />

      {formulaError && <div className="error-banner">⚠ {formulaError}</div>}
      {generating && <div className="generating-pill">Generating…</div>}

      <RecordButton orbit={orbit} disabled={generating || clippedPolylines.length === 0} />
    </div>
  )
}
