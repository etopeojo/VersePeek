import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, PassageResult, PopupViewState, Translation } from '../shared/types'

type ViewState = 'idle' | 'loading' | 'success' | 'error'

function applyPopupState(
  state: PopupViewState,
  setters: {
    setViewState: (state: ViewState) => void
    setLoadingMessage: (message: string) => void
    setReference: (reference: string) => void
    setSelectedVersion: (version: string) => void
    setPassage: (passage: PassageResult | null) => void
    setErrorMessage: (message: string) => void
  }
): void {
  switch (state.status) {
    case 'idle':
      setters.setViewState('idle')
      setters.setPassage(null)
      setters.setErrorMessage('')
      break
    case 'reading':
      setters.setViewState('loading')
      setters.setLoadingMessage('Reading selection…')
      setters.setReference('')
      setters.setPassage(null)
      setters.setErrorMessage('')
      break
    case 'loading':
      setters.setViewState('loading')
      setters.setLoadingMessage('Loading passage…')
      setters.setReference(state.reference)
      setters.setSelectedVersion(state.version)
      setters.setPassage(null)
      setters.setErrorMessage('')
      break
    case 'success':
      setters.setPassage(state.result)
      setters.setReference(state.result.citation)
      setters.setSelectedVersion(state.result.version)
      setters.setViewState('success')
      setters.setErrorMessage('')
      break
    case 'error':
      setters.setErrorMessage(state.message)
      setters.setViewState('error')
      if (state.reference) {
        setters.setReference(state.reference)
      }
      break
  }
}

export function PassageView(): JSX.Element {
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [loadingMessage, setLoadingMessage] = useState('Loading passage…')
  const [passage, setPassage] = useState<PassageResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [reference, setReference] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('NLT')
  const [translations, setTranslations] = useState<Translation[]>([])

  const loadPassage = useCallback(async (ref: string, version: string) => {
    setViewState('loading')
    setLoadingMessage('Loading passage…')
    setErrorMessage('')
    try {
      const result = await window.versepeek.lookupPassage(ref, version)
      setPassage(result)
      setSelectedVersion(result.version)
      setViewState('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load passage.')
      setViewState('error')
    }
  }, [])

  useEffect(() => {
    const stateSetters = {
      setViewState,
      setLoadingMessage,
      setReference,
      setSelectedVersion,
      setPassage,
      setErrorMessage
    }

    void window.versepeek.getSettings().then((settings: AppSettings) => {
      setSelectedVersion(settings.defaultTranslation)
    })
    void window.versepeek.getTranslations().then(setTranslations)
    void window.versepeek.getPopupState().then((state) => {
      applyPopupState(state, stateSetters)
    })

    const unsubLookupStarted = window.versepeek.onLookupStarted(() => {
      applyPopupState({ status: 'reading' }, stateSetters)
    })

    const unsubLookup = window.versepeek.onLookupRequest(({ reference: ref, version }) => {
      applyPopupState({ status: 'loading', reference: ref, version }, stateSetters)
    })

    const unsubResult = window.versepeek.onPassageResult((result) => {
      applyPopupState({ status: 'success', result }, stateSetters)
    })

    const unsubError = window.versepeek.onPassageError(({ message }) => {
      applyPopupState({ status: 'error', message }, stateSetters)
    })

    const unsubSettings = window.versepeek.onSettingsUpdated((settings) => {
      setSelectedVersion(settings.defaultTranslation)
    })

    return () => {
      unsubLookupStarted()
      unsubLookup()
      unsubResult()
      unsubError()
      unsubSettings()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.versepeek.closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const version = event.target.value
    setSelectedVersion(version)
    if (reference) {
      void loadPassage(reference, version)
    }
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="popup-title">
          <span className="app-name">VersePeek</span>
          {reference && <h1>{reference}</h1>}
        </div>
        <button
          type="button"
          className="close-button"
          onClick={() => window.versepeek.closeWindow()}
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="translation-row">
        <label htmlFor="translation-select">Translation</label>
        <select
          id="translation-select"
          value={selectedVersion}
          onChange={handleVersionChange}
          disabled={viewState === 'loading' || !reference}
        >
          {translations.map((translation) => (
            <option key={translation.code} value={translation.code}>
              {translation.code} — {translation.name}
            </option>
          ))}
        </select>
      </div>

      <main className="popup-body">
        {viewState === 'loading' && (
          <div className="state-message loading">
            <div className="spinner" />
            <p>{loadingMessage}</p>
          </div>
        )}

        {viewState === 'error' && (
          <div className="state-message error">
            <p>{errorMessage}</p>
            {reference && (
              <button type="button" onClick={() => void loadPassage(reference, selectedVersion)}>
                Retry
              </button>
            )}
          </div>
        )}

        {viewState === 'success' && passage && (
          <article className="passage-text">
            {passage.text.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
        )}

        {viewState === 'idle' && (
          <div className="state-message">
            <p>Highlight a Bible reference and press Ctrl+Shift+B.</p>
          </div>
        )}
      </main>

      <footer className="popup-footer">
        <a
          href={passage?.sourceUrl ?? 'https://www.biblegateway.com/'}
          target="_blank"
          rel="noreferrer"
        >
          Scripture from Bible Gateway
        </a>
      </footer>
    </div>
  )
}
