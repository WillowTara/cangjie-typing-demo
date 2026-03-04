import { normalizeChineseText } from './utils'
import { OFFLINE_WHITELIST_SEEDS } from './offlineWhitelistSeeds.generated'

export type PracticeSourceMode = 'offline' | 'online'

export type PracticeMaterial = {
  id: string
  title: string
  text: string
  sourceUrl: string
  revisionId: string
  authorsUrl: string
  license: string
  licenseUrl: string
  isAdapted: boolean
  mode: PracticeSourceMode
}

const WIKIPEDIA_LICENSE = 'CC BY-SA 4.0'
const WIKIPEDIA_LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'

const BLOCKED_KEYWORDS = [
  '色情',
  '成人',
  '裸體',
  '性行為',
  '性交',
  '性器',
  'porn',
  '政治',
  '政黨',
  '選舉',
  '抗議',
  '示威',
  '戰爭',
  '軍事衝突',
  '獨立運動',
  '統獨',
] as const

const MIN_WIKIPEDIA_FULL_ARTICLE_CHARS = 280

const DISAMBIGUATION_HINTS = ['消歧義', '可能是指', '可以指'] as const

type WikipediaQueryPage = {
  title?: string
  fullurl?: string
  extract?: string
  revisions?: Array<{ revid?: number }>
}

type WikipediaRandomApiResponse = {
  query?: {
    pages?: WikipediaQueryPage[]
  }
}

function toWikipediaArticleUrl(title: string): string {
  return `https://zh.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
}

function toWikipediaHistoryUrl(title: string): string {
  return `https://zh.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=history`
}

function createOfflineMaterial(
  seed: (typeof OFFLINE_WHITELIST_SEEDS)[number],
  index: number,
): PracticeMaterial {
  const text = seed.text.replace(/\r\n/g, '\n').trim()

  return {
    id: `offline-${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    text,
    sourceUrl: toWikipediaArticleUrl(seed.title),
    revisionId: seed.revisionId,
    authorsUrl: toWikipediaHistoryUrl(seed.title),
    license: WIKIPEDIA_LICENSE,
    licenseUrl: WIKIPEDIA_LICENSE_URL,
    isAdapted: seed.isAdapted,
    mode: 'offline',
  }
}

function hasBlockedKeyword(value: string): boolean {
  const normalized = value.toLowerCase()
  return BLOCKED_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

function isLikelyDisambiguationPage(title: string, extract: string): boolean {
  const normalizedTitle = title.toLowerCase()
  const normalizedExtract = extract.toLowerCase()

  return DISAMBIGUATION_HINTS.some(
    (keyword) => normalizedTitle.includes(keyword.toLowerCase()) || normalizedExtract.includes(keyword.toLowerCase()),
  )
}

function buildWikipediaApiUrl(): string {
  const query = new URLSearchParams({
    action: 'query',
    generator: 'random',
    grnnamespace: '0',
    grnlimit: '5',
    grnfilterredir: 'nonredirects',
    prop: 'extracts|revisions|info',
    explaintext: '1',
    redirects: '1',
    rvprop: 'ids',
    inprop: 'url',
    formatversion: '2',
    format: 'json',
    origin: '*',
  })

  return `https://zh.wikipedia.org/w/api.php?${query.toString()}`
}

function mapWikipediaPageToMaterial(page: WikipediaQueryPage): PracticeMaterial | null {
  const title = page.title?.trim()
  const extract = page.extract ?? ''
  if (!title || hasBlockedKeyword(`${title}\n${extract}`) || isLikelyDisambiguationPage(title, extract)) {
    return null
  }

  const text = normalizeChineseText(extract).trim()
  if (text.length < MIN_WIKIPEDIA_FULL_ARTICLE_CHARS) {
    return null
  }

  return {
    id: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    text,
    sourceUrl: page.fullurl ?? toWikipediaArticleUrl(title),
    revisionId: String(page.revisions?.[0]?.revid ?? 'unknown'),
    authorsUrl: toWikipediaHistoryUrl(title),
    license: WIKIPEDIA_LICENSE,
    licenseUrl: WIKIPEDIA_LICENSE_URL,
    isAdapted: true,
    mode: 'online',
  }
}

export const OFFLINE_WHITELIST_PRACTICE_MATERIALS: readonly PracticeMaterial[] = OFFLINE_WHITELIST_SEEDS.map(
  (seed, index) => createOfflineMaterial(seed, index),
)

export const PRACTICE_TEXTS: readonly string[] = OFFLINE_WHITELIST_PRACTICE_MATERIALS.map(
  (item) => item.text,
)

export function pickRandomOfflinePracticeMaterial(currentId?: string): PracticeMaterial {
  const candidates = OFFLINE_WHITELIST_PRACTICE_MATERIALS.filter((item) => item.id !== currentId)
  const pool = candidates.length > 0 ? candidates : OFFLINE_WHITELIST_PRACTICE_MATERIALS
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function fetchRandomWikipediaPracticeMaterial(maxAttempts = 12): Promise<PracticeMaterial> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(buildWikipediaApiUrl())
      if (!response.ok) {
        throw new Error(`Wikipedia API HTTP ${response.status}`)
      }

      const data = (await response.json()) as WikipediaRandomApiResponse
      const pages = data.query?.pages ?? []
      if (pages.length === 0) {
        throw new Error('Wikipedia API payload missing random page')
      }

      const material = pages.map(mapWikipediaPageToMaterial).find((item): item is PracticeMaterial => item !== null)
      if (material) {
        return material
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error('目前無法取得符合白名單條件的完整維基文章')
}
