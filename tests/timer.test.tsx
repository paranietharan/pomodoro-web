// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useTimer } from '../src/useTimer'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
afterEach(() => { cleanup(); vi.useRealTimers() })

test('pause preserves subsecond time and resume excludes paused time', () => {
  const { result } = renderHook(() => useTimer(1, 1, vi.fn()))
  act(() => result.current.toggle())
  act(() => vi.advanceTimersByTime(1500))
  act(() => result.current.toggle())
  expect(result.current.timeLeft).toBe(59)
  act(() => vi.advanceTimersByTime(30_000))
  act(() => result.current.toggle())
  act(() => vi.advanceTimersByTime(500))
  expect(result.current.timeLeft).toBe(58)
})

test('background throttling uses elapsed time, not number of ticks', () => {
  const { result } = renderHook(() => useTimer(25, 5, vi.fn()))
  act(() => result.current.toggle())
  act(() => { vi.setSystemTime(120_000); document.dispatchEvent(new Event('visibilitychange')) })
  expect(result.current.timeLeft).toBe(23 * 60)
})

test('sleep completes once and starts a fresh break; reset stops it', () => {
  const alarm = vi.fn()
  const { result } = renderHook(() => useTimer(1, 5, alarm))
  act(() => result.current.toggle())
  act(() => { vi.setSystemTime(3_600_000); window.dispatchEvent(new Event('pageshow')) })
  expect(result.current.mode).toBe('break')
  expect(result.current.timeLeft).toBe(300)
  expect(alarm).toHaveBeenCalledTimes(1)
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current.timeLeft).toBe(299)
  act(() => result.current.reset('work'))
  act(() => vi.advanceTimersByTime(2000))
  expect(result.current.timeLeft).toBe(60)
  expect(result.current.isRunning).toBe(false)
})
