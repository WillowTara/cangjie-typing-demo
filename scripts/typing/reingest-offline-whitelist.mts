#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const TITLES = [
  '貓',
  '狗',
  '熊貓',
  '海豚',
  '企鵝',
  '麻雀',
  '楓樹',
  '稻米',
  '茶',
  '咖啡',
  '巧克力',
  '麵包',
  '豆腐',
  '蘋果',
  '香蕉',
  '葡萄',
  '橙',
  '太陽',
  '月球',
  '地球',
  '金星',
  '火星',
  '木星',
  '土星',
  '銀河系',
  '彩虹',
  '雨',
  '雪',
  '森林',
  '沙漠',
  '海洋',
  '珊瑚礁',
  '音樂',
  '鋼琴',
  '小提琴',
  '吉他',
  '書法',
  '繪畫',
  '雕塑',
  '陶瓷',
  '圖書館',
  '博物館',
  '數學',
  '幾何',
  '代數',
  '物理學',
  '化學',
  '生物學',
  '電腦',
  '演算法',
  '程式設計',
] as const

const CHINESE_VARIANT = 'zh-hant'

const LIKELY_SIMPLIFIED_CHARACTERS = [
  '这',
  '们',
  '发',
  '东',
  '应',
  '学',
  '国',
  '龙',
  '术',
  '广',
  '车',
  '书',
  '云',
  '气',
  '电',
  '门',
  '开',
  '长',
  '见',
  '观',
  '风',
  '飞',
  '马',
  '鸟',
  '鱼',
] as const

const SIMPLIFIED_TO_TRADITIONAL_MAP: Readonly<Record<(typeof LIKELY_SIMPLIFIED_CHARACTERS)[number], string>> = {
  这: '這',
  们: '們',
  发: '發',
  东: '東',
  应: '應',
  学: '學',
  国: '國',
  龙: '龍',
  术: '術',
  广: '廣',
  车: '車',
  书: '書',
  云: '雲',
  气: '氣',
  电: '電',
  门: '門',
  开: '開',
  长: '長',
  见: '見',
  观: '觀',
  风: '風',
  飞: '飛',
  马: '馬',
  鸟: '鳥',
  鱼: '魚',
}

type WikipediaQueryPage = {
  title?: string
  extract?: string
  revisions?: Array<{ revid?: number }>
}

type WikipediaResponse = {
  query?: {
    pages?: WikipediaQueryPage[]
  }
}

type OfflineWhitelistSeed = {
  title: string
  text: string
  revisionId: string
  isAdapted: boolean
}

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^=+\s*[^=\n]+\s*=+\s*$/gmu, '')
    .trim()
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

function toTemplateLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function findLikelySimplifiedCharacters(text: string): string[] {
  return LIKELY_SIMPLIFIED_CHARACTERS.filter((character) => text.includes(character))
}

function forceTraditionalCharacters(text: string): string {
  return [...text]
    .map((character) => SIMPLIFIED_TO_TRADITIONAL_MAP[character as keyof typeof SIMPLIFIED_TO_TRADITIONAL_MAP] ?? character)
    .join('')
}

async function fetchArticleSeed(title: string): Promise<OfflineWhitelistSeed> {
  const query = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts|revisions',
    explaintext: '1',
    redirects: '1',
    rvprop: 'ids',
    variant: CHINESE_VARIANT,
    uselang: CHINESE_VARIANT,
    formatversion: '2',
    format: 'json',
    origin: '*',
  })

  const url = `https://zh.wikipedia.org/w/api.php?${query.toString()}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'cangjie-typing-demo/offline-whitelist-reingest',
    },
  })

  if (!response.ok) {
    throw new Error(`Wikipedia API failed for ${title}: HTTP ${response.status}`)
  }

  const payload = (await response.json()) as WikipediaResponse
  const pages = payload.query?.pages ?? []
  const page = pages.find((entry) => entry.title?.trim() === title) ?? pages[0]

  if (!page?.extract) {
    throw new Error(`Missing extract for ${title}`)
  }

  const paragraphs = splitParagraphs(page.extract)
  if (paragraphs.length === 0) {
    throw new Error(`No usable paragraph found for ${title}`)
  }

  const selected = paragraphs.slice(0, 3)
  const selectedText = forceTraditionalCharacters(selected.join('\n\n'))
  const likelySimplifiedCharacters = findLikelySimplifiedCharacters(selectedText)
  if (likelySimplifiedCharacters.length > 0) {
    throw new Error(
      `Likely simplified Chinese remains for ${title}: ${likelySimplifiedCharacters.join(',')}`,
    )
  }

  return {
    title,
    text: selectedText,
    revisionId: String(page.revisions?.[0]?.revid ?? 'unknown'),
    isAdapted: paragraphs.length > 3,
  }
}

function renderSeedFile(seeds: readonly OfflineWhitelistSeed[]): string {
  const records = seeds
    .map(
      (seed) => `  {
    title: '${toTemplateLiteral(seed.title)}',
    revisionId: '${toTemplateLiteral(seed.revisionId)}',
    isAdapted: ${seed.isAdapted ? 'true' : 'false'},
    text: \`${toTemplateLiteral(seed.text)}\`,
  },`,
    )
    .join('\n')

  return `export type OfflineWhitelistSeed = {
  title: string
  text: string
  revisionId: string
  isAdapted: boolean
}

export const OFFLINE_WHITELIST_SEEDS: readonly OfflineWhitelistSeed[] = [
${records}
] as const
`
}

async function main(): Promise<void> {
  const outputPath = resolve('src/features/typing/offlineWhitelistSeeds.generated.ts')
  const seeds: OfflineWhitelistSeed[] = []

  for (const title of TITLES) {
    const seed = await fetchArticleSeed(title)
    seeds.push(seed)
    process.stdout.write(`re-ingested ${title} (revision=${seed.revisionId}, paragraphs<=3)\n`)
  }

  await writeFile(outputPath, renderSeedFile(seeds), 'utf8')
  process.stdout.write(`wrote ${outputPath} (${seeds.length} seeds)\n`)
}

void main()
