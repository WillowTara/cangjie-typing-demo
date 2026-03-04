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
    .trim()
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

function toTemplateLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

async function fetchArticleSeed(title: string): Promise<OfflineWhitelistSeed> {
  const query = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts|revisions',
    explaintext: '1',
    redirects: '1',
    rvprop: 'ids',
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

  return {
    title,
    text: selected.join('\n\n'),
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
