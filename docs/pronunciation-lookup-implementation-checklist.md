# Pronunciation Lookup 檔案級 Implementation Checklist

Status: Phase 1–3 shipped; Phase 4 deferred
Owner: Lookup Platform
Last Updated: 2026-10-29
Related Spec: `docs/pronunciation-lookup-spec.md`
Related Task List: `docs/pronunciation-lookup-task-list.md`

本清單按檔案追蹤 implementation，避免漏改 runtime、tests、docs 或 release evidence。

勾選狀態對齊 `main` 上已落地的 Phase 1–3 與 post-v2.0 coverage backfill（見 task list T1–T13、T16–T18）。Phase 4 例詞 add-on 與規格裡尚未實作的項目維持未勾。

## 0. Core Contract Files

### `src/lib/dictionary.ts`
- [x] `LookupResult` 增加 optional `mandarinReadings`
- [x] 型別命名與現有 style 一致
- [x] 不破壞既有 `DictionaryLookupFn` 使用方式
- [x] 現有 parser / index builder 預設行為保持不變

### `src/lib/pronunciation.ts`
- [x] 定義 `MandarinReading`
- [x] 定義 payload schema type
- [x] 實作 payload validation
- [x] 實作 in-memory index builder
- [x] 實作 `lookupPronunciation`
- [x] 對 invalid payload 給出 clear error

## 1. Lookup Runtime Files

### `src/features/dictionary/usePronunciationDictionary.ts`
- [x] fetch `pronunciation.latest.v1.json`
- [x] validate before activation
- [x] expose `lookupPronunciation`
- [x] expose `isLoading`
- [x] expose `loadError`
- [x] load fail 不影響 `useDictionary`

### `src/features/dictionary/useDictionary.ts`
- [x] 僅在必要時做最小 additive 改動（讀音合併在 `App.tsx`，主字典 loader 未耦合 pronunciation）
- [x] 不改壞現有 `v2 -> text source -> fallback` 行為
- [x] 未加入 shared merge helper；舊 lookup path 可單獨運作

## 2. UI Files

### `src/features/lookup/DictionaryLookup.tsx`
- [x] 保留現有 input / IME sync 邏輯
- [x] 新增 visible system state
- [x] 新增 filter bar
- [x] 預設顯示 `cangjie` / `quick` / `pinyin` / `zhuyin`（task list T9；早先「只開倉頡/速成」的預設已被此行為取代）
- [x] 新增 `pinyin` row render
- [x] 新增 `zhuyin` row render
- [x] 多音字 render 全部 readings
- [x] pronunciation load fail 時 UI non-blocking（提示「讀音資料暫時不可用」，倉頡/速成仍可用）

### `src/features/lookup/zhuyinKeyboard.ts`
- [x] 固定 layout mapping table（標準台灣注音鍵盤）
- [x] mapping comments 標明所選 layout
- [x] helper API 簡單可測（`zhuyinToKeySequence` / `formatKeySequence`）

### `src/App.tsx`
- [x] lookup mode 接上 pronunciation loader
- [x] typing mode 不主動載入 pronunciation artifact
- [x] props 連接清楚，無不必要 lifting

### `src/App.css`
- [x] 新增 filter bar 樣式
- [x] 新增 active style（`.lookup-filter-btn.active`）
- [ ] 新增 disabled style（讀音載入失敗時 filter 按鈕仍可按，尚未 disable / mute）
- [x] readings 與倉頡/速成同一套 code row，多音字以空格並列，樣式可讀（v2.0.1 對齊查碼行，不再用 chip 堆疊）
- [x] zhuyin key hint 樣式可讀（`.code-english`）
- [x] 手機版 filter / lookup item 改為換行與直向排列，避免擠在同一行

## 3. Build / Tooling Files

### `scripts/dict/build-pronunciation-unihan.mts`
- [x] ingest source
- [x] normalize Pinyin display
- [x] normalize Pinyin ASCII search key
- [x] derive Zhuyin display
- [x] derive Zhuyin key sequence
- [x] sort and dedupe
- [x] emit data artifact
- [x] emit meta sidecar
- [x] emit licenses manifest
- [x] source metadata 缺失時 fail

### `package.json`
- [x] 新增 `dict:pronunciation:build`
- [x] 新增對應的 `dict:pronunciation:audit`
- [x] 不影響既有 `npm run check` / `npm run build`（腳本為附加項）

