import * as cheerio from 'cheerio'
import type { PassageResult } from '../../src/shared/types'
import { osisToSearchQuery } from './referenceParser'

const USER_AGENT =
  'VersePeek/1.0 (Bible reference lookup; +https://github.com/kaleotech/versepeek)'

const passageCache = new Map<string, PassageResult>()

function buildSourceUrl(reference: string, version: string): string {
  const params = new URLSearchParams({
    search: reference,
    version
  })
  return `https://www.biblegateway.com/passage/?${params.toString()}`
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function replaceChapterMarkersWithVerseOne($: cheerio.CheerioAPI, root: cheerio.Cheerio<cheerio.Element>): void {
  root.find('.chapternum').each((_, element) => {
    // Bible Gateway uses a large chapter number before verse 1; show verse 1 instead.
    $(element).text('1\u00a0')
  })
}

function extractPassageBlocks($: cheerio.CheerioAPI): string[] {
  const paragraphs: string[] = []

  $('.passage-text').each((_, passageElement) => {
    const passageRoot = $(passageElement).clone()
    passageRoot
      .find(
        '.footnotes, .crossrefs, .publisher-info-bottom, script, style, sup.footnote, sup.crossreference'
      )
      .remove()
    replaceChapterMarkersWithVerseOne($, passageRoot)

    passageRoot.find('.text').each((_, element) => {
      const paragraphText = normalizeWhitespace($(element).text())
      if (paragraphText) {
        paragraphs.push(paragraphText)
      }
    })
  })

  return paragraphs
}

function parsePassageHtml(html: string, citation: string, version: string, sourceUrl: string): PassageResult {
  const $ = cheerio.load(html)

  const heading =
    $('.passage-text .passagedesc').first().text().trim() ||
    $('.dropdown-display-text')
      .filter((_, element) => !/translation|version|bible/i.test($(element).text()))
      .first()
      .text()
      .trim() ||
    citation

  const passageRoots = $('.passage-text')
  if (!passageRoots.length) {
    throw new Error('Could not find passage content on Bible Gateway.')
  }

  const paragraphs = extractPassageBlocks($)

  if (paragraphs.length === 0) {
    const fallbackText = normalizeWhitespace(passageRoots.first().text())
    if (!fallbackText) {
      throw new Error('Passage content was empty.')
    }
    paragraphs.push(fallbackText)
  }

  // Prefer a combined citation when Bible Gateway returns multiple passage blocks
  // (e.g. Romans 7:18,23 rendered as separate sections).
  const passageTitles = $('.dropdown-display-text')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((title, index, all) => {
      if (!title || !/\d/.test(title)) {
        return false
      }
      return all.indexOf(title) === index
    })

  return {
    citation: passageTitles.length > 1 ? citation : heading || citation,
    text: paragraphs.join('\n\n'),
    version,
    sourceUrl
  }
}

export async function fetchPassage(
  referenceInput: string,
  version: string,
  osis?: string
): Promise<PassageResult> {
  const reference = osis ? osisToSearchQuery(osis) : referenceInput.trim()
  const cacheKey = `${reference}|${version}`

  const cached = passageCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const sourceUrl = buildSourceUrl(reference, version)
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html'
    }
  })

  if (!response.ok) {
    throw new Error(`Bible Gateway request failed (${response.status}).`)
  }

  const html = await response.text()
  const result = parsePassageHtml(html, reference, version, sourceUrl)
  passageCache.set(cacheKey, result)

  if (passageCache.size > 50) {
    const firstKey = passageCache.keys().next().value
    if (firstKey) {
      passageCache.delete(firstKey)
    }
  }

  return result
}

export function clearPassageCache(): void {
  passageCache.clear()
}
