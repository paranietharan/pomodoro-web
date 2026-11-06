import { useEffect, useRef, useState } from 'react'

export type TimerMode = 'work' | 'break'

export function useTimer(workMins: number, breakMins: number, onComplete: () => void) {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(workMins * 60)
  const [isRunning, setIsRunning] = useState(false)
  const remainingMs = useRef(workMins * 60_000)
  const deadline = useRef<number | null>(null)
  const callback = useRef(onComplete)
  useEffect(() => { callback.current = onComplete }, [onComplete])

  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      if (deadline.current === null) return
      const remaining = Math.max(0, deadline.current - Date.now())
      if (remaining === 0) {
        // A suspended browser completes one session, then starts a fresh next session.
        // Do not ring repeatedly for sessions the user never observed.
        const next = mode === 'work' ? 'break' : 'work'
        remainingMs.current = (next === 'work' ? workMins : breakMins) * 60_000
        deadline.current = Date.now() + remainingMs.current
        setMode(next)
        setTimeLeft(remainingMs.current / 1000)
        callback.current()
      } else {
        remainingMs.current = remaining
        setTimeLeft(Math.ceil(remaining / 1000))
      }
    }
    const interval = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [isRunning, mode, workMins, breakMins])

  const toggle = () => {
    if (isRunning) {
      remainingMs.current = Math.max(0, (deadline.current ?? Date.now()) - Date.now())
      deadline.current = null
      setTimeLeft(Math.ceil(remainingMs.current / 1000))
    } else {
      deadline.current = Date.now() + remainingMs.current
    }
    setIsRunning(!isRunning)
  }
  const reset = (nextMode: TimerMode = mode, durationMins = nextMode === 'work' ? workMins : breakMins) => {
    deadline.current = null
    remainingMs.current = durationMins * 60_000
    setIsRunning(false)
    setMode(nextMode)
    setTimeLeft(durationMins * 60)
  }
  return { mode, timeLeft, isRunning, toggle, reset }
}
