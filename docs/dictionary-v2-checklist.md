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

- [ ] UI lookup 走抽象介面（例如 `lookup(char)`），不綁死 `Map.get`
- [ ] `useDictionary` 可辨識並載入 v2 binary（`arrayBuffer`）
- [ ] v2 decode 失敗時會回退 v1 parser
- [ ] v1 parser 失敗時會回退 built-in fallback index
- [ ] `VITE_DICTIONARY_URL` 相容既有行為
- [ ] （可選）`core/full` variant 切換策略已定義

## 6. 測試與品質關卡

- [ ] 新增 binary codec 單元測試（header/offset/crc/decode）
- [ ] 新增 Unicode edge case 測試（含非 BMP）
- [ ] 新增 migration parity 測試（v1 vs v2 查詢結果一致）
- [ ] `npm run check` 通過
- [ ] `npm run test:e2e` 通過
- [ ] `npm run build` 通過

## 7. PR 拆分與驗收（建議）

### PR1: Lookup 抽象介面
- [ ] 完成 lookup interface 抽象，UI 不直接依賴 `Map`

### PR2: Binary codec
- [ ] 完成 v2 encode/decode + 單測

### PR3: Build pipeline
- [ ] 完成輸入 v1、輸出 `bin/meta/licenses`

### PR4: Runtime integration
- [ ] 完成 `useDictionary` binary 載入與 fallback

### PR5: Unicode hardening
- [ ] 完成非 BMP Han 驗證與測試

### PR6: Perf + observability
- [ ] 完成載入/解碼/查詢耗時記錄

### PR7: CI hardening
- [ ] CI 新增 binary smoke / parity 檢查（如適用）

### PR8: Docs + release
- [ ] README / docs / release note 更新完成

## 8. Release 前最後檢查

- [ ] 產物檔名帶 hash，且與 meta 一致
- [ ] spec 與實作一致（無規格漂移）
- [ ] 來源授權資料可追溯
- [ ] rollback 路徑可用（可切回 v1）
- [ ] 版本標記與 changelog 已更新
