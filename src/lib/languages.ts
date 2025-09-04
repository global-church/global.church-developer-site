import langs from 'langs'

// Pretty-print a language code (2/3-letter) to its English name
export function formatLanguage(code: string): string {
  const base = (code || '').split(/[-_]/)[0].toLowerCase()
  const by3 = langs.where('3', base)
  if (by3) return by3.name.split(/[,;]/)[0]
  const by2 = langs.where('1', base) || langs.where('2', base)
  if (by2) return by2.name.split(/[,;]/)[0]
  return code
}

export function formatLanguages(codes: string[]): string[] {
  return codes.map((code) => formatLanguage(code))
}

// Normalize UI inputs (names or 2/3-letter codes) to ISO639-3 codes used in the DB/API.
export function toThreeLetterCode(input: string): string | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null
  const base = raw.split(/[-_]/)[0].toLowerCase()
  // If already a 3-letter code
  const as3 = langs.where('3', base)
  if (as3) return as3['3']
  // If a 2-letter code
  const as2 = langs.where('1', base) || langs.where('2', base)
  if (as2) return as2['3']
  // Try by exact English name
  const byName = langs.where('name', raw)
  if (byName && byName['3']) return byName['3']
  // Fallback: scan and compare against name/local variants, split on separators
  const all = langs.all() as Array<{ name: string; local: string; '3': string }>
  const target = raw.toLowerCase()
  for (const l of all) {
    const candidates = [l.name, l.local || '']
      .join(',')
      .split(/[;,()]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (candidates.includes(target)) return l['3']
  }
  return null
}

export function normalizeLanguagesToCodes(values?: string[] | null): string[] | undefined {
  if (!values || values.length === 0) return undefined
  const out: string[] = []
  for (const v of values) {
    const code = toThreeLetterCode(v)
    if (code && !out.includes(code)) out.push(code)
  }
  return out.length ? out : undefined
}
