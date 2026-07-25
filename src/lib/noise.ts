import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import { mulberry32 } from './rng'

/** Seeded 3D simplex noise, deterministic per seed. */
export function makeNoise3D(seed: number): NoiseFunction3D {
  return createNoise3D(mulberry32(seed ^ 0x9e3779b9))
}
