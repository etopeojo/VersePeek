import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, PassageResult, PopupViewState, Translation } from '../src/shared/types'

const versepeek = {
  lookupPassage: (reference: string, version?: string): Promise<PassageResult> =>
    ipcRenderer.invoke('lookup-passage', reference, version),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),

  saveSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('save-settings', partial),

  getTranslations: (): Promise<Translation[]> => ipcRenderer.invoke('get-translations'),

  onPassageResult: (callback: (result: PassageResult) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: PassageResult): void => {
      callback(result)
    }
    ipcRenderer.on('passage-result', listener)
    return () => ipcRenderer.removeListener('passage-result', listener)
  },

  onPassageError: (callback: (error: { message: string }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: { message: string }): void => {
      callback(error)
    }
    ipcRenderer.on('passage-error', listener)
    return () => ipcRenderer.removeListener('passage-error', listener)
  },

  onSettingsUpdated: (callback: (settings: AppSettings) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings): void => {
      callback(settings)
    }
    ipcRenderer.on('settings-updated', listener)
    return () => ipcRenderer.removeListener('settings-updated', listener)
  },

  onLookupRequest: (
    callback: (payload: { reference: string; version: string }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { reference: string; version: string }
    ): void => {
      callback(payload)
    }
    ipcRenderer.on('lookup-request', listener)
    return () => ipcRenderer.removeListener('lookup-request', listener)
  },

  onLookupStarted: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback()
    }
    ipcRenderer.on('lookup-started', listener)
    return () => ipcRenderer.removeListener('lookup-started', listener)
  },

  getPopupState: (): Promise<PopupViewState> => ipcRenderer.invoke('get-popup-state'),

  closeWindow: (): void => {
    ipcRenderer.send('close-window')
  }
}

contextBridge.exposeInMainWorld('versepeek', versepeek)
