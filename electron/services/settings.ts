import Store from 'electron-store'
import type { AppSettings } from '../../src/shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  defaultTranslation: 'NLT',
  hotkey: 'CommandOrControl+Shift+B',
  launchAtStartup: false
}

const store = new Store<AppSettings>({
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): AppSettings {
  return {
    defaultTranslation: store.get('defaultTranslation'),
    hotkey: store.get('hotkey'),
    launchAtStartup: store.get('launchAtStartup')
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  if (partial.defaultTranslation !== undefined) {
    store.set('defaultTranslation', partial.defaultTranslation)
  }
  if (partial.hotkey !== undefined) {
    store.set('hotkey', partial.hotkey)
  }
  if (partial.launchAtStartup !== undefined) {
    store.set('launchAtStartup', partial.launchAtStartup)
  }
  return getSettings()
}

export { DEFAULT_SETTINGS }
