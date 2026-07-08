import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray
} from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { fetchPassage } from './services/bibleGateway'
import { registerHotkey, unregisterHotkeys } from './services/hotkey'
import { parseReference } from './services/referenceParser'
import { captureSelectedText } from './services/selection'
import { getSettings, saveSettings } from './services/settings'
import { getTranslations, isValidTranslation } from './services/translations'
import type { AppSettings, PassageResult, PopupViewState } from '../src/shared/types'

let tray: Tray | null = null
let popupWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let currentReference: string | null = null
let currentOsis: string | null = null
let popupViewState: PopupViewState = { status: 'idle' }

function getAssetPath(...segments: string[]): string {
  const candidates = [
    join(process.cwd(), 'resources', ...segments),
    join(__dirname, '../../resources', ...segments)
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function createTrayIcon(): Electron.NativeImage {
  const trayIconPath = getAssetPath('icon-tray.png')
  const trayImage = nativeImage.createFromPath(trayIconPath)
  if (!trayImage.isEmpty()) {
    return trayImage
  }

  const iconPath = getAssetPath('icon.png')
  const image = nativeImage.createFromPath(iconPath)
  if (!image.isEmpty()) {
    return image.resize({ width: 22, height: 22, quality: 'best' })
  }

  const fallback = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkYGD4z0ABYBw1gGE0DBhGwwAGBgYAALQAAfQ1Q8YAAAAASUVORK5CYII='
  )
  return fallback.resize({ width: 22, height: 22 })
}

function createPopupWindow(x: number, y: number): BrowserWindow {
  const width = 480
  const height = 560

  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/popup/index.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/popup/index.html'))
  }

  return window
}

function sendToPopup(channel: string, payload?: unknown): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    return
  }

  const deliver = (): void => {
    if (!popupWindow || popupWindow.isDestroyed()) {
      return
    }

    if (payload === undefined) {
      popupWindow.webContents.send(channel)
    } else {
      popupWindow.webContents.send(channel, payload)
    }
  }

  if (popupWindow.webContents.isLoading()) {
    popupWindow.webContents.once('did-finish-load', deliver)
  } else {
    deliver()
  }
}

function beginLookup(): void {
  popupViewState = { status: 'reading' }
  sendToPopup('lookup-started')
}

function notifyLookupRequest(reference: string, version: string): void {
  popupViewState = { status: 'loading', reference, version }
  sendToPopup('lookup-request', { reference, version })
}

function notifyPassageResult(result: PassageResult): void {
  popupViewState = { status: 'success', result }
  sendToPopup('passage-result', result)
}

function notifyPassageError(message: string, reference?: string): void {
  popupViewState = { status: 'error', message, reference }
  sendToPopup('passage-error', { message })
}

function revealPopupWindow(): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    return
  }

  const show = (): void => {
    popupWindow?.show()
    popupWindow?.focus()
  }

  if (popupWindow.webContents.isLoading()) {
    popupWindow.once('ready-to-show', show)
  } else if (!popupWindow.isVisible()) {
    show()
  } else {
    popupWindow.focus()
  }
}

function prewarmPopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    return
  }

  popupWindow = createPopupWindow(0, 0)
  popupWindow.on('closed', () => {
    popupWindow = null
  })
  popupWindow.once('ready-to-show', () => {
    popupWindow?.hide()
  })
}

function createSettingsWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 520,
    height: 520,
    show: false,
    autoHideMenuBar: true,
    title: 'VersePeek Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  window.once('ready-to-show', () => {
    window.show()
  })

  optimizer.watchWindowShortcuts(window)

  window.on('closed', () => {
    settingsWindow = null
  })

  return window
}

function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = createSettingsWindow()
}

function showPopupWindow(): void {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const width = 480
  const height = 560

  let x = cursor.x + 16
  let y = cursor.y + 16

  if (x + width > display.workArea.x + display.workArea.width) {
    x = display.workArea.x + display.workArea.width - width - 16
  }
  if (y + height > display.workArea.y + display.workArea.height) {
    y = display.workArea.y + display.workArea.height - height - 16
  }

  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.setPosition(x, y)
    revealPopupWindow()
    return
  }

  popupWindow = createPopupWindow(x, y)
  popupWindow.on('closed', () => {
    popupWindow = null
  })
  revealPopupWindow()
}

async function lookupAndShowPassage(reference: string, osis: string, version: string): Promise<void> {
  currentReference = reference
  currentOsis = osis

  notifyLookupRequest(reference, version)

  try {
    const result = await fetchPassage(reference, version, osis)
    notifyPassageResult(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch passage.'
    notifyPassageError(message, reference)
  }
}

async function handleHotkeyTrigger(): Promise<void> {
  showPopupWindow()
  beginLookup()

  try {
    const selectedText = await captureSelectedText()
    if (!selectedText) {
      notifyPassageError(
        'No text selected. Highlight a Bible reference like John 3:16, then press the hotkey.'
      )
      return
    }

    const parsed = await parseReference(selectedText)
    if (!parsed) {
      notifyPassageError(
        'Could not recognize a Bible reference. Try formats like John 3:16, John 3:16;19, or Romans 8:28-30.'
      )
      return
    }

    const settings = getSettings()
    await lookupAndShowPassage(parsed.human, parsed.osis, settings.defaultTranslation)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error during lookup.'
    notifyPassageError(message)
  }
}

function applyStartupSetting(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  })
}

function setupHotkey(): void {
  const settings = getSettings()
  const result = registerHotkey(settings.hotkey, () => {
    void handleHotkeyTrigger()
  })

  if (!result.success) {
    console.error(result.error)
  }
}

function createTray(): void {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('VersePeek — Ctrl+Shift+B to lookup a passage')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => showSettingsWindow()
    },
    {
      label: 'About VersePeek',
      click: () => {
        void shell.openExternal('https://www.biblegateway.com/')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => showSettingsWindow())
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    'lookup-passage',
    async (_event, reference: string, version?: string): Promise<PassageResult> => {
      const settings = getSettings()
      const translation = version && isValidTranslation(version) ? version : settings.defaultTranslation
      const osis = currentOsis ?? undefined
      return fetchPassage(reference, translation, osis)
    }
  )

  ipcMain.handle('get-settings', (): AppSettings => getSettings())

  ipcMain.handle('save-settings', (_event, partial: Partial<AppSettings>): AppSettings => {
    const updated = saveSettings(partial)
    applyStartupSetting(updated.launchAtStartup)
    setupHotkey()

    settingsWindow?.webContents.send('settings-updated', updated)
    popupWindow?.webContents.send('settings-updated', updated)

    return updated
  })

  ipcMain.handle('get-translations', () => getTranslations())

  ipcMain.handle('get-popup-state', (): PopupViewState => popupViewState)

  ipcMain.on('close-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window === popupWindow) {
      popupViewState = { status: 'idle' }
      window.hide()
      return
    }
    window?.close()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.kaleotech.versepeek')

  registerIpcHandlers()
  createTray()
  prewarmPopupWindow()
  applyStartupSetting(getSettings().launchAtStartup)
  setupHotkey()

  app.on('activate', () => {
    showSettingsWindow()
  })
})

app.on('will-quit', () => {
  unregisterHotkeys()
})

app.on('window-all-closed', () => {
  // Keep running in the system tray when windows close.
})
