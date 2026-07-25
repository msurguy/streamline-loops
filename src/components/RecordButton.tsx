import { useRef, useState } from 'react'
import type { OrbitParams } from './CameraRig'
import { recordLoop, type RecordSettings } from '../lib/recorder'

const RESOLUTIONS: Record<string, [number, number]> = {
  '1080 × 1080': [1080, 1080],
  '1920 × 1080': [1920, 1080],
  '1280 × 720': [1280, 720],
}

export function RecordButton({
  orbit,
  disabled,
}: {
  orbit: Omit<OrbitParams, 'loopSeconds'>
  disabled: boolean
}) {
  const [resolution, setResolution] = useState('1080 × 1080')
  const [fps, setFps] = useState(60)
  const [seconds, setSeconds] = useState(6)
  const [format, setFormat] = useState<RecordSettings['format']>('video')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const recording = progress !== null

  const start = async () => {
    cancelled.current = false
    setError(null)
    setProgress(0)
    const [width, height] = RESOLUTIONS[resolution]
    try {
      await recordLoop(
        { width, height, fps, seconds, format },
        orbit,
        { onProgress: setProgress, isCancelled: () => cancelled.current },
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="record-panel">
      {!recording ? (
        <>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {Object.keys(RESOLUTIONS).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
          <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
            <option value={4}>4 s</option>
            <option value={6}>6 s</option>
            <option value={8}>8 s</option>
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as RecordSettings['format'])}
          >
            <option value="video">MP4 video</option>
            <option value="png">PNG zip</option>
          </select>
          <button className="record-btn" onClick={start} disabled={disabled}>
            ● Record loop
          </button>
        </>
      ) : (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="progress-label">{Math.round(progress * 100)}%</span>
          <button className="cancel-btn" onClick={() => (cancelled.current = true)}>
            Cancel
          </button>
        </>
      )}
      {error && <span className="record-error">{error}</span>}
    </div>
  )
}
