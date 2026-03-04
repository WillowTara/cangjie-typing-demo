import { normalizeChineseText } from './utils'

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

const OFFLINE_WHITELIST_SEEDS = [
  ['貓', '貓是常見的家養動物行動安靜靈活會用鬍鬚感知狹窄空間'],
  ['狗', '狗與人類共處已久能學習簡單指令也常作為陪伴與工作犬'],
  ['熊貓', '熊貓主要棲息在山地竹林日常以竹子為主食性情多半溫和'],
  ['海豚', '海豚是群居海洋哺乳動物擅長聲波溝通與合作覓食'],
  ['企鵝', '企鵝不善飛行但善於游泳厚實羽毛可協助牠們在寒地保溫'],
  ['麻雀', '麻雀常見於城鎮與農地群體活動頻繁叫聲短促清晰'],
  ['楓樹', '楓樹在秋季葉色常轉為紅黃常見於溫帶森林與公園景觀'],
  ['稻米', '稻米是東亞重要主食作物栽培需充足水分與適合氣候條件'],
  ['茶', '茶葉經萎凋與烘焙等製程可形成不同風味常見綠茶與紅茶'],
  ['咖啡', '咖啡豆經烘焙後散發香氣沖煮方式會影響酸度與口感層次'],
  ['巧克力', '巧克力由可可製成配方比例不同會帶來苦甜與香氣差異'],
  ['麵包', '麵包透過發酵使麵團膨脹烘烤後形成外脆內軟的結構'],
  ['豆腐', '豆腐由豆漿凝固而成口感柔軟且能吸收湯汁與調味'],
  ['蘋果', '蘋果富含膳食纖維常作為鮮食或甜點原料保存方式多樣'],
  ['香蕉', '香蕉成熟後甜度提升質地柔軟常作為運動後補給水果'],
  ['葡萄', '葡萄可鮮食也可釀製飲品不同品種在香氣與酸甜度上差異明顯'],
  ['橙', '橙類水果富含維生素果皮含芳香油常用於飲品與料理調味'],
  ['太陽', '太陽是太陽系中心天體提供地球光與熱影響季節與氣候循環'],
  ['月球', '月球繞地球運行潮汐變化與月相週期和其引力作用密切相關'],
  ['地球', '地球表面由海洋與陸地組成具有適合生命存在的大氣與水循環'],
  ['金星', '金星大氣濃厚且溫度高外觀明亮常在清晨或黃昏被觀測到'],
  ['火星', '火星地表呈紅色擁有峽谷與火山地形是行星探測的重要目標'],
  ['木星', '木星是體積最大的行星具有明顯條紋雲帶與長期存在的大紅斑'],
  ['土星', '土星以壯觀環系著名其環主要由冰與岩石顆粒構成'],
  ['銀河系', '銀河系是太陽系所在星系包含大量恆星星雲與星際介質'],
  ['彩虹', '彩虹由陽光在水滴中折射與反射形成常在雨後天空出現'],
  ['雨', '雨是水氣凝結後降落的現象對農業灌溉與生態平衡十分重要'],
  ['雪', '雪由冰晶聚集而成降雪量受溫度濕度與地形條件共同影響'],
  ['森林', '森林提供棲地與碳吸存功能對維持水土與生物多樣性很重要'],
  ['沙漠', '沙漠降雨稀少日夜溫差大生物多具備節水與耐熱適應能力'],
  ['海洋', '海洋覆蓋地表大部分面積調節全球氣候並孕育多樣海洋生物'],
  ['珊瑚礁', '珊瑚礁由珊瑚長期堆積形成是高生物多樣性的海洋生態系'],
  ['音樂', '音樂透過節奏與旋律傳達情感不同文化發展出多樣演奏形式'],
  ['鋼琴', '鋼琴以琴鍵控制擊弦發聲音域寬廣常見於獨奏與合奏'],
  ['小提琴', '小提琴以弓弦摩擦發聲音色明亮常作為室內樂核心聲部'],
  ['吉他', '吉他可用撥弦或掃弦演奏常見於民謠流行與古典音樂'],
  ['書法', '書法重視筆勢與結構安排常以臨摹與創作練習線條控制'],
  ['繪畫', '繪畫運用色彩與構圖呈現主題不同媒材可形成不同視覺效果'],
  ['雕塑', '雕塑透過塑形與材質表現立體空間常見石材木材與金屬'],
  ['陶瓷', '陶瓷經成形與高溫燒製完成兼具日用功能與工藝美感'],
  ['圖書館', '圖書館提供借閱與學習空間並透過分類系統協助查找資料'],
  ['博物館', '博物館典藏文物並策劃展覽讓大眾理解歷史與文化脈絡'],
  ['數學', '數學研究數量與結構訓練邏輯推理廣泛應用於工程與科學'],
  ['幾何', '幾何探討點線面與空間關係常用圖形與證明分析形狀性質'],
  ['代數', '代數使用符號表示關係透過方程式描述變量之間的規律'],
  ['物理學', '物理學研究自然規律從力學到電磁現象都屬其核心範疇'],
  ['化學', '化學關注物質組成與反應實驗可觀察分子層級變化'],
  ['生物學', '生物學研究生命系統涵蓋細胞遺傳演化與生態互動'],
  ['電腦', '電腦可執行程式處理資料已廣泛應用於教育醫療與工業'],
  ['演算法', '演算法是解題步驟設計重視正確性與效率常以複雜度評估'],
  ['程式設計', '程式設計以語言描述邏輯流程透過測試與除錯提升品質'],
] as const

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

function keepFirstThreeParagraphs(articleText: string): { text: string; isAdapted: boolean } {
  const normalized = articleText.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return { text: '', isAdapted: false }
  }

  const paragraphs = normalized
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

  if (paragraphs.length <= 3) {
    return { text: normalized, isAdapted: false }
  }

  return {
    text: paragraphs.slice(0, 3).join('\n\n'),
    isAdapted: true,
  }
}

function createOfflineMaterial(title: string, articleText: string, index: number): PracticeMaterial {
  const reducedArticle = keepFirstThreeParagraphs(articleText)

  return {
    id: `offline-${String(index + 1).padStart(3, '0')}`,
    title,
    text: reducedArticle.text,
    sourceUrl: toWikipediaArticleUrl(title),
    revisionId: 'offline-whitelist',
    authorsUrl: toWikipediaHistoryUrl(title),
    license: WIKIPEDIA_LICENSE,
    licenseUrl: WIKIPEDIA_LICENSE_URL,
    isAdapted: reducedArticle.isAdapted,
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
  ([title, text], index) => createOfflineMaterial(title, text, index),
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
