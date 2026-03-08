# Pronunciation Full Coverage Backfill Plan

Status: Proposed Post-v2.0 Follow-up
Owner: Lookup Platform
Last Updated: 2026-03-09
Related Spec: `docs/pronunciation-lookup-spec.md`
Related Task List: `docs/pronunciation-lookup-task-list.md`

## 1. Current Answer

Mainland Mandarin pinyin and Taiwan zhuyin are **not yet fully included** across the shipped full dictionary.

- Current pronunciation entries: `41,304`
- Full dictionary characters: `70,275`
- Current coverage: `58.7748%`
- Current gap: `28,971`

Current shipped pronunciation is:

1. Mandarin readings from Unicode Unihan fields currently ingested by `scripts/dict/build-pronunciation-unihan.mts`
2. Zhuyin generated from those Mandarin readings at build time
3. Commercial-safe for the base artifact because the shipped source is Unicode Unihan under Unicode License V3

Current shipped zhuyin is **Taiwan-style notation output**, but it is **not a MOE-authoritative Taiwan reading set**.

## 2. Gap Shape

Audit against `public/dict/full-dictionary.csv` and `public/dict/pronunciation.latest.v1.json` shows:

- `ExtB`: `28,097`
- `ExtA`: `805`
- `URO`: `45`
- `ExtC`: `14`
- `ExtE/F`: `5`
- `Compat`: `3`
- `U+3007`: `1`
- `ExtD`: `1`

This means the remaining gap is dominated by non-BMP Han, not by common BMP characters.

## 3. Repo-Native Audit Command

Use the audit command before and after every backfill step:

```bash
npm run dict:pronunciation:audit
```

Optional outputs:

```bash
npm run dict:pronunciation:audit -- \
  --summary-out public/dict/pronunciation.coverage-audit.json \
  --missing-out public/dict/pronunciation.missing.json
```

The audit script compares the full dictionary against the current pronunciation artifact and prints:

- dictionary character count
- pronunciation entry count
- missing count
- coverage ratio
- missing-character block breakdown
- first 20 missing characters for spot checks

## 4. Full-Coverage Backfill Strategy

### Round 1 result (2026-03-09)

The first Unicode-only backfill pass is complete.

- build script now ingests `kXHC1983` and `kTGHZ2013`
- build tool version advanced to `pronunciation-build/0.3.0`
- regression coverage now includes:
  - `kXHC1983` parsing with multi-location tokens
  - `kTGHZ2013` parsing
  - non-BMP / ExtB character retention
  - pronunciation audit block classification
- rebuilt artifact: `public/dict/pronunciation.2026.03.0.c5c8713a.v1.json`
- rebuilt meta: `public/dict/pronunciation.2026.03.0.c5c8713a.meta.json`

Measured delta vs `a0b774bd`:

- `entryCount`: `41,304 -> 41,306` (`+2`)
- `readingCount`: `52,299 -> 52,793` (`+494`)
- `dictionaryCoverageRatio`: `0.587748 -> 0.587777`
- newly covered characters: `䶸`, `𠮾`

Interpretation:

- this pass materially improved polyphonic coverage
- this pass only marginally improved total character coverage
- the dominant residual gap is still ExtB and above, so external-source review remains a separate next step after Unicode-only exhaustion

### Round 2 result (2026-03-09): Unihan + CNS11643 merge

This round adds a second character-level source:

- `CNS_phonetic.txt` (CNS code -> zhuyin)
- `CNS_pinyin_2.txt` (zhuyin -> Hanyu pinyin with tone marks)
- `CNS2UNICODE_Unicode *.txt` (CNS code -> Unicode)

and merges it with Unihan at build time.

Rebuilt artifact:

- `public/dict/pronunciation.2026.03.0.8667b87e.v1.json`
- `public/dict/pronunciation.2026.03.0.8667b87e.meta.json`
- `public/dict/pronunciation.2026.03.0.8667b87e.licenses.json`

Measured delta vs round-1 artifact `c5c8713a`:

- `entryCount`: `41,306 -> 70,203` (`+28,897`)
- `readingCount`: `52,793 -> 97,827` (`+45,034`)
- `dictionaryCoverageRatio`: `0.587777 -> 0.998975`
- `missingCount`: `28,969 -> 72`

Residual gap block profile after round 2:

- `ExtB`: `44`
- `URO`: `21`
- `ExtA`: `5`
- `Compat`: `1`
- `ExtD`: `1`

This is the first pass that moves coverage from partial to near-full while keeping a per-character source model.

