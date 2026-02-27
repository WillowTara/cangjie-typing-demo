# Dictionary v2 Implementation Checklist

Status: Active
Owner: Dictionary Platform
Last Updated: 2026-02-27
Related Spec: `docs/dictionary-v2-spec.md`

本清單用於追蹤 `v1 CSV/JSON -> v2 binary` 的落地進度，避免在多個 PR 開發時遺漏關鍵規則。

## 0. 使用方式

- 每個 PR 只勾選該 PR 實際完成項目。
- 若規格有調整，先更新 `docs/dictionary-v2-spec.md`，再更新本清單。
- 任何「不適用」項目需在 PR 描述中寫明原因。

## 1. 資料來源與授權

- [ ] 已確認來源資料清單（Unihan / Cangjie table / frequency）
- [ ] 已記錄來源版本、下載日期、原始檔 hash
- [ ] 已確認授權相容，並可商業使用（如適用）
- [ ] 已產生 `*.licenses.json` 並包含所有上游來源
- [ ] 缺少授權資訊時，build 會 fail（不可默默略過）

## 2. v2 Binary 產物規格

- [ ] 產物檔名符合：`<variant>.<dictVersion>.<contentHash>.v2.bin`
- [ ] Header magic 為 `CJDICTV2`
- [ ] Header 版本欄位為 `versionMajor=2`
- [ ] Header offsets / payloadBytes / payloadCrc32 可被驗證
- [ ] Section A 為 sorted unique `u32 codepoints`
- [ ] Section B 為固定 6 bytes cangjie slot（len + A-Z 編碼）
- [ ] Section C quick table 行為符合 flags（有/無）
- [ ] Section D frequency table 行為符合 flags（有/無）

## 3. Meta Sidecar 規格

- [ ] 產物檔名符合：`<variant>.<dictVersion>.<contentHash>.meta.json`
- [ ] `schema` 為 `cj-dict-meta@2`
- [ ] `artifact.file` / `artifact.sha256` / `artifact.bytes` 正確
- [ ] `stats.entryCount` 與 binary header `entryCount` 一致
- [ ] `unicode.includesNonBmpHan` 由實際資料計算
- [ ] `compat.minRuntimeSchema` 與 runtime loader 驗證邏輯一致
- [ ] `sources[]` 非空，且每項含 license + version + hash

## 4. Migration 規則（v1 -> v2）

- [ ] 保留 v1 duplicate policy：後出現覆蓋前者
- [ ] 保留 quick derive policy（缺 quick 時推導）
- [ ] 單字驗證改為「單一 Unicode codepoint」而非 UTF-16 長度
- [ ] Han 字元驗證涵蓋非 BMP（避免只收 BMP CJK）
- [ ] U+3007 被視為合法字元
- [ ] emit 前做 canonical sort（codepoint asc）
- [ ] emit 結果保證 codepoint 唯一
- [ ] runtime fallback chain 完整：`v2 -> v1 -> built-in fallback`
- [ ] 產物檔名含 content hash，避免 cache 汙染

## 5. Runtime 整合（本 repo）

- [x] UI lookup 走抽象介面（例如 `lookup(char)`），不綁死 `Map.get`
- [x] `useDictionary` 可辨識並載入 v2 binary（`arrayBuffer`）
- [x] v2 decode 失敗時會回退 v1 parser
- [x] v1 parser 失敗時會回退 built-in fallback index
- [x] `VITE_DICTIONARY_URL` 相容既有行為
- [x] （可選）`core/full` variant 切換策略已定義

## 6. 測試與品質關卡

- [x] 新增 binary codec 單元測試（header/offset/crc/decode）
- [x] 新增 Unicode edge case 測試（含非 BMP）
- [x] 新增 migration parity 測試（v1 vs v2 查詢結果一致）
- [x] `npm run check` 通過
- [x] `npm run test:e2e` 通過
- [x] `npm run build` 通過

## 7. PR 拆分與驗收（建議）

### PR1: Lookup 抽象介面
- [x] 完成 lookup interface 抽象，UI 不直接依賴 `Map`

### PR2: Binary codec
- [x] 完成 v2 encode/decode + 單測

### PR3: Build pipeline
- [x] 完成輸入 v1、輸出 `bin/meta/licenses`

### PR4: Runtime integration
- [x] 完成 `useDictionary` binary 載入與 fallback

### PR5: Unicode hardening
- [x] 完成非 BMP Han 驗證與測試

### PR6: Perf + observability
- [x] 完成載入/解碼耗時記錄

### PR7: CI hardening
- [x] CI 新增 binary smoke 檢查

### PR8: Docs + release
- [x] README / docs / release note 更新完成

### PR9: SQLite exporter
- [x] 完成 SQLite 輸出腳本與 mobile 使用文檔

### PR10: Core 常用字資料集
- [x] 新增 core 常用字字典與 v2 產物（`core-dictionary.csv` + `core.*.v2/meta/licenses`）

### PR11: Artifact verification + CI evidence
- [x] 新增 core artifact 驗證腳本並接入 CI（`npm run dict:verify:core`）

## 8. Release 前最後檢查

- [x] 產物檔名帶 hash，且與 meta 一致
- [x] spec 與實作一致（無規格漂移）
- [x] 來源授權資料可追溯
- [x] rollback 路徑可用（可切回 v1）
- [x] 版本標記與 changelog 已更新

## 9. Progress Notes

- 2026-02-27: PR1 `lookup` 抽象完成（`src/App.tsx`、`src/features/dictionary/useDictionary.ts`、`src/features/lookup/DictionaryLookup.tsx`、`src/lib/dictionary.ts`）。
- 2026-02-27: PR1 分支品質關卡已通過：`npm run check`、`npm run test:e2e`、`npm run build`。
- 2026-02-27: 補齊測試/清單必做項：新增 migration parity 測試（`src/lib/dictionaryBinary.test.ts`），並重跑 `npm run check`、`npm run test:e2e`、`npm run build`、`npm run dict:build:v2 -- --input public/dict/sample-dictionary.json --variant core --version 2026.03.0 --out-dir dist/dict-v2`、`npm run dict:export:sqlite -- --input public/dict/sample-dictionary.json --output dist/dict-v2/dict.sqlite`。
- 2026-02-27: PR11 新增 `scripts/dict/verify-core-artifacts.mts`，並在 CI 加入 `npm run dict:verify:core`，驗證 `core-dictionary.csv` 與 `core.*.v2/meta/licenses` 一致性（sha256/entryCount/duplicateOverrides/hash filename）。
