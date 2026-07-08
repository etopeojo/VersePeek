import { globalShortcut } from 'electron'

export function registerHotkey(
  accelerator: string,
  callback: () => void
): { success: boolean; error?: string } {
  globalShortcut.unregisterAll()

  const registered = globalShortcut.register(accelerator, callback)
  if (!registered) {
    return {
      success: false,
      error: `Could not register hotkey "${accelerator}". It may be in use by another application.`
    }
  }

  return { success: true }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}
