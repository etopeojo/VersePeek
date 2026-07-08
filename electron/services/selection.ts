import { clipboard } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'

const COPY_DELAY_MS = 200

async function simulateCopy(): Promise<string> {
  const previousClipboard = clipboard.readText()
  clipboard.clear()

  const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl
  await keyboard.pressKey(modifier, Key.C)
  await keyboard.releaseKey(modifier, Key.C)

  await new Promise((resolve) => setTimeout(resolve, COPY_DELAY_MS))
  const selectedText = clipboard.readText().trim()

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
