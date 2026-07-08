import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Translation } from '../shared/types'
import {
  acceleratorFromEvent,
  DEFAULT_HOTKEY,
  formatHotkeyForDisplay
} from './acceleratorFromEvent'

export function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [translations, setTranslations] = useState<Translation[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false)

  useEffect(() => {
    void window.versepeek.getSettings().then((loaded) => {
      setSettings(loaded)
    })
    void window.versepeek.getTranslations().then(setTranslations)

    return window.versepeek.onSettingsUpdated((updated) => {
      setSettings(updated)
    })
  }, [])

  const filteredTranslations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return translations
    }
    return translations.filter(
      (translation) =>
        translation.code.toLowerCase().includes(query) ||
        translation.name.toLowerCase().includes(query) ||
        translation.language.toLowerCase().includes(query)
    )
  }, [search, translations])

  const groupedTranslations = useMemo(() => {
    const groups = new Map<string, Translation[]>()
    for (const translation of filteredTranslations) {
      const existing = groups.get(translation.language) ?? []
      existing.push(translation)
      groups.set(translation.language, existing)
    }
    return groups
  }, [filteredTranslations])

  const save = useCallback(async (partial: Partial<AppSettings>): Promise<boolean> => {
    setStatus('')
    try {
      const updated = await window.versepeek.saveSettings(partial)
      setSettings(updated)
      setStatus('Settings saved.')
      return true
    } catch {
      setStatus('Failed to save settings.')
      return false
    }
  }, [])

  const saveHotkey = useCallback(
    async (hotkey: string): Promise<void> => {
      const saved = await save({ hotkey })
      if (saved) {
        setStatus(`Hotkey saved: ${formatHotkeyForDisplay(hotkey)}`)
      } else {
        setStatus('Could not save hotkey.')
      }
    },
    [save]
  )

  useEffect(() => {
    if (!isRecordingHotkey) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()

      const result = acceleratorFromEvent(event)
      if (!result.ok) {
        if (result.reason === 'cancelled') {
          setIsRecordingHotkey(false)
          setStatus('Hotkey change cancelled.')
          return
        }
        if (result.reason === 'missing-modifier') {
          setStatus('Include at least one modifier key (Ctrl, Alt, or Shift).')
          return
        }
        if (result.reason === 'unsupported-key') {
          setStatus('That key is not supported. Try a letter, number, or function key.')
        }
        return
      }

      setIsRecordingHotkey(false)
      void saveHotkey(result.accelerator)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecordingHotkey, saveHotkey])

  if (!settings) {
    return (
      <div className="settings-page">
        <p>Loading settings…</p>
      </div>
    )
  }

  const hotkeyDisplay = isRecordingHotkey
    ? 'Listening for keys…'
    : formatHotkeyForDisplay(settings.hotkey)

  return (
    <div className="settings-page">
      <header>
        <h1>VersePeek Settings</h1>
        <p>Configure your default translation and lookup hotkey.</p>
      </header>

      <section>
        <label htmlFor="default-translation">Default translation</label>
        <input
          id="translation-search"
          type="search"
          placeholder="Search translations…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          id="default-translation"
          value={settings.defaultTranslation}
          onChange={(event) => void save({ defaultTranslation: event.target.value })}
        >
          {[...groupedTranslations.entries()].map(([language, items]) => (
            <optgroup key={language} label={language}>
              {items.map((translation) => (
                <option key={translation.code} value={translation.code}>
                  {translation.code} — {translation.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section>
        <label htmlFor="hotkey-display">Lookup hotkey</label>
        <p className="hint">Click Change hotkey, then press your new shortcut. Press Esc to cancel.</p>
        <div className="hotkey-row">
          <div
            id="hotkey-display"
            className={`hotkey-display${isRecordingHotkey ? ' recording' : ''}`}
            aria-live="polite"
          >
            {hotkeyDisplay}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isRecordingHotkey) {
                setIsRecordingHotkey(false)
                setStatus('Hotkey change cancelled.')
                return
              }
              setStatus('')
              setIsRecordingHotkey(true)
            }}
          >
            {isRecordingHotkey ? 'Cancel' : 'Change hotkey'}
          </button>
        </div>
        {!isRecordingHotkey && settings.hotkey !== DEFAULT_HOTKEY && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void saveHotkey(DEFAULT_HOTKEY)}
          >
            Reset to default
          </button>
        )}
      </section>

      <section>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.launchAtStartup}
            onChange={(event) => void save({ launchAtStartup: event.target.checked })}
          />
          Launch VersePeek at system startup
        </label>
      </section>

      <section className="usage">
        <h2>How to use</h2>
        <ol>
          <li>Highlight a Bible reference in any app (e.g. John 3:16).</li>
          <li>Press your hotkey (default: Ctrl+Shift+B).</li>
          <li>Read the passage and switch translations in the popup.</li>
        </ol>
      </section>

      {status && <p className="status">{status}</p>}
    </div>
  )
}
