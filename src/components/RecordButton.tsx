import { useRef, useState } from 'react'
import type { OrbitParams } from './CameraRig'
import { recordLoop, type RecordQuality, type RecordSettings } from '../lib/recorder'

const RESOLUTIONS: Record<string, [number, number]> = {
  '720 × 720': [720, 720],
  '1080 × 1080': [1080, 1080],
  '2160 × 2160': [2160, 2160],
  '1280 × 720': [1280, 720],
  '1920 × 1080': [1920, 1080],
  '3840 × 2160': [3840, 2160],
}

const SCALES: Record<string, number> = {
  '1× px': 1,
  '1.5× px': 1.5,
  '2× px': 2,
}

const DURATIONS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20]

const QUALITIES: Record<string, RecordQuality> = {
  'draft': 'draft',
  'good': 'good',
  'high': 'high',
  'max': 'max',
}

// H.264 requires even dimensions
const even = (v: number) => Math.round(v / 2) * 2

export function RecordButton({
  orbit,
  disabled,
}: {
  orbit: Omit<OrbitParams, 'loopSeconds'>
  disabled: boolean
}) {
  const [resolution, setResolution] = useState('1080 × 1080')
  const [scale, setScale] = useState('1× px')
  const [fps, setFps] = useState(60)
  const [duration, setDuration] = useState('6')
  const [customSeconds, setCustomSeconds] = useState(7)
  const [quality, setQuality] = useState<RecordQuality>('high')
  const [format, setFormat] = useState<RecordSettings['format']>('video')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const recording = progress !== null
  const seconds =
    duration === 'custom'
      ? Math.min(120, Math.max(1, customSeconds))
      : Number(duration)

  const start = async () => {
    cancelled.current = false
    setError(null)
    setProgress(0)
    const [bw, bh] = RESOLUTIONS[resolution]
    const s = SCALES[scale]
    try {
      await recordLoop(
        { width: even(bw * s), height: even(bh * s), fps, seconds, format, quality },
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
          <select value={scale} onChange={(e) => setScale(e.target.value)} title="Pixel density multiplier">
            {Object.keys(SCALES).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATIONS.map((d) => (
              <option key={d} value={String(d)}>
                {d} s
              </option>
            ))}
            <option value="custom">custom…</option>
          </select>
          {duration === 'custom' && (
            <input
              className="duration-input"
              type="number"
              min={1}
              max={120}
              step={0.5}
              value={customSeconds}
              onChange={(e) => setCustomSeconds(Number(e.target.value))}
              title="Duration in seconds"
            />
          )}
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as RecordQuality)}
            title="Encoder bitrate quality"
          >
            {Object.keys(QUALITIES).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
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
