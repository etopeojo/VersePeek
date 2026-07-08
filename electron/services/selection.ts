import { clipboard } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'

const COPY_POLL_INTERVAL_MS = 50
const COPY_TIMEOUT_MS = 1000
const HOTKEY_SETTLE_MS = 250

const MODIFIER_KEYS = [
  Key.LeftControl,
  Key.RightControl,
  Key.LeftShift,
  Key.RightShift,
  Key.LeftAlt,
  Key.RightAlt,
  Key.LeftSuper,
  Key.RightSuper,
  Key.LeftWin,
  Key.RightWin,
  Key.LeftCmd,
  Key.RightCmd,
  Key.LeftMeta,
  Key.RightMeta
] as const

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Global hotkeys like Ctrl+Shift+B leave those modifiers physically held when
 * the callback fires. On Windows that turns a simulated Ctrl+C into Ctrl+Shift+C,
 * which does not copy. Release known modifiers first.
 */
async function releaseHeldModifiers(settleMs = HOTKEY_SETTLE_MS): Promise<void> {
  const previousDelay = keyboard.config.autoDelayMs
  keyboard.config.autoDelayMs = 0

  try {
    for (const key of MODIFIER_KEYS) {
      try {
        await keyboard.releaseKey(key)
      } catch {
        // Ignore keys the provider cannot release in this environment.
      }
    }
  } finally {
    keyboard.config.autoDelayMs = previousDelay
  }

  if (settleMs > 0) {
    await sleep(settleMs)
  }
}

async function waitForClipboardText(previousClipboard: string): Promise<string> {
  const deadline = Date.now() + COPY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const current = clipboard.readText().trim()
    if (current && current !== previousClipboard) {
      return current
    }
    await sleep(COPY_POLL_INTERVAL_MS)
  }

  const finalText = clipboard.readText().trim()
  return finalText && finalText !== previousClipboard ? finalText : ''
}

async function simulateCopy(): Promise<string> {
  const previousClipboard = clipboard.readText()
  clipboard.clear()

  // Hotkey modifiers are often still held when the global shortcut fires.
  // Release twice so a physical key-up between passes cannot re-arm Shift/Ctrl.
  await releaseHeldModifiers(0)
  await sleep(HOTKEY_SETTLE_MS)
  await releaseHeldModifiers(HOTKEY_SETTLE_MS)

  const previousDelay = keyboard.config.autoDelayMs
  keyboard.config.autoDelayMs = 25

  try {
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl
    await keyboard.pressKey(modifier, Key.C)
    await keyboard.releaseKey(Key.C, modifier)
  } finally {
    keyboard.config.autoDelayMs = previousDelay
  }

  const selectedText = await waitForClipboardText(previousClipboard)

  if (previousClipboard) {
    clipboard.writeText(previousClipboard)
  } else {
    clipboard.clear()
  }

  return selectedText
}

function readLinuxSelection(): string {
  if (process.platform !== 'linux') {
    return ''
  }

  try {
    return clipboard.readText('selection').trim()
  } catch {
    return ''
  }
}

export async function captureSelectedText(): Promise<string> {
  const linuxSelection = readLinuxSelection()
  if (linuxSelection) {
    return linuxSelection
  }

  return simulateCopy()
}
