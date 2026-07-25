import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
} from 'mediabunny'
import { Zip, ZipPassThrough } from 'fflate'
import { bridge } from './sceneBridge'
import { setCameraAngle, type OrbitParams } from '../components/CameraRig'

export interface RecordSettings {
  width: number
  height: number
  fps: number
  seconds: number
  format: 'video' | 'png'
}

export interface RecordCallbacks {
  onProgress: (fraction: number) => void
  isCancelled: () => boolean
}

const raf = () => new Promise<number>((r) => requestAnimationFrame(r))

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Renders one full 360° camera orbit frame-by-frame (frameloop 'never' +
 * manual advance) and encodes it. u = i/totalFrames — frame 0 and the
 * would-be frame N coincide, so the exported video loops seamlessly.
 */
export async function recordLoop(
  settings: RecordSettings,
  orbitIn: Omit<OrbitParams, 'loopSeconds'>,
  cb: RecordCallbacks,
): Promise<void> {
  // recording needs a deterministic path — mouse mode falls back to orbit
  const orbit: typeof orbitIn =
    orbitIn.mode === 'free (mouse)' ? { ...orbitIn, mode: 'orbit' } : orbitIn
  const { gl, camera, advance, setSize, setDpr, setFrameloop } = bridge
  if (!gl || !camera || !advance || !setSize || !setDpr || !setFrameloop) {
    throw new Error('Scene is not ready')
  }

  const { width, height, fps, seconds } = settings
  const canvas = gl.domElement
  const container = canvas.parentElement
  const prevW = container?.clientWidth ?? canvas.clientWidth
  const prevH = container?.clientHeight ?? canvas.clientHeight
  const prevDpr = window.devicePixelRatio

  bridge.recording = true
  setFrameloop('never')
  setDpr(1)
  setSize(width, height)
  // shrink the (now oversized) canvas visually while recording
  const scale = Math.min(prevW / width, prevH / height, 1)
  canvas.style.transformOrigin = 'top left'
  canvas.style.transform = `scale(${scale})`

  try {
    // let React apply the resize (meshline resolution uniform re-renders off it)
    await raf(); await raf()

    const totalFrames = Math.round(fps * seconds)

    if (settings.format === 'png') {
      await recordPngZip(totalFrames, fps, orbit, cb)
    } else {
      await recordVideo(totalFrames, width, height, fps, orbit, cb)
    }
  } finally {
    canvas.style.transform = ''
    setSize(prevW, prevH)
    setDpr(prevDpr)
    setFrameloop('always')
    bridge.recording = false
  }
}

async function recordVideo(
  totalFrames: number,
  width: number,
  height: number,
  fps: number,
  orbit: Omit<OrbitParams, 'loopSeconds'>,
  cb: RecordCallbacks,
) {
  const { gl, camera, advance } = bridge
  if (!gl || !camera || !advance) return

  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height })
  if (!codec) throw new Error('No supported video encoder in this browser')
  const isMp4 = codec === 'avc'
  const output = new Output({
    format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(gl.domElement, { codec, bitrate: QUALITY_HIGH })
  output.addVideoTrack(source, { frameRate: fps })
  await output.start()

  for (let i = 0; i < totalFrames; i++) {
    if (cb.isCancelled()) {
      await output.cancel()
      return
    }
    setCameraAngle(camera, i / totalFrames, orbit)
    advance(i * (1000 / fps))
    await source.add(i / fps, 1 / fps)
    if (i % 8 === 0) {
      cb.onProgress(i / totalFrames)
      await raf()
    }
  }

  cb.onProgress(1)
  await output.finalize()
  const buffer = (output.target as BufferTarget).buffer
  if (!buffer) throw new Error('Encoder produced no output')
  download(
    new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' }),
    isMp4 ? 'loop.mp4' : 'loop.webm',
  )
}

async function recordPngZip(
  totalFrames: number,
  fps: number,
  orbit: Omit<OrbitParams, 'loopSeconds'>,
  cb: RecordCallbacks,
) {
  const { gl, camera, advance } = bridge
  if (!gl || !camera || !advance) return

  const chunks: Uint8Array[] = []
  let zipError: Error | null = null
  const zip = new Zip((err, data) => {
    if (err) zipError = err
    else chunks.push(data)
  })

  const toBlob = () =>
    new Promise<Blob>((resolve, reject) =>
      gl.domElement.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png',
      ),
    )

  for (let i = 0; i < totalFrames; i++) {
    if (cb.isCancelled()) return
    setCameraAngle(camera, i / totalFrames, orbit)
    advance(i * (1000 / fps))
    const blob = await toBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    // PNGs are already compressed — store, don't deflate
    const file = new ZipPassThrough(`frame_${String(i).padStart(4, '0')}.png`)
    zip.add(file)
    file.push(bytes, true)
    if (zipError) throw zipError
    cb.onProgress(i / totalFrames)
  }

  zip.end()
  cb.onProgress(1)
  download(new Blob(chunks as BlobPart[], { type: 'application/zip' }), 'frames.zip')
}
