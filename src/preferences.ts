const sessionValues = new Map<string, string>()

export function readPreference(key: string): string | null {
  if (sessionValues.has(key)) return sessionValues.get(key)!
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePreference(key: string, value: string) {
  sessionValues.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    // The preference remains available for this session when storage is blocked.
  }
}
