import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn(),
  Synth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  })),
  PolySynth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  })),
  Loop: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    bpm: { value: 120 },
    cancel: vi.fn(),
  },
  Destination: {
    volume: { value: 0 },
  },
  getContext: vi.fn(() => ({
    state: 'running',
  })),
}))

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
})) as any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
})