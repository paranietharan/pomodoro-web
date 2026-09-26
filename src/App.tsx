import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Moon, Sun, Coffee, Brain, Settings, X, Check, Volume2, VolumeX } from 'lucide-react'

type TimerMode = 'work' | 'break'

const DEFAULT_WORK_MINS = 25
const DEFAULT_BREAK_MINS = 5

export default function App() {
  // Configurable durations (stored in minutes, persisted in localStorage)
  const [workMins, setWorkMins] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoro-work-mins')
    return saved ? Math.max(1, parseInt(saved, 10) || DEFAULT_WORK_MINS) : DEFAULT_WORK_MINS
  })
  const [breakMins, setBreakMins] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoro-break-mins')
    return saved ? Math.max(1, parseInt(saved, 10) || DEFAULT_BREAK_MINS) : DEFAULT_BREAK_MINS
  })

  // Sound enable/disable preference (persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('pomodoro-sound')
    return saved !== null ? saved === 'true' : true
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Settings modal / panel state & draft values
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [draftWorkMins, setDraftWorkMins] = useState<number>(workMins)
  const [draftBreakMins, setDraftBreakMins] = useState<number>(breakMins)

  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState<number>(workMins * 60)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  // Dark / Light theme state with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('pomodoro-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Initialize and persist audio preference
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('pomodoro-sound', String(next))
      return next
    })
  }

  // Play alarm sound helper with Web Audio API chime fallback
  const playAlarmSound = () => {
    if (!soundEnabled) return

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Fallback tone using Web Audio API in case audio file loading was blocked
        playFallbackBeep()
      })
    } else {
      playFallbackBeep()
    }
  }

  // Fallback pleasant notification chime
  const playFallbackBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const playTone = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
        gain.gain.setValueAtTime(0.2, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + duration)
      }

      playTone(587.33, 0, 0.25) // D5
      playTone(880, 0.15, 0.4)  // A5
    } catch {
      // AudioContext not available or blocked
    }
  }

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('pomodoro-theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('pomodoro-theme', 'light')
    }
  }, [isDark])

  // Timer interval countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Session completed: play sound tone
            playAlarmSound()

            // Automatically switch session mode
            if (mode === 'work') {
              setMode('break')
              return breakMins * 60
            } else {
              setMode('work')
              return workMins * 60
            }
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, mode, workMins, breakMins, soundEnabled])

  // Format mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Sync document title with current timer countdown
  useEffect(() => {
    const modeLabel = mode === 'work' ? 'Work' : 'Break'
    document.title = `${formatTime(timeLeft)} (${modeLabel}) - Pomodoro Timer`
  }, [timeLeft, mode])

  // Control Handlers
  const handleTogglePlay = () => {
    setIsRunning((prev) => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(mode === 'work' ? workMins * 60 : breakMins * 60)
  }

  const handleModeSwitch = (newMode: TimerMode) => {
    if (mode === newMode) return
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(newMode === 'work' ? workMins * 60 : breakMins * 60)
  }

  // Settings Handlers
  const handleOpenSettings = () => {
    setDraftWorkMins(workMins)
    setDraftBreakMins(breakMins)
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    const validWork = Math.max(1, Math.min(180, draftWorkMins || DEFAULT_WORK_MINS))
    const validBreak = Math.max(1, Math.min(60, draftBreakMins || DEFAULT_BREAK_MINS))

    setWorkMins(validWork)
    setBreakMins(validBreak)
    localStorage.setItem('pomodoro-work-mins', validWork.toString())
    localStorage.setItem('pomodoro-break-mins', validBreak.toString())

    // Update current timer countdown if currently not running
    if (!isRunning) {
      setTimeLeft(mode === 'work' ? validWork * 60 : validBreak * 60)
    }

    setIsSettingsOpen(false)
  }

  const totalTime = (mode === 'work' ? workMins : breakMins) * 60
  const progressPercent = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100))

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors duration-300 font-sans selection:bg-rose-500/20 selection:text-rose-600">
      {/* Hidden Audio element for notification tone */}
      <audio ref={audioRef} src="/audio/alarm.mp3" preload="auto" />

      {/* Top Header - Mobile friendly with compact padding */}
      <header className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Brand Logo - Referenced from /images/ directory */}
          <img
            src="/images/pomodorotimer.svg"
            alt="Pomodoro Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-300 hover:rotate-12"
            onError={(e) => {
              // Fallback placeholder comment: If local /images/pomodorotimer.svg is unavailable, replace with a reliable SVG icon
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Pomodoro
          </span>
        </div>

        {/* Action icons: Sound mute/unmute, Settings & Theme toggle */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            id="sound-toggle-btn"
            title={soundEnabled ? 'Mute tone' : 'Enable tone'}
            aria-label={soundEnabled ? 'Mute tone' : 'Enable tone'}
            className={`p-2 sm:p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer ${
              soundEnabled
                ? 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenSettings}
            id="settings-toggle-btn"
            aria-label="Timer settings"
            className="p-2 sm:p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            id="theme-toggle-btn"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 sm:p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </header>

      {/* Main Content Area - Fully responsive on all mobile screens */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-sm flex flex-col items-center">
          
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800/80 mb-6 sm:mb-10 transition-colors duration-200">
            <button
              type="button"
              id="mode-work-btn"
              onClick={() => handleModeSwitch('work')}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                mode === 'work'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Work ({workMins}m)
            </button>
            <button
              type="button"
              id="mode-break-btn"
              onClick={() => handleModeSwitch('break')}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                mode === 'break'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Break ({breakMins}m)
            </button>
          </div>

          {/* Responsive Circular Countdown Display */}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center mb-8 sm:mb-10">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-zinc-200 dark:stroke-zinc-800/80"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Active countdown progress circle */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className={`transition-all duration-500 ease-linear ${
                  mode === 'work'
                    ? 'stroke-rose-500 dark:stroke-rose-500'
                    : 'stroke-emerald-500 dark:stroke-emerald-400'
                }`}
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Central Time & State */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl sm:text-6xl font-light tracking-tight tabular-nums font-mono text-zinc-900 dark:text-zinc-50">
                {formatTime(timeLeft)}
              </span>
              <span className="mt-2 text-[10px] sm:text-xs uppercase tracking-widest font-medium text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isRunning
                      ? mode === 'work'
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-emerald-500 animate-pulse'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />
                {isRunning ? (mode === 'work' ? 'Focusing' : 'Resting') : 'Paused'}
              </span>
            </div>
          </div>

          {/* Timer Action Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              id="start-pause-btn"
              onClick={handleTogglePlay}
              className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-medium text-sm sm:text-base shadow-sm transition-all duration-200 active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  : mode === 'work'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="reset-btn"
              onClick={handleReset}
              aria-label="Reset timer"
              className="p-3 sm:p-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-xs transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Configurable Duration Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-all duration-200"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xl text-zinc-800 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Timer Settings
              </h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="work-duration"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Work Session (Minutes)
                </label>
                <input
                  id="work-duration"
                  type="number"
                  min="1"
                  max="180"
                  value={draftWorkMins}
                  onChange={(e) => setDraftWorkMins(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500/50"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="break-duration"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Break Session (Minutes)
                </label>
                <input
                  id="break-duration"
                  type="number"
                  min="1"
                  max="60"
                  value={draftBreakMins}
                  onChange={(e) => setDraftBreakMins(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              {/* Sound preference in settings as well */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Play tone on completion
                </span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    soundEnabled ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  role="switch"
                  aria-checked={soundEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs cursor-pointer transition-colors duration-150"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer / Technique illustration - Responsive stack on small screens */}
      <footer className="w-full max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-zinc-200/60 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2.5">
          {/* Technique visual asset referenced from /images/ directory */}
          <img
            src="/images/pomodoro-technique.png"
            alt="Pomodoro Technique diagram"
            className="w-6 h-6 rounded object-cover opacity-80"
            onError={(e) => {
              // Fallback placeholder comment: If local /images/pomodoro-technique.png is not found,
              // replace with an external placeholder or inline icon:
              // https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=100
              e.currentTarget.style.display = 'none'
            }}
          />
          <span>{workMins}m Focus &bull; {breakMins}m Break</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Clean &amp; Minimal Pomodoro</span>
        </div>
      </footer>
    </main>
  )
}
