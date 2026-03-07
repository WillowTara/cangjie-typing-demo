# Pronunciation Lookup 開發任務清單

Status: Phase 1-3 Complete (PR1-PR5 Done)
Owner: Lookup Platform
Last Updated: 2026-03-08
Related Spec: `docs/pronunciation-lookup-spec.md`

本清單用於把 pronunciation lookup 規格拆成可執行的開發任務，方便分 PR 落地並保持既有 `cangjie` / `quick` 行為不回歸。

## 0. 使用方式

- 每個 PR 只完成一個可獨立驗收的主題。
- 若實作偏離規格，先更新 `docs/pronunciation-lookup-spec.md`，再更新本清單。
- 若任何授權邊界改變，先補齊 docs 與 provenance 規則，再動程式。
- 若某項被標記為 deferred，不得在同一 PR 偷渡進 MVP。

## 1. Phase 1 - Hidden Plumbing

### T1. 型別與契約層
- [x] 在 `src/lib/dictionary.ts` 為 `LookupResult` 增加 optional pronunciation 欄位
- [x] 定義 `MandarinReading` / `PronunciationExample` runtime type
- [x] 明確保證現有 `cangjie` / `quick` 欄位與行為不變
- [x] 新型別不要求現有 `DictionaryEntry` parser 立刻吃進 pronunciation 欄位

### T2. Pronunciation runtime module
- [x] 新增 `src/lib/pronunciation.ts`
- [x] 實作 pronunciation payload validation
- [x] 實作 `Map<string, MandarinReading[]>` 建構
- [x] 實作 `lookupPronunciation(char)` 抽象介面
- [x] 對 invalid schema / empty payload / duplicate normalized readings 做 hard fail

### T3. Zhuyin keyboard mapping
- [x] 新增 `src/features/lookup/zhuyinKeyboard.ts`
- [x] 固定一套台灣注音鍵盤 layout
- [x] 提供 `zhuyinToKeySequence()`
- [x] 提供 `formatKeySequence()`
- [x] 對 tone mark / 符號組合 / 不支援符號建立測試案例

### T4. Build pipeline
- [x] 新增 `scripts/dict/build-pronunciation-unihan.mts`
- [x] 實作 Unihan-derived row ingestion（starter path）
- [x] 實作 Pinyin display normalization 與 deterministic sorting
- [x] 實作 ASCII normalized search key (`v` for `ü`)
- [x] 實作 Zhuyin display / key sequence 產生
- [x] emit `pronunciation.*.v1.json`
- [x] emit matching `meta.json`
- [x] emit matching `licenses.json`
- [x] 缺授權 metadata 時 build fail

### T5. Runtime loader
- [x] 新增 `src/features/dictionary/usePronunciationDictionary.ts`
- [x] 只在 lookup mode 使用 pronunciation loader
- [x] pronunciation load fail 時不影響主 dictionary lookup
- [x] 加入 non-blocking load error surface

### T6. Hidden integration
- [x] `DictionaryLookup` 可接收 pronunciation lookup 結果，且 hidden plumbing 已先接通
- [x] 未載入 pronunciation artifact 時，畫面維持主 lookup 可用
- [x] merged lookup result 能安全處理 `undefined` pronunciation data

### T7. Tests and gates
- [x] 新增 pronunciation unit tests
- [x] 新增 runtime merge / fallback tests
- [x] 確保既有 lookup tests 只做 additive 調整並持續通過
- [x] `npm run check` 通過
- [x] `npm run build` 通過

### T8. Docs and release prep
- [x] 更新相關 docs（至少 spec / checklist / task list）
- [ ] 在 release notes 中記錄 pronunciation artifact 與 visible UI rollout
- [x] 記錄 provenance / license notice 落點

## 2. Phase 2 - Visible Pronunciation Filter + Pinyin UI

### T9. Lookup filter bar
- [x] 在 `src/features/lookup/DictionaryLookup.tsx` 新增 filter bar
- [x] 預設開啟 `cangjie` / `quick` / `pinyin` / `zhuyin`
- [x] 支援多選
- [x] 支援透過只保留一項達成單選
- [x] 全部關閉時顯示明確提示，不讓畫面靜默變空

### T10. Pinyin render
- [x] 顯示 artifact 內既有 `pinyinDisplay`
- [x] 多音字顯示全部 readings
- [x] 顯示順序與 artifact `rank` 一致
- [x] 只開 pronunciation 系統但無資料時顯示 per-row empty state

### T11. Pinyin tests
- [x] UI tests 覆蓋預設狀態與 pinyin toggle
- [x] 多音字 render DOM assertions
- [x] pronunciation load fail 時保持 non-blocking fallback，且不 render pinyin rows

## 3. Phase 3 - Zhuyin UI

### T12. Zhuyin render
- [x] 顯示 `zhuyinDisplay`
- [x] 顯示 `zhuyinKeySequence`
- [x] 多音字與 pinyin 共用排序
- [x] layout 名稱在 docs 中有記錄

### T13. Zhuyin tests
- [x] UI tests 覆蓋 zhuyin toggle
- [x] keyboard hint render assertions
- [x] polyphonic zhuyin render assertions

## 4. Phase 4 - Optional Example Add-On

### T14. License gate
- [ ] 只有在 product/legal 確認後才啟動
- [ ] 若採用 CC-CEDICT，需有單獨 provenance / attribution / share-alike 策略
- [ ] 不得污染 base shipped artifact

### T15. Example rendering
- [ ] `examples[]` 只在 add-on source enabled 時顯示
- [ ] 例詞顯示與 reading 關聯正確
- [ ] base artifact 不含 examples 時 UI 不應留空殼區塊

## 5. 建議 PR 拆分

### PR1: Types + pronunciation runtime (completed)
- [x] `src/lib/dictionary.ts`
- [x] `src/lib/pronunciation.ts`
- [x] pronunciation unit tests

### PR2: Zhuyin mapping + build script (completed)
- [x] `src/features/lookup/zhuyinKeyboard.ts`
- [x] `src/features/lookup/zhuyinKeyboard.test.ts`
- [x] `scripts/dict/build-pronunciation-unihan.mts`
- [x] package scripts

### PR3: Runtime loader + hidden integration (completed)
- [x] `src/features/dictionary/usePronunciationDictionary.ts`
- [x] `src/features/lookup/DictionaryLookup.tsx` hidden plumbing
- [x] fallback / merge tests

### PR4: Visible filter bar + Pinyin UI (completed)
- [x] filter bar
- [x] pinyin rendering
- [x] UI / e2e tests

### PR5: Zhuyin UI (completed)
- [x] zhuyin rendering
- [x] keyboard hint UI
- [x] tests

### PR6: Optional examples (deferred)
- [ ] separate source / artifact / attribution path

## 6. 完成定義

- [x] 現有 lookup 主流程與 IME 行為不回歸
- [x] pronunciation artifact 可獨立 build / verify / trace
- [x] Pinyin / Zhuyin 可獨立開關
- [x] 多音字 deterministic
- [x] 商業可用資料來源邊界可被 docs 與 artifacts 證明
