import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Translation } from '../../src/shared/types'

let cachedTranslations: Translation[] | null = null

function getTranslationsPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', 'translations.json')
  }

  const candidates = [
    join(process.cwd(), 'resources', 'translations.json'),
    join(__dirname, '../../resources/translations.json'),
    join(app.getAppPath(), 'resources', 'translations.json')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

export function getTranslations(): Translation[] {
  if (cachedTranslations) {
    return cachedTranslations
  }

  const raw = readFileSync(getTranslationsPath(), 'utf-8')
  cachedTranslations = JSON.parse(raw) as Translation[]
  return cachedTranslations
}

export function getTranslationName(code: string): string {
  const translation = getTranslations().find((item) => item.code === code)
  return translation?.name ?? code
}

export function isValidTranslation(code: string): boolean {
  return getTranslations().some((item) => item.code === code)
}
