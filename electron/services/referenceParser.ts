export interface ParsedReference {
  osis: string
  human: string
}

type BcvParser = {
  parse: (text: string) => BcvParser
  osis: () => string
}

type BcvParserConstructor = new (lang: unknown) => BcvParser

let parserPromise: Promise<BcvParser> | null = null

async function getParser(): Promise<BcvParser> {
  if (!parserPromise) {
    parserPromise = (async () => {
      const [{ bcv_parser }, lang] = await Promise.all([
        import('bible-passage-reference-parser/esm/bcv_parser.js'),
        import('bible-passage-reference-parser/esm/lang/en.js')
      ])
      const Parser = bcv_parser as BcvParserConstructor
      return new Parser(lang)
    })()
  }
  return parserPromise
}

export async function parseReference(text: string): Promise<ParsedReference | null> {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const parser = await getParser()
  parser.parse(trimmed)
  const osis = parser.osis()
  if (!osis) {
    return null
  }

  return {
    osis,
    human: osisToSearchQuery(osis)
  }
}

interface ParsedOsisSegment {
  book: string
  chapter: string
  verse?: string
}

function parseOsisSegment(segment: string): ParsedOsisSegment {
  const parts = segment.trim().split('.')
  if (parts.length < 2) {
    return { book: segment.replace(/\./g, ' '), chapter: '' }
  }

  // Chapter-only OSIS is Book.Chapter (e.g. Matt.4). Verse refs are Book.Chapter.Verse.
  if (parts.length === 2) {
    return { book: parts[0], chapter: parts[1] }
  }

  return {
    book: parts.slice(0, -2).join(''),
    chapter: parts.at(-2) ?? '',
    verse: parts.at(-1)
  }
}

function bookChapterKey(book: string, chapter: string): string {
  return `${book} ${chapter}`
}

function formatSingleSegment(segment: ParsedOsisSegment): string {
  const location = bookChapterKey(segment.book, segment.chapter)
  if (!segment.verse) {
    return location
  }
  return `${location}:${segment.verse}`
}

function formatOsisRange(segment: string): string {
  const dashIndex = segment.indexOf('-')
  if (dashIndex === -1) {
    return formatSingleSegment(parseOsisSegment(segment))
  }

  const start = parseOsisSegment(segment.slice(0, dashIndex))
  const end = parseOsisSegment(segment.slice(dashIndex + 1))
  const startLocation = bookChapterKey(start.book, start.chapter)
  const endLocation = bookChapterKey(end.book, end.chapter)

  if (startLocation === endLocation && start.verse && end.verse) {
    return `${startLocation}:${start.verse}-${end.verse}`
  }

  return `${formatSingleSegment(start)}-${formatSingleSegment(end)}`
}

export function osisToSearchQuery(osis: string): string {
  const commaParts = osis
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (commaParts.length === 1) {
    return formatOsisRange(commaParts[0])
  }

  const groupedVerseParts = new Map<string, string[]>()

  for (const part of commaParts) {
    const dashIndex = part.indexOf('-')
    if (dashIndex === -1) {
      const parsed = parseOsisSegment(part)
      if (!parsed.verse) {
        return commaParts.map(formatOsisRange).join('; ')
      }

      const location = bookChapterKey(parsed.book, parsed.chapter)
      const existing = groupedVerseParts.get(location) ?? []
      existing.push(parsed.verse)
      groupedVerseParts.set(location, existing)
      continue
    }

    const start = parseOsisSegment(part.slice(0, dashIndex))
    const end = parseOsisSegment(part.slice(dashIndex + 1))
    const location = bookChapterKey(start.book, start.chapter)
    const endLocation = bookChapterKey(end.book, end.chapter)

    if (location !== endLocation || !start.verse || !end.verse) {
      return commaParts.map(formatOsisRange).join('; ')
    }

    const existing = groupedVerseParts.get(location) ?? []
    existing.push(`${start.verse}-${end.verse}`)
    groupedVerseParts.set(location, existing)
  }

  return [...groupedVerseParts.entries()]
    .map(([location, verseParts]) => `${location}:${verseParts.join(',')}`)
    .join('; ')
}
