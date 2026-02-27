# 倉頡打字練習 - Cangjie Typing Practice Demo

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![React](https://img.shields.io/badge/React-19.2+-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6)
![Vite](https://img.shields.io/badge/Vite-7.3+-646CFF)

Monkeytype 風格的倉頡與速成輸入法練習應用，同時提供字典查詢功能。

## 功能特色

### 1. 打字練習 (Typing Practice)
- **倉頡/速成切換**：支援倉頡與速成兩種輸入法練習
- **計時模式**：15 / 30 / 60 / 120 秒計時選擇
- **即時統計**：
  - WPM (每分鐘字數)
  - CPM (每分鐘字元數)
  - 準確率 (Accuracy)
  - 進度百分比 (Progress)
- **練習素材**：內建多種中文練習句子
- **視覺化回饋**：正確綠色、錯誤紅色、當前黃色標記

### 2. 字典查詢 (Dictionary Lookup)
- 輸入中文字元，查詢對應的：
  - 倉頡碼 (Cangjie Code)
  - 速成碼 (Quick Code)
  - 英文鍵序 (Key Sequence)
- 支援批量查詢（一次輸入多個字）

## 線上展示

- **Vercel**: https://cangjie-typing-demo.vercel.app
- **GitHub**: https://github.com/WillowTara/cangjie-typing-demo

## 技術架構

### 技術棧
| 層面 | 技術 |
|------|------|
| 前端框架 | React 19 |
| 語言 | TypeScript 5.9 |
| 建置工具 | Vite 7 |
| 樣式 | CSS3 (CSS Variables) |
| 部署 | Vercel |

### 專案結構
```
newproject/
├── src/
│   ├── App.tsx              # 應用組裝層（composition root）
│   ├── App.css             # 樣式定義
│   ├── index.css           # 全域樣式 (CSS Variables)
│   ├── main.tsx            # 入口點
│   ├── config/
│   │   └── runtime.ts      # 執行期設定（VITE_*）
│   ├── features/
│   │   ├── dictionary/     # 字典載入與 fallback
│   │   ├── lookup/         # 查碼 UI
│   │   └── typing/         # 打字流程與狀態管理
│   ├── observability/      # logger、全域錯誤攔截、ErrorBoundary
│   └── lib/
│       ├── dictionary.ts          # 字典解析與驗證核心
│       └── dictionaryBinary.ts    # v2 binary codec（encode/decode/lookup）
├── e2e/                    # Playwright E2E 測試
├── scripts/
│   └── dict/               # v2 build / sqlite export 腳本
├── public/
│   └── dict/               # 外部字典檔案 (CSV/JSON)
│       ├── sample-dictionary.csv
│       └── sample-dictionary.json
├── docs/
│   ├── dictionary-v2-spec.md
│   ├── dictionary-v2-checklist.md
│   └── mobile-dict.md
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

### 核心模組

#### 1. dictionary.ts - 字典資料處理
```
職責：
- 解析 CSV/JSON 格式的字典檔
- 建置查詢索引 (Map-based)
- 驗證資料格式與完整性
- 產生驗證報告

導出函數：
- parseDictionaryCsv(text: string): DictionaryEntry[]
- parseDictionaryJson(text: string): DictionaryEntry[]
- buildDictionaryIndex(entries: DictionaryEntry[]): DictionaryIndex
- parseDictionaryTextWithReport(filename, text): DictionaryParseResult
```

#### 2. App.tsx - 組裝層
```
職責：
- 協調 view mode（typing / lookup / result）
- 串接 typing session hook 與 dictionary hook
- 保持 UI 組件職責分離，避免單檔過度耦合

實作模組：
- features/typing/useTypingSession.ts：打字狀態機與統計
- features/lookup/DictionaryLookup.tsx：查碼 UI
- features/dictionary/useDictionary.ts：字典 fetch + fallback
```

#### 3. 錯誤可觀測 (Observability)
```
模組：
- observability/logger.ts：結構化日誌（debug/info/warn/error）
- observability/errorHandling.ts：window error / unhandledrejection 捕捉
- observability/AppErrorBoundary.tsx：React 錯誤邊界 fallback UI
```

### 字典資料格式

#### CSV 格式
```csv
char,cangjie,quick
日,A,A
月,B,B
明,AB,AB
你好,ONF,OF
```

#### JSON 格式 (Array)
```json
[
  { "char": "日", "cangjie": "A", "quick": "A" },
  { "char": "月", "cangjie": "B", "quick": "B" }
]
```

#### JSON 格式 (Object Map)
```json
{
  "日": { "cangjie": "A", "quick": "A" },
  "月": { "cangjie": "B", "quick": "B" }
}
```

### 資料驗證規則
| 規則 | 說明 |
|------|------|
| char | 必須是單一中文字 (CJK 範圍: U+3400-U+9FFF, U+F900-U+FAFF) |
| cangjie | 必須是 1-5 個大寫英文字母 (A-Z) |
| quick | 可選，若未提供則從倉頡碼自動推導（取首尾碼） |
| 重複字元 | 後出現的會覆蓋先前的 |

## 本地開發

### 環境要求
- Node.js 25.7.0（以 `.nvmrc` 為準）
- npm 或 yarn

### 環境變數（設定治理）
建立 `.env.local`（或 `.env.development`）可覆蓋字典來源：

```bash
VITE_DICTIONARY_URL=/dict/sample-dictionary.json
VITE_DICTIONARY_VARIANT=core
```

- 所有執行期設定由 `src/config/runtime.ts` 集中管理
- 未提供 `VITE_DICTIONARY_URL` 時，會回退到預設 `/dict/sample-dictionary.json`

### 安裝與啟動
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# 程式碼檢查
npm run lint

# 全量品質關卡（typecheck + lint + unit/dom + coverage）
npm run check

# E2E 測試
npm run test:e2e

# v2 binary smoke test
npm run test:binary-smoke

# 產出 v2 binary/meta/licenses
npm run dict:build:v2 -- --input public/dict/sample-dictionary.json --variant core --version 2026.03.0

# 匯出 mobile sqlite
npm run dict:export:sqlite -- --input public/dict/sample-dictionary.json --output public/dict/dict.sqlite
```

### Vercel 部署
1. 推送程式碼至 GitHub
2. 在 Vercel Import Git Repository
3. Vercel 會自動偵測 Vite + React 專案
4. 部署完成後取得網址

## 使用說明

### 打字練習模式
1. 點擊「打字」標籤進入練習模式
2. 選擇計時長度（15/30/60/120 秒）
3. 點擊輸入框，切換至中文輸入法
4. 輸入與上方相同的文字（不需輸入空格）
5. 系統即時顯示正確/錯誤/進度
6. 時間結束或完成全文後顯示結果

### 字典查詢模式
1. 點擊「查碼」標籤進入查詢模式
2. 輸入要查詢的中文字元
3. 立即顯示對應的倉頡碼、速成碼、鍵盤序列

## Demo 資料說明

### 內建字典
- 目前內建約 50 個常用字示範資料
- 涵蓋：基本筆畫、常用字、詞組

### 練習素材
- 內建 4 個練習句子
- 可點擊「換一段」切換不同句子

## 擴展建議

### 1. 接入完整字典
```typescript
// 透過環境變數覆蓋字典來源（建議）
// .env.local
VITE_DICTIONARY_URL=/dict/full-dictionary.json

// 由 src/config/runtime.ts 統一讀取
// useDictionary 會自動載入並在失敗時 fallback
```

### 2. 新增練習素材
在 `PRACTICE_TEXTS` 陣列中新增練習句子

### 3. 加入排行榜
- 使用 localStorage 儲存歷史成績
- 或接入後端 API 儲存至資料庫

### 4. Dictionary v2 規格與落地清單
- 規格草案：`docs/dictionary-v2-spec.md`
- 實作清單：`docs/dictionary-v2-checklist.md`
- 封版說明：`docs/release-v1.2.0.md`
- 建議流程：先更新規格，再依清單拆 PR 實作，避免 migration 規則在開發中遺漏

## 授權與鳴謝

- 練習素材：原創白話文示範
- 字典資料：需自行準備版權合規的字典檔
- UI 靈感：Monkeytype (https://monkeytype.com/)

## 更新日誌

### v1.1.2 (2026-02-27) - PR1 lookup 抽象落地
- ✅ 完成 PR1 `lookup(char)` 抽象介面，`DictionaryLookup` 不再直接依賴 `Map.get`
- ✅ `useDictionary` 對外提供 `lookup`，並保留 `dictionaryIndex` 相容欄位
- ✅ 在 `pr/01-dict-v2-lookup-abstraction` 分支完成驗證：`npm run check`、`npm run test:e2e`、`npm run build`

### v1.2.0 (2026-02-27) - PR2-PR9 dictionary v2 落地
- ✅ PR2：新增 `src/lib/dictionaryBinary.ts` 與 `src/lib/dictionaryBinary.test.ts`（v2 binary codec + smoke）
- ✅ PR3：新增 `scripts/dict/build-v2.mts`、`scripts/dict/schema.ts`，可產出 `bin/meta/licenses`
- ✅ PR4：`src/features/dictionary/useDictionary.ts` 支援 `.bin` 載入並保留 fallback chain
- ✅ PR5：`src/lib/dictionary.ts` 升級 Han 驗證，支援非 BMP Han 與 U+3007
- ✅ PR6：字典載入新增 load/parse/decode 耗時紀錄（`logger`）
- ✅ PR7：CI 新增 `npm run test:binary-smoke`
- ✅ PR8：README 與 docs 補齊 v2 / mobile 產物流
- ✅ PR9：新增 `scripts/dict/export-sqlite.mts` 與 `docs/mobile-dict.md`

### v1.1.1 (2026-02-27) - v2 規格文件化
- ✅ 新增 `docs/dictionary-v2-spec.md`（bin/meta/migration 規格草案）
- ✅ 新增 `docs/dictionary-v2-checklist.md`（PR 執行與驗收清單）

### v1.1.0 (2026-02-27) - 基線補強
- ✅ Node/CI 對齊（`.nvmrc` + CI `node-version-file`）
- ✅ 測試分流（Vitest node/dom）與 coverage 門檻
- ✅ Playwright E2E 基線（3 條 happy-path）
- ✅ 架構拆分（features/config/observability）
- ✅ 字典來源設定治理（`VITE_DICTIONARY_URL`）

### v1.0.0 (2026-02-26) - Demo 封板
- ✅ 打字練習功能（WPM/CPM/準確率/進度）
- ✅ 字典查詢功能（倉頡碼/速成碼/鍵序）
- ✅ Monkeytype 風格深色主題
- ✅ 響應式設計（支援手機/平板）
- ✅ CSV/JSON 字典匯入優化
