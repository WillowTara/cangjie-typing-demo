# Pronunciation Lookup 檔案級 Implementation Checklist

Status: Active
Owner: Lookup Platform
Last Updated: 2026-03-08
Related Spec: `docs/pronunciation-lookup-spec.md`
Related Task List: `docs/pronunciation-lookup-task-list.md`

本清單按檔案追蹤 implementation，避免漏改 runtime、tests、docs 或 release evidence。

## 0. Core Contract Files

### `src/lib/dictionary.ts`
- [ ] `LookupResult` 增加 optional `mandarinReadings`
- [ ] 型別命名與現有 style 一致
- [ ] 不破壞既有 `DictionaryLookupFn` 使用方式
- [ ] 現有 parser / index builder 預設行為保持不變

### `src/lib/pronunciation.ts`
- [ ] 定義 `MandarinReading`
- [ ] 定義 payload schema type
- [ ] 實作 payload validation
- [ ] 實作 in-memory index builder
- [ ] 實作 `lookupPronunciation`
- [ ] 對 invalid payload 給出 clear error

## 1. Lookup Runtime Files

### `src/features/dictionary/usePronunciationDictionary.ts`
- [ ] fetch `pronunciation.latest.v1.json`
- [ ] validate before activation
- [ ] expose `lookupPronunciation`
- [ ] expose `isLoading`
- [ ] expose `loadError`
- [ ] load fail 不影響 `useDictionary`

### `src/features/dictionary/useDictionary.ts`
- [ ] 僅在必要時做最小 additive 改動
- [ ] 不改壞現有 `v2 -> v1 -> fallback` 行為
- [ ] 若加入 shared merge helper，需保持舊 lookup path 可單獨運作

## 2. UI Files

### `src/features/lookup/DictionaryLookup.tsx`
- [ ] 保留現有 input / IME sync 邏輯
- [ ] 新增 visible system state
- [ ] 新增 filter bar
- [ ] 預設只顯示 `cangjie` / `quick`
- [ ] 新增 `pinyin` row render
- [ ] 新增 `zhuyin` row render
- [ ] 多音字 render 全部 readings
- [ ] pronunciation load fail 時 UI non-blocking

### `src/features/lookup/zhuyinKeyboard.ts`
- [ ] 固定 layout mapping table
- [ ] mapping comments 完整
- [ ] helper API 簡單可測

### `src/App.tsx`
- [ ] lookup mode 接上 pronunciation loader
- [ ] typing mode 不主動載入 pronunciation artifact
- [ ] props 連接清楚，無不必要 lifting

### `src/App.css`
- [ ] 新增 filter bar 樣式
- [ ] 新增 disabled / active style
- [ ] stacked readings 樣式可讀
- [ ] zhuyin key hint 樣式可讀
- [ ] 手機版不溢出、不擠壓 lookup item

## 3. Build / Tooling Files

### `scripts/dict/build-pronunciation-unihan.mts`
- [ ] ingest source
- [ ] normalize Pinyin display
- [ ] normalize Pinyin ASCII search key
- [ ] derive Zhuyin display
- [ ] derive Zhuyin key sequence
- [ ] sort and dedupe
- [ ] emit data artifact
- [ ] emit meta sidecar
- [ ] emit licenses manifest
- [ ] source metadata 缺失時 fail

### `package.json`
- [ ] 新增 `dict:pronunciation:build`
- [ ] 若有 verifier，也新增對應 script
- [ ] 不影響既有 `npm run check` / `npm run build`

## 4. Tests

### `src/App.test.tsx`
- [ ] 保留既有 lookup regression coverage
- [ ] 新增 default visible systems test
- [ ] 新增 pinyin toggle test
- [ ] 新增 zhuyin toggle test
- [ ] 新增 multi-select test
- [ ] 新增 polyphonic render test
- [ ] 新增 pronunciation load fail test

### `e2e/lookup-query.spec.ts`
- [ ] 更新成不只驗證倉頡/速成
- [ ] 驗證 filter interactions
- [ ] 驗證 pronunciation visible state

### New unit test files
- [ ] `src/lib/pronunciation.test.ts`
- [ ] `src/features/lookup/zhuyinKeyboard.test.ts`
- [ ] 如有需要：`scripts/dict/build-pronunciation-unihan.test.ts` 或等效 parser test

## 5. Docs / Release Evidence

### `docs/pronunciation-lookup-spec.md`
- [ ] 若 implementation 偏離 spec，先更新本檔

### `docs/pronunciation-lookup-task-list.md`
- [ ] 勾選已完成任務

### `docs/pronunciation-lookup-implementation-checklist.md`
- [ ] 與實作同步更新

### `README.md`
- [ ] 功能 landing 後再更新字典查詢功能描述
- [ ] 若 shipped artifact 增加，補充 provenance / license notice 落點

## 6. Generated Outputs

### `public/dict/pronunciation.<dictVersion>.<contentHash>.v1.json`
- [ ] 檔名符合規格
- [ ] content hash 可追溯

### `public/dict/pronunciation.latest.v1.json`
- [ ] 指向最新構建輸出

### `public/dict/pronunciation.<dictVersion>.<contentHash>.meta.json`
- [ ] schema / file / hash / bytes 正確

### `public/dict/pronunciation.<dictVersion>.<contentHash>.licenses.json`
- [ ] 含上游來源與 license notice

## 7. 最後驗收

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] lookup default UX 與現況一致
- [ ] pronunciation feature 可獨立 disable / fail 而不影響主功能
- [ ] 產物 / docs / tests 一致