### Licensing verification outcome for CNS11643

Confirmed sources:

- dataset page: `https://data.gov.tw/dataset/5961`
- license text: `https://data.gov.tw/license`
- downloads: `https://www.cns11643.gov.tw/opendata/Properties.zip`, `https://www.cns11643.gov.tw/opendata/MapingTables.zip`

Confirmed conditions used in this implementation:

1. Data can be used for commercial purposes under Government Data Open License v1.0.
2. Derivative/transformed outputs are allowed under the same license framework.
3. Attribution/statement obligations remain required by that license.

Note: this round only uses character-level phonetic and mapping tables, not dictionary text corpora.

### Phase A. Exhaust current Unicode/Unihan path first

This is the safest commercial path and should be exhausted before introducing any new external source.

Required implementation steps:

1. Expand `scripts/dict/build-pronunciation-unihan.mts` to ingest additional Unihan Mandarin-reading fields:
   - `kXHC1983`
   - `kTGHZ2013`
2. Keep existing fields in place:
   - `kMandarin`
   - `kHanyuPinyin`
   - `kHanyuPinlu`
3. Merge by normalized pinyin key, dedupe deterministically, and retain field provenance per reading.
4. Rebuild and rerun audit.

Why this phase comes first:

- stays inside Unicode License V3
- avoids reopening the shipped commercial-safety boundary
- may close part of the remaining gap without adding legal complexity

### Phase B. Verify non-BMP handling end to end

Because the current gap is overwhelmingly `ExtB+`, explicitly verify:

1. Unihan parsing retains non-BMP code points correctly
2. row filtering against `full-dictionary.csv` does not silently drop non-BMP characters
3. artifact JSON keys preserve surrogate pairs correctly
4. runtime validation and lookup continue to accept non-BMP keys

This phase is mandatory even if coverage improves after Phase A.

### Phase C. Re-audit and classify residual gap

After Phase A and B:

1. rebuild pronunciation artifact
2. rerun `npm run dict:pronunciation:audit`
3. compare old vs new missing block distribution
4. isolate whether residual gap is:
   - still mostly `ExtB+`
   - a smaller rare-character residue
   - caused by source absence rather than pipeline loss

## 5. External Source Policy After Unicode-Only Exhaustion

If Unicode-only backfill still leaves material gaps, split the next step by artifact class.

### Allowed candidate for further review

- `CNS11643` open data / full character set resources
  - promising because it appears to include character-level phonetic data under open government terms
  - requires a separate provenance and schema review before adoption
  - do not ship it in the base artifact until the exact files, field meanings, and notice requirements are verified

### Keep out of the base shipped artifact for now

- MOE / moedict-derived transformed lookup data
  - current policy remains avoid due to `CC BY-ND` derivative-work risk
- CC-CEDICT-derived base artifact
  - keep as optional add-on only because `CC BY-SA` expands attribution/share-alike obligations

## 6. Product Truth to Keep in UI/Docs

Until a Taiwan-authoritative source is adopted, describe the feature as:

- Mandarin readings from Unicode Unihan
- Zhuyin generated from those readings for lookup display

Do **not** describe it as:

- full Taiwan MOE pronunciation coverage
- 100% pronunciation coverage
- authoritative Taiwan reading standard

## 7. Execution Checklist

### PR-A: Coverage audit tooling

- [x] add `scripts/dict/audit-pronunciation-coverage.mts`
- [x] add `npm run dict:pronunciation:audit`
- [ ] optionally persist audit summary and missing list artifacts for review

### PR-B: Unihan expansion

- [x] add `kXHC1983` parsing
- [x] add `kTGHZ2013` parsing
- [x] preserve deterministic ranking and dedupe
- [x] include source provenance per reading

### PR-C: ExtB verification

- [x] add regression fixtures for representative ExtB characters
- [x] verify build output keeps non-BMP keys intact
- [x] rerun coverage audit and compare before/after metrics

### PR-D: External source decision

- [x] review `CNS11643` exact downloadable files and notices
- [ ] decide whether it can join the base artifact or only an optional layer
- [ ] update docs before any implementation if the source boundary changes

## 8. Success Criteria

This follow-up is considered complete only when all of the following are true:

1. `npm run dict:pronunciation:audit` is part of the normal pronunciation workflow
2. Unicode-only expansion has been exhausted and measured
3. non-BMP handling has explicit regression coverage
4. residual gaps are explained by evidence, not guesses
5. docs describe the shipped pronunciation scope truthfully
