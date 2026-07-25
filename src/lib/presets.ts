import type { Integrator, SeedRegion } from '../types'

export interface Preset {
  vx: string
  vy: string
  vz: string
  seedCount?: number
  noiseFrequency: number
  fieldScale: number
  region: SeedRegion
  regionRadius: number
  regionHeight: number
  steps: number
  stepSize: number
  uniformSpeed: boolean
  integrator: Integrator
}

/**
 * Presets are plain expression strings over the formula scope
 * (curlX/curlY/curlZ, noise, freq, amp, math builtins) — pick one, then edit
 * it live; any edit flips the dropdown to Custom.
 */
export const PRESETS: Record<string, Preset> = {
  'Curl Vortex Disc': {
    vx: 'curlX(x*freq, y*freq, z*freq) * amp',
    vy: 'curlY(x*freq, y*freq, z*freq) * amp * 0.15',
    vz: 'curlZ(x*freq, y*freq, z*freq) * amp',
    seedCount: 1500,
    noiseFrequency: 1.6,
    fieldScale: 1,
    region: 'disc',
    regionRadius: 1.4,
    regionHeight: 0.35,
    steps: 70,
    stepSize: 0.016,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Curl Dome': {
    vx: 'curlX(x*freq, y*freq, z*freq) * amp',
    vy: 'curlY(x*freq, y*freq, z*freq) * amp',
    vz: 'curlZ(x*freq, y*freq, z*freq) * amp',
    seedCount: 1500,
    noiseFrequency: 1.0,
    fieldScale: 1,
    region: 'sphere',
    regionRadius: 1.2,
    regionHeight: 1,
    steps: 70,
    stepSize: 0.02,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Vortex Array': {
    vx: 'sin(x*3)*cos(z*3) + curlX(x*freq, y*freq, z*freq)*0.3',
    vy: '0.25*noise(x*2, y*2, z*2)',
    vz: '-cos(x*3)*sin(z*3) + curlZ(x*freq, y*freq, z*freq)*0.3',
    seedCount: 1500,
    noiseFrequency: 1.5,
    fieldScale: 1,
    region: 'disc',
    regionRadius: 1.5,
    regionHeight: 0.4,
    steps: 60,
    stepSize: 0.02,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Torus Flow': {
    vx: '-z/max(0.2, length(x, z)) - 0.45*y*x/max(0.2, length(x, z))',
    vy: '0.45*(length(x, z) - 1)',
    vz: 'x/max(0.2, length(x, z)) - 0.45*y*z/max(0.2, length(x, z))',
    seedCount: 1200,
    noiseFrequency: 1,
    fieldScale: 1,
    region: 'box',
    regionRadius: 1.3,
    regionHeight: 0.8,
    steps: 80,
    stepSize: 0.03,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Magnetic Dipole': {
    // field lines of a dipole (moment along +y): 3(m·r̂)r̂ − m, direction only
    vx: '3*x*y/(0.01 + x*x + y*y + z*z)',
    vy: '3*y*y/(0.01 + x*x + y*y + z*z) - 1',
    vz: '3*z*y/(0.01 + x*x + y*y + z*z)',
    seedCount: 1500,
    noiseFrequency: 1,
    fieldScale: 1,
    region: 'sphere',
    regionRadius: 0.9,
    regionHeight: 1,
    steps: 70,
    stepSize: 0.02,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Lorenz Attractor': {
    // classic Lorenz (σ=10, ρ=28, β=8/3) scaled 15:1, attractor Z mapped to world y
    vx: '10*(z - x)',
    vy: '15*x*z - 2.667*y - 4.444',
    vz: 'x*(3 - 15*y) - z',
    seedCount: 1500,
    noiseFrequency: 1,
    fieldScale: 1,
    region: 'sphere',
    regionRadius: 0.8,
    regionHeight: 1,
    steps: 120,
    stepSize: 0.045,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Tornado': {
    vx: '-z/(0.15 + length(x, z)) + x*(y*0.35 - 0.1)',
    vy: '0.65',
    vz: 'x/(0.15 + length(x, z)) + z*(y*0.35 - 0.1)',
    seedCount: 700,
    noiseFrequency: 1.5,
    fieldScale: 1,
    region: 'disc',
    regionRadius: 0.4,
    regionHeight: 0.15,
    steps: 110,
    stepSize: 0.03,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Galaxy Spiral': {
    // differential rotation shears curl noise into spiral arms
    vx: '-z/(0.3 + length(x, z)) + curlX(x*freq, y*freq, z*freq)*0.15',
    vy: 'curlY(x*freq, y*freq, z*freq)*0.05',
    vz: 'x/(0.3 + length(x, z)) + curlZ(x*freq, y*freq, z*freq)*0.15',
    seedCount: 1100,
    noiseFrequency: 2.5,
    fieldScale: 1,
    region: 'disc',
    regionRadius: 1.5,
    regionHeight: 0.08,
    steps: 90,
    stepSize: 0.02,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'ABC Flow': {
    // Arnold–Beltrami–Childress flow: chaotic weave of streamlines
    vx: 'sin(z*3) + 0.8*cos(y*3)',
    vy: '0.9*sin(x*3) + cos(z*3)',
    vz: '0.8*sin(y*3) + 0.9*cos(x*3)',
    seedCount: 900,
    noiseFrequency: 1,
    fieldScale: 1,
    region: 'box',
    regionRadius: 0.8,
    regionHeight: 1.6,
    steps: 50,
    stepSize: 0.02,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Wind Ribbons': {
    vx: '1',
    vy: '0.4*sin(x*2.5 + z*1.5) + curlY(x*freq, y*freq, z*freq)*0.2',
    vz: '0.4*sin(x*1.8)*cos(y*3) + curlZ(x*freq, y*freq, z*freq)*0.2',
    seedCount: 800,
    noiseFrequency: 1.2,
    fieldScale: 1,
    region: 'box',
    regionRadius: 1.4,
    regionHeight: 0.8,
    steps: 70,
    stepSize: 0.03,
    uniformSpeed: true,
    integrator: 'rk4',
  },
  'Sink + Swirl': {
    vx: '-z*1.4 - x*0.35 + curlX(x*freq, y*freq, z*freq)*0.4',
    vy: '0.4 - y*0.6 + curlY(x*freq, y*freq, z*freq)*0.3',
    vz: 'x*1.4 - z*0.35 + curlZ(x*freq, y*freq, z*freq)*0.4',
    seedCount: 1200,
    noiseFrequency: 1.8,
    fieldScale: 1,
    region: 'disc',
    regionRadius: 1.4,
    regionHeight: 0.9,
    steps: 70,
    stepSize: 0.025,
    uniformSpeed: true,
    integrator: 'rk4',
  },
}

export const PRESET_NAMES = [...Object.keys(PRESETS), 'Custom']
export const DEFAULT_PRESET = 'Curl Vortex Disc'
