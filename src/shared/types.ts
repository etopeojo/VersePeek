export interface Translation {
  code: string
  name: string
  language: string
}

export interface PassageResult {
  citation: string
  text: string
  version: string
  sourceUrl: string
}

export interface AppSettings {
  defaultTranslation: string
  hotkey: string
  launchAtStartup: boolean
}

export type PopupViewState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'loading'; reference: string; version: string }
  | { status: 'success'; result: PassageResult }
  | { status: 'error'; message: string; reference?: string }

export interface VersePeekAPI {
  lookupPassage: (reference: string, version?: string) => Promise<PassageResult>
  getSettings: () => Promise<AppSettings>
  saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  getTranslations: () => Promise<Translation[]>
  onPassageResult: (callback: (result: PassageResult) => void) => () => void
  onPassageError: (callback: (error: { message: string }) => void) => () => void
  onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void
  onLookupRequest: (callback: (payload: { reference: string; version: string }) => void) => () => void
  onLookupStarted: (callback: () => void) => () => void
  getPopupState: () => Promise<PopupViewState>
  closeWindow: () => void
}

declare global {
  interface Window {
    versepeek: VersePeekAPI
  }
}

export {}
