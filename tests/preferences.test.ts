import { expect, test, vi } from 'vitest'
import { readPreference, writePreference } from '../src/preferences'

test('uses session preferences when persistent storage is unavailable', () => {
  const blocked = () => { throw new Error('Storage unavailable') }
  vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
  try {
    expect(readPreference('test-duration')).toBeNull()
    writePreference('test-duration', '30')
    expect(readPreference('test-duration')).toBe('30')
  } finally {
    vi.unstubAllGlobals()
  }
})
