const MODIFIER_KEYS = new Set([
  'Control',
  'Shift',
  'Alt',
  'Meta',
  'AltGraph',
  'OS'
])

const KEY_CODE_MAP: Record<string, string> = {
  Space: 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Esc',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Numpad0: 'num0',
  Numpad1: 'num1',
  Numpad2: 'num2',
  Numpad3: 'num3',
  Numpad4: 'num4',
  Numpad5: 'num5',
  Numpad6: 'num6',
  Numpad7: 'num7',
  Numpad8: 'num8',
  Numpad9: 'num9',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`'
}

export type AcceleratorCaptureResult =
  | { ok: true; accelerator: string }
  | { ok: false; reason: 'modifier-only' | 'missing-modifier' | 'unsupported-key' | 'cancelled' }

function keyFromEvent(event: KeyboardEvent): string | null {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3)
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
    return event.code
  }

  if (KEY_CODE_MAP[event.code]) {
    return KEY_CODE_MAP[event.code]
  }

  if (event.key.length === 1 && /[A-Za-z0-9]/.test(event.key)) {
    return event.key.toUpperCase()
  }

  return null
}

export function acceleratorFromEvent(event: KeyboardEvent): AcceleratorCaptureResult {
  if (event.key === 'Escape') {
    return { ok: false, reason: 'cancelled' }
  }

  if (MODIFIER_KEYS.has(event.key)) {
    return { ok: false, reason: 'modifier-only' }
  }

  const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
  if (!hasModifier) {
    return { ok: false, reason: 'missing-modifier' }
  }

  const key = keyFromEvent(event)
  if (!key) {
    return { ok: false, reason: 'unsupported-key' }
  }

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  parts.push(key)

  return { ok: true, accelerator: parts.join('+') }
}

export function formatHotkeyForDisplay(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => {
      if (part === 'CommandOrControl') {
        return navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'
      }
      return part
    })
    .join('+')
}

export const DEFAULT_HOTKEY = 'CommandOrControl+Shift+B'
