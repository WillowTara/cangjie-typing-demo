# Pronunciation Lookup Phase 1 實作開始稿

Status: Draft
Owner: Lookup Platform
Last Updated: 2026-03-08
Related Spec: `docs/pronunciation-lookup-spec.md`
Related Task List: `docs/pronunciation-lookup-task-list.md`
Related Checklist: `docs/pronunciation-lookup-implementation-checklist.md`

本文件是 Phase 1（Hidden Plumbing）的實作開始稿，目標是讓第一批 PR 可以直接照此順序開工，而不必重新拆解規格。

## 1. Phase 1 目標

Phase 1 只做 plumbing，不把 pronunciation UI 暴露給最終使用者。

完成後應具備：
- pronunciation artifact 可被 build 出來
- runtime 可載入 pronunciation artifact
- lookup 系統可安全合併 pronunciation data
- UI 預設看起來與現在完全一樣
- tests 能證明 pronunciation 層缺席時不影響主 lookup

## 2. Phase 1 明確不做

- 不新增 lookup filter bar
- 不顯示 pinyin / zhuyin row
- 不更新 README 功能宣傳文案
- 不引入 example words source
- 不做 phrase lookup 或 pronunciation search

## 3. 建議實作順序

### Step 1. 先落型別與 runtime contract

目標檔案：
- `src/lib/dictionary.ts`
- `src/lib/pronunciation.ts`

建議先完成：
- `MandarinReading`
- `PronunciationExample`
- pronunciation payload type
- `buildPronunciationIndex()`
- `lookupPronunciation()`

Phase 1 建議型別草稿：

```ts
export type PronunciationExample = {
  term: string
  pinyinDisplay?: string
  zhuyinDisplay?: string
  source: string
}

export type MandarinReading = {
  id: string
  pinyinDisplay: string
  pinyinAscii: string
  zhuyinDisplay: string
  zhuyinKeySequence: string
  source: string
  rank: number
  examples?: readonly PronunciationExample[]
}
```

`src/lib/dictionary.ts` 中只做 additive 擴充：

```ts
export type LookupResult = {
  cangjie: string
  quick: string
  mandarinReadings?: readonly MandarinReading[]
}
```

注意：
- 不要重寫既有 parser
- 不要把 pronunciation 強塞回現有 `DictionaryEntry`
- 不要讓 `lookup(char)` 在無 pronunciation 時回傳不同 shape 的錯誤值

### Step 2. 完成 Zhuyin keyboard mapping

目標檔案：
- `src/features/lookup/zhuyinKeyboard.ts`

最小 deliverable：
- 一份固定 mapping table
- `zhuyinToKeySequence(zhuyin: string)`
- `formatKeySequence(keys: string)`

此步先獨立完成有兩個好處：
- build script 可直接重用
- 後續 UI render 不需再決定 layout 規則

### Step 3. 完成 build script

目標檔案：
- `scripts/dict/build-pronunciation-unihan.mts`
- `package.json`

最小 deliverable：
- 吃進 Unihan source
- 產出 `pronunciation.*.v1.json`
- 產出 `meta.json`
- 產出 `licenses.json`

Phase 1 不要求 binary encoding；JSON artifact 即可。

Build script 必做規則：
- 全部輸出正規化為 NFC
- reading 排序 deterministic
- 每字 dedupe normalized reading
- 缺 metadata / license 時 fail

### Step 4. 完成 runtime loader

目標檔案：
- `src/features/dictionary/usePronunciationDictionary.ts`

最小 deliverable：
- fetch latest artifact
- validate payload
- 建立 in-memory map
- 暴露 `lookupPronunciation`
- 暴露 `isLoading` / `loadError`

Phase 1 重要約束：
- pronunciation loader 不得阻塞現有 dictionary loader
- load fail 只能是 non-blocking state

### Step 5. 完成 hidden integration

目標檔案：
- `src/App.tsx`
- `src/features/lookup/DictionaryLookup.tsx`

做法：
- lookup mode 進場時可拿到 pronunciation lookup state
- 內部 row model 可以攜帶 `mandarinReadings`
- 但 Phase 1 不 render pronunciation row

這一步的目的不是改畫面，而是提前把資料線接通。

## 4. 建議 PR 切法

### PR1: Contract + runtime helpers
- `src/lib/dictionary.ts`
- `src/lib/pronunciation.ts`
- `src/lib/pronunciation.test.ts`

驗收：
- 型別 compile through
- pronunciation payload validation 有單測

### PR2: Zhuyin mapping + build script
- `src/features/lookup/zhuyinKeyboard.ts`
- `src/features/lookup/zhuyinKeyboard.test.ts`
- `scripts/dict/build-pronunciation-unihan.mts`
- `package.json`

驗收：
- build script 能產生 artifact
- meta / licenses 一起輸出

### PR3: Loader + hidden wiring
- `src/features/dictionary/usePronunciationDictionary.ts`
- `src/App.tsx`
- `src/features/lookup/DictionaryLookup.tsx`
- `src/App.test.tsx`

驗收：
- pronunciation 缺席時 lookup UX 不變
- pronunciation load fail 不會壞掉

## 5. 測試開始稿

### Unit tests
- payload schema invalid -> throw
- duplicate normalized readings -> collapse or fail per chosen rule
- `lü4` / `lu:4` / equivalent forms normalize to ASCII `lv4`
- zhuyin key sequence map has expected output

### Integration tests
- main lookup returns existing `cangjie` / `quick` unchanged
- merged result may include `mandarinReadings`
- missing pronunciation artifact keeps rows stable

### UI tests (Phase 1 only)
- lookup mode renders same visible rows as before
- no new pronunciation rows appear yet
- pronunciation loader failure message is non-blocking

## 6. 驗證命令

Phase 1 PR 至少要跑：

```bash
npm run check
npm run build
```

若 build script 已落地，另跑：

```bash
npm run dict:pronunciation:build
```

## 7. 風險提醒

- 不要為了方便把 pronunciation 資料混回現有 `CJDICTV2`，這會放大 migration 風險。
- 不要在 Phase 1 提前做 UI 曝光，不然很難判斷 regression 是資料層還是畫面層造成。
- 不要在未完成 provenance / license manifests 前把 artifact 視為可 release。
- 不要對 polyphonic ordering 用不穩定來源順序；建議在 build 階段固定排序規則。

## 8. Phase 1 完成定義

- `src/lib/pronunciation.ts` 與新測試落地
- `scripts/dict/build-pronunciation-unihan.mts` 可產生完整 artifact set
- `src/features/dictionary/usePronunciationDictionary.ts` 可安全載入或失敗
- `src/features/lookup/DictionaryLookup.tsx` 已具備 hidden pronunciation plumbing
- `npm run check` 與 `npm run build` 都通過
