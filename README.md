# 倉頡打字練習 - Cangjie Typing Practice Demo

![Version](https://img.shields.io/badge/version-1.0.0-blue)
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
│   ├── App.tsx              # 主應用元件 (包含所有 UI 元件)
│   ├── App.css             # 樣式定義
│   ├── index.css           # 全域樣式 (CSS Variables)
│   ├── main.tsx            # 入口點
│   └── lib/
│       └── dictionary.ts   # 字典資料處理與索引建置
├── public/
│   └── dict/               # 外部字典檔案 (CSV/JSON)
│       ├── sample-dictionary.csv
│       └── sample-dictionary.json
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

#### 2. App.tsx - 應用主邏輯
```
主要狀態 (State)：
- viewMode: 'typing' | 'lookup' | 'result'  # 視圖切換
- duration: number                            # 練習計時秒數
- inputValue: string                         # 使用者輸入
- timeLeft: number                           # 剩餘時間
- isRunning: boolean                         # 練習是否進行中
- testCompleted: boolean                     # 練習是否完成

主要函數：
- normalizeChineseText(): 過濾出中文字元
- codeToEnglishKeys(): 將倉頡碼轉為鍵盤序列
- handleInput(): 處理使用者輸入
- resetTypingState(): 重設練習狀態
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
- Node.js 18+
- npm 或 yarn

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
// 替換 src/App.tsx 中的 DICTIONARY 常數
import { parseDictionaryText, buildDictionaryIndex } from './lib/dictionary'

// 從 public/dict/ 目錄載入
const response = await fetch('/dict/full-dictionary.json')
const text = await response.text()
const FULL_DICTIONARY = parseDictionaryText('dict.json', text)
const FULL_INDEX = buildDictionaryIndex(FULL_DICTIONARY)
```

### 2. 新增練習素材
在 `PRACTICE_TEXTS` 陣列中新增練習句子

### 3. 加入排行榜
- 使用 localStorage 儲存歷史成績
- 或接入後端 API 儲存至資料庫

## 授權與鳴謝

- 練習素材：原創白話文示範
- 字典資料：需自行準備版權合規的字典檔
- UI 靈感：Monkeytype (https://monkeytype.com/)

## 更新日誌

### v1.0.0 (2026-02-26) - Demo 封板
- ✅ 打字練習功能（WPM/CPM/準確率/進度）
- ✅ 字典查詢功能（倉頡碼/速成碼/鍵序）
- ✅ Monkeytype 風格深色主題
- ✅ 響應式設計（支援手機/平板）
- ✅ CSV/JSON 字典匯入優化
