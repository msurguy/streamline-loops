import type { NoiseFunction3D } from 'simplex-noise'
import type { FieldFn } from '../types'
import type { CurlHelpers } from './fields'

export interface FormulaScope {
  [key: string]: unknown
  noise: NoiseFunction3D
  curlX: CurlHelpers['curlX']
  curlY: CurlHelpers['curlY']
  curlZ: CurlHelpers['curlZ']
  /** noiseFrequency Leva param, usable in expressions */
  freq: number
  /** fieldScale Leva param, usable in expressions */
  amp: number
}

const MATH = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2,
  asin: Math.asin, acos: Math.acos, abs: Math.abs, sign: Math.sign,
  sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, log: Math.log,
  min: Math.min, max: Math.max, floor: Math.floor, round: Math.round,
  PI: Math.PI, TAU: Math.PI * 2, E: Math.E,
  clamp: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)),
  mix: (a: number, b: number, u: number) => a + (b - a) * u,
  length: (x: number, y: number, z = 0) => Math.hypot(x, y, z),
  smoothstep: (lo: number, hi: number, v: number) => {
    const u = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
    return u * u * (3 - 2 * u)
  },
}

const PROBES: [number, number, number][] = [
  [0, 0, 0],
  [0.37, -0.21, 0.83],
  [-1.1, 0.4, -0.6],
  [1.3, 0.05, 1.2],
]

export type CompileResult = { fn: FieldFn; error?: undefined } | { error: string; fn?: undefined }

/**
 * Compile vx/vy/vz expression strings into a FieldFn.
 * Dangerous globals are shadowed with undefined so stray identifiers throw
 * instead of touching the page. Result is probed at several points and
 * rejected if it produces non-finite values.
 */
export function compileField(
  ex: string,
  ey: string,
  ez: string,
  scope: FormulaScope,
): CompileResult {
  const full = { ...MATH, ...scope }
  const keys = Object.keys(full)
  const vals = keys.map((k) => full[k as keyof typeof full])
  let raw: (...args: unknown[]) => number[]
  try {
    raw = new Function(
      ...keys,
      'window', 'document', 'globalThis', 'self', 'fetch',
      'x', 'y', 'z', 't', 'out',
      `"use strict";
       out[0] = (${ex});
       out[1] = (${ey});
       out[2] = (${ez});
       return out;`,
    ) as (...args: unknown[]) => number[]
  } catch (e) {
    return { error: `Syntax error: ${(e as Error).message}` }
  }

  // Bake the scope once; per-eval only x,y,z,t,out are passed.
  const bound = raw.bind(
    null,
    ...vals,
    undefined, undefined, undefined, undefined, undefined,
  ) as (x: number, y: number, z: number, t: number, out: number[]) => number[]

  const fn: FieldFn = (x, y, z, t, out) => { bound(x, y, z, t, out) }

  const probe = [0, 0, 0]
  try {
    for (const [px, py, pz] of PROBES) {
      fn(px, py, pz, 0, probe)
      if (!probe.every(Number.isFinite)) {
        return { error: `Expression produced a non-finite value at (${px}, ${py}, ${pz})` }
      }
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
  return { fn }
}
