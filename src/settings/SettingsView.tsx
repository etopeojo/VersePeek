import { useEffect, useMemo, useState } from 'react'
import type { AppSettings, Translation } from '../shared/types'

export function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [translations, setTranslations] = useState<Translation[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [hotkeyInput, setHotkeyInput] = useState('')

  useEffect(() => {
    void window.versepeek.getSettings().then((loaded) => {
      setSettings(loaded)
      setHotkeyInput(loaded.hotkey)
    })
    void window.versepeek.getTranslations().then(setTranslations)

    return window.versepeek.onSettingsUpdated((updated) => {
      setSettings(updated)
      setHotkeyInput(updated.hotkey)
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

  const save = async (partial: Partial<AppSettings>): Promise<void> => {
    setStatus('')
    try {
      const updated = await window.versepeek.saveSettings(partial)
      setSettings(updated)
      setStatus('Settings saved.')
    } catch {
      setStatus('Failed to save settings.')
    }
  }

  if (!settings) {
    return (
      <div className="settings-page">
        <p>Loading settings…</p>
      </div>
    )
  }

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
        <label htmlFor="hotkey">Lookup hotkey</label>
        <p className="hint">Use Electron accelerator format, e.g. CommandOrControl+Shift+B</p>
        <div className="hotkey-row">
          <input
            id="hotkey"
            type="text"
            value={hotkeyInput}
            onChange={(event) => setHotkeyInput(event.target.value)}
          />
          <button type="button" onClick={() => void save({ hotkey: hotkeyInput })}>
            Apply hotkey
          </button>
        </div>
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