## 4. Tests

### `src/App.test.tsx`
- [x] 保留既有 lookup regression coverage
- [x] 新增 default visible systems test
- [x] 新增 pinyin toggle test
- [x] 新增 zhuyin toggle test
- [x] 新增 multi-select test（可逐項關閉，全部關閉時有提示）
- [x] 新增 polyphonic render test
- [x] 新增 pronunciation load fail test

### `e2e/lookup-query.spec.ts`
- [x] 更新成不只驗證倉頡/速成
- [x] 驗證 filter interactions
- [x] 驗證 pronunciation visible state

### New unit test files
- [x] `src/lib/pronunciation.test.ts`
- [x] `src/features/lookup/zhuyinKeyboard.test.ts`
- [x] `scripts/dict/build-pronunciation-unihan.test.ts`（另有 `scripts/dict/audit-pronunciation-coverage.test.ts`）

## 5. Docs / Release Evidence

### `docs/pronunciation-lookup-spec.md`
- [ ] 若 implementation 偏離 spec，先更新本檔

仍未改 spec，以下差異還在：

- §10.2 預設仍寫「只開倉頡/速成」；已出貨預設是四個系統全開
- §10.2 convenience actions（All / Input Methods Only / Pronunciation Only / Reset Default）未做
- §9.3 / §10.5 要求讀音載入失敗時 disable 或 mute 拼音/注音 filter；目前只顯示 non-blocking 訊息
- §10.3 / §10.6 的 stacked reading list 與 example text styles 未作為現行 UI；例詞屬於 Phase 4

### `docs/pronunciation-lookup-task-list.md`
- [x] 勾選已完成任務（Phase 1–3 與 T16–T18 的已完成項；Phase 4 與 optional add-on 仍未勾）

### `docs/pronunciation-lookup-implementation-checklist.md`
- [x] 與實作同步更新（本檔）

### `README.md`
- [x] 字典查詢功能描述已補上已出貨的拼音/注音
- [x] shipped pronunciation artifact 的 provenance / license notice 落點已補在「授權與鳴謝」

## 6. Generated Outputs

目前 `pronunciation.latest.v1.json` 與 `pronunciation.2026.03.0.8667b87e.v1.json` 內容相同。檔名短 hash 對應 build 時 preliminary payload 的 sha256 前綴；`.meta.json` 記錄最終檔案的 sha256 與 bytes。

### `public/dict/pronunciation.<dictVersion>.<contentHash>.v1.json`
- [x] 檔名符合規格
- [x] content hash 可追溯

### `public/dict/pronunciation.latest.v1.json`
- [x] 指向最新構建輸出（`pronunciation.2026.03.0.8667b87e.v1.json`）

### `public/dict/pronunciation.<dictVersion>.<contentHash>.meta.json`
- [x] schema / file / hash / bytes 正確（`8667b87e` meta 的 sha256 `1bf31d43…` 與 bytes `29107675` 對得上該 v1 檔）

### `public/dict/pronunciation.<dictVersion>.<contentHash>.licenses.json`
- [x] 含上游來源與 license notice（Unicode License V3、CNS11643 政府資料開放授權）

## 7. 最後驗收

- [x] `npm run check`（feature 落地時已記錄通過；見 task list T7 與 README v1.2.13）
- [x] `npm run build`（同上）
- [x] lookup default UX 與現況一致（四個顯示系統預設開啟）
- [x] pronunciation feature 可獨立 disable / fail 而不影響主功能
- [x] 產物 / tests 與本清單的已出貨範圍一致（spec 差異與 Phase 4 另列於未勾項目）

## 8. Deferred — Phase 4 optional examples

對應 task list T14、T15、PR6，以及 T18 尚未勾選的 optional add-on。`src/lib/pronunciation.ts` 已能驗證 optional `examples`，查碼 UI 不渲染例詞。

- [ ] 只有在 product/legal 確認後才啟動 example add-on
- [ ] 若採用 CC-CEDICT，需有單獨 provenance / attribution / share-alike 策略
- [ ] 不得污染 base shipped artifact
- [ ] `examples[]` 只在 add-on source enabled 時顯示
- [ ] 例詞顯示與 reading 關聯正確
- [ ] base artifact 不含 examples 時 UI 不應留空殼區塊
