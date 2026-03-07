# Pronunciation Lookup Expansion Specification

Status: Proposed
Owner: Lookup Platform
Last Updated: 2026-03-08

This document defines the implementation plan for expanding dictionary lookup to support:
- Mandarin Pinyin
- Taiwan Zhuyin (Bopomofo)
- Zhuyin keyboard-key hints
- Configurable display filters for `cangjie`, `quick`, `pinyin`, and `zhuyin`

This specification is additive. It must preserve the current `char -> { cangjie, quick }` runtime path and keep existing lookup behavior unchanged when pronunciation data is unavailable.

## 1. Goals and Non-Goals

### Goals
- Add pronunciation data to lookup mode without regressing current `cangjie` / `quick` lookup.
- Support polyphonic characters by showing all readings in deterministic order.
- Allow users to choose which systems are visible in lookup UI.
- Keep shipped base data safe for commercial use.
- Keep artifact provenance and license traceability consistent with the existing dictionary pipeline.

### Non-Goals
- Phrase search as a primary lookup mode.
- Automatic context-based pronunciation disambiguation.
- Full IME implementation for Pinyin or Zhuyin input.
- Reverse lookup by pronunciation in the first release.
- Shipping MOE-derived transformed example text in the base artifact.

## 2. Locked Product Decisions

The following decisions are fixed for the first implementation:

1. Base shipped pronunciation data uses only Unicode Unihan-derived character readings.
2. The first shipped feature is character lookup augmentation, not phrase lookup.
3. Polyphonic characters show all readings; no single "best guess" is chosen in MVP.
4. The lookup UI supports multi-select directly; single-select is achieved by leaving only one system active.
5. Pinyin is displayed with tone marks and also stored in normalized ASCII form for future search.
6. Zhuyin is displayed with tone marks and also stores a keyboard-key sequence using one documented Taiwan keyboard layout mapping.
7. Example words are optional secondary data and are not part of the commercial-safe base artifact.

## 3. Licensing and Data Policy

### 3.1 Allowed for Base Shipped Artifact
- **Unicode Unihan**
  - License: Unicode License V3
  - Reason: permits use, copy, modify, distribute, and sell, with notice requirements
  - Usage in this project: base per-character Pinyin and Zhuyin readings

### 3.2 Not Allowed in Base Shipped Artifact
- **MOE / moedict-derived transformed dictionary text or extracted example subsets**
  - Reason: source chain includes `CC BY-ND`, which creates derivative-work risk for transformed/reformatted shipped datasets
  - Policy: do not include in the main pronunciation artifact

### 3.3 Optional Future Add-On Source
- **CC-CEDICT**
  - License: attribution + share-alike obligations
  - Policy: may be used only as a separate optional example-word artifact after explicit product/legal approval
  - Constraint: keep it out of the base artifact and generate a separate provenance/license manifest if enabled

### 3.4 Repository Requirements
- Every pronunciation artifact must ship with a machine-readable provenance manifest.
- Required license notices must be surfaced in distributed documentation before release.
- Build scripts must fail if source metadata is missing.

## 4. Architecture Overview

The current lookup stack is:
- `src/lib/dictionary.ts` - core `DictionaryEntry`, `LookupResult`, parser, index builder
- `src/lib/dictionaryBinary.ts` - `CJDICTV2` binary codec and binary lookup
- `src/features/dictionary/useDictionary.ts` - runtime dictionary loader
- `src/features/lookup/DictionaryLookup.tsx` - lookup UI rendering

The new pronunciation feature must remain separate from the existing main dictionary artifact:

1. Keep the current `CJDICTV2` artifact unchanged.
2. Add a new pronunciation artifact and loader.
3. Merge main lookup result + pronunciation result at runtime in lookup mode only.
4. Allow pronunciation loading to fail independently without breaking current lookup.

## 5. Files to Change

### Existing Files to Modify
- `src/App.tsx`
- `src/App.css`
- `src/lib/dictionary.ts`
- `src/features/dictionary/useDictionary.ts` (minimal additive changes only if needed)
- `src/features/lookup/DictionaryLookup.tsx`
- `src/App.test.tsx`
- `e2e/lookup-query.spec.ts`
- `package.json`

### New Files to Add
- `src/lib/pronunciation.ts`
- `src/features/dictionary/usePronunciationDictionary.ts`
- `src/features/lookup/zhuyinKeyboard.ts`
- `scripts/dict/build-pronunciation-unihan.mts`
- `docs/pronunciation-lookup-spec.md`

### Generated / Build Output Files
- `public/dict/pronunciation.<dictVersion>.<contentHash>.v1.json`
- `public/dict/pronunciation.latest.v1.json`
- `public/dict/pronunciation.<dictVersion>.<contentHash>.meta.json`
- `public/dict/pronunciation.<dictVersion>.<contentHash>.licenses.json`

## 6. Pronunciation Artifact Specification

### 6.1 Rationale

The existing `CJDICTV2` binary is optimized for fixed-width `cangjie` / `quick` data. Pronunciation data is variable-length and polyphonic, so the first implementation uses a separate JSON artifact to reduce migration risk and keep the current binary format stable.

Binary encoding for pronunciation may be introduced later only if runtime size/performance measurements justify it.

### 6.2 Artifact Set

For each pronunciation build, emit:

1. Data artifact:
- `public/dict/pronunciation.<dictVersion>.<contentHash>.v1.json`
- `public/dict/pronunciation.latest.v1.json`

2. Metadata sidecar:
- `public/dict/pronunciation.<dictVersion>.<contentHash>.meta.json`

3. License/provenance manifest:
- `public/dict/pronunciation.<dictVersion>.<contentHash>.licenses.json`

### 6.3 Top-Level JSON Shape

```json
{
  "schema": "cj-pronunciation@1",
  "dictVersion": "2026.03.0",
  "artifact": {
    "file": "pronunciation.2026.03.0.ab12cd34.v1.json",
    "sha256": "<hex>",
    "bytes": 123456
  },
  "entries": {
    "<char>": {
      "mandarinReadings": [
        {
          "id": "<stable-id>",
          "pinyinDisplay": "<tone-marked>",
          "pinyinAscii": "<ascii-normalized>",
          "zhuyinDisplay": "<tone-marked>",
          "zhuyinKeySequence": "<ascii-key-sequence>",
          "source": "unihan",
          "rank": 0
        }
      ]
    }
  }
}
```

### 6.4 Entry Contract

For each character key in `entries`:
- the key must be exactly one Unicode character
- `mandarinReadings` must be a non-empty array when an entry exists
- array ordering must be deterministic and stable across builds from identical source input
- duplicate normalized readings must be removed

### 6.5 Reading Contract

Each `MandarinReading` record must contain:
- `id: string`
  - deterministic per char + normalized reading
- `pinyinDisplay: string`
  - lowercase, tone-marked, NFC normalized
- `pinyinAscii: string`
  - lowercase ASCII search key, tone-number form
  - use `v` for `u:` / `ü`
- `zhuyinDisplay: string`
  - Zhuyin symbols with tone mark, NFC normalized
- `zhuyinKeySequence: string`
  - lowercase ASCII keyboard sequence derived from the chosen Zhuyin layout map
- `source: 'unihan' | <future-source-id>`
- `rank: number`
  - stable sort priority; lower value appears first
- `examples?: PronunciationExample[]`
  - omitted in the base artifact

### 6.6 Optional Example Contract

If example data is enabled in a future add-on artifact:

```ts
type PronunciationExample = {
  term: string
  pinyinDisplay?: string
  zhuyinDisplay?: string
  source: string
}
```

Base commercial-safe artifact must omit `examples`.

## 7. TypeScript Runtime Model

### 7.1 `src/lib/dictionary.ts`

Keep current fields unchanged and extend `LookupResult` additively:

```ts
type MandarinReading = {
  id: string
  pinyinDisplay: string
  pinyinAscii: string
  zhuyinDisplay: string
  zhuyinKeySequence: string
  source: string
  rank: number
  examples?: readonly PronunciationExample[]
}

type LookupResult = {
  cangjie: string
  quick: string
  mandarinReadings?: readonly MandarinReading[]
}
```

Notes:
- `DictionaryEntry` remains focused on current main dictionary input unless and until the main dictionary source format is deliberately expanded.
- Pronunciation loading is a separate layer, not a replacement for current parser behavior.

### 7.2 `src/lib/pronunciation.ts`

New module responsibilities:
- define pronunciation runtime types
- validate pronunciation JSON payloads
- build a `Map<string, MandarinReading[]>`
- expose `PronunciationLookupFn = (char: string) => readonly MandarinReading[] | undefined`

## 8. Build Pipeline

### 8.1 Script

Add `scripts/dict/build-pronunciation-unihan.mts`.

Responsibilities:
- ingest Unihan source data
- parse per-character Mandarin readings
- generate Zhuyin from normalized pronunciation data if not directly available from source build input
- derive `zhuyinKeySequence` from a static mapping table
- normalize all strings to NFC
- sort deterministically
- deduplicate normalized readings per character
- emit data artifact + meta + licenses manifest

### 8.2 Package Script

Add one or more `package.json` commands, for example:

```json
{
  "scripts": {
    "dict:pronunciation:build": "node scripts/dict/build-pronunciation-unihan.mts"
  }
}
```

### 8.3 Build Validation Rules

The build must fail when:
- source metadata is missing
- output ordering is unstable
- a reading cannot produce required normalized fields
- a Zhuyin keyboard mapping is missing
- duplicate normalized readings remain after dedupe
- emitted artifact hash / metadata / license manifests do not match

## 9. Runtime Loading Strategy

### 9.1 New Hook

Add `src/features/dictionary/usePronunciationDictionary.ts`.

Responsibilities:
- fetch `public/dict/pronunciation.latest.v1.json`
- validate payload via `src/lib/pronunciation.ts`
- build in-memory pronunciation lookup map
- cache success result for reuse while app session remains active
- expose:

```ts
type PronunciationDictionaryState = {
  lookupPronunciation: (char: string) => readonly MandarinReading[] | undefined
  isLoading: boolean
  loadError?: string
}
```

### 9.2 Loading Policy

To preserve current app startup behavior:
- do not load pronunciation data for typing mode
- load pronunciation data only when `DictionaryLookup` is mounted or lookup mode is entered

### 9.3 Failure Policy

If pronunciation artifact load fails:
- current `cangjie` / `quick` lookup must continue to work
- `pinyin` and `zhuyin` filters must be disabled or rendered unavailable
- user must see a non-blocking lookup message, not a fatal app error

## 10. UI Specification

### 10.1 Existing Reuse Point

Reuse the `config-option` button pattern already used in `src/features/typing/TypingView.tsx`.

### 10.2 Filter Bar

Add a display filter bar at the top of `src/features/lookup/DictionaryLookup.tsx`.

Visible systems:
- `cangjie`
- `quick`
- `pinyin`
- `zhuyin`

Defaults:
- enabled by default: `cangjie`, `quick`
- disabled by default: `pinyin`, `zhuyin`

User behavior:
- users may toggle any combination of systems
- single-select is naturally supported by leaving only one system enabled
- no separate `single mode` state is required in MVP

Convenience actions:
- `All`
- `Input Methods Only`
- `Pronunciation Only`
- `Reset Default`

State shape:

```ts
type VisibleLookupSystem = 'cangjie' | 'quick' | 'pinyin' | 'zhuyin'
```

```ts
type VisibleLookupSystems = Set<VisibleLookupSystem>
```

### 10.3 Row Rendering

For each character row:
- keep the existing character cell unchanged
- render only enabled systems
- preserve current `cangjie` / `quick` styling

System row behavior:
- `cangjie`: label + code + English key hint
- `quick`: label + code + English key hint
- `pinyin`: label + one or more pronunciation values stacked in stable order
- `zhuyin`: label + one or more Zhuyin values stacked in stable order, each with keyboard-key hint

### 10.4 Polyphonic Rendering

If a character has multiple readings:
- show all readings in one section for `pinyin`
- show all readings in one section for `zhuyin`
- order must match shared `mandarinReadings` rank order
- examples, if later enabled, appear beneath the associated reading only

### 10.5 Unavailable Data

When a selected system has no value for a character:
- render `-`

When the pronunciation layer has not loaded or failed:
- disable or visually mute `pinyin` / `zhuyin` filter controls
- show a non-blocking message in the lookup panel

### 10.6 CSS Work

Extend `src/App.css` with:
- filter bar container
- reusable selected / disabled states based on `config-option`
- stacked reading list styles
- example text styles
- Zhuyin key hint styles

## 11. Zhuyin Keyboard Mapping

Add `src/features/lookup/zhuyinKeyboard.ts`.

This file must:
- define one explicit keyboard mapping table
- be source controlled
- include comments stating the chosen layout name
- expose helpers:

```ts
function zhuyinToKeySequence(zhuyin: string): string
function formatKeySequence(keys: string): string
```

MVP requirement:
- exactly one documented Taiwan layout is supported
- layout switching is out of scope

## 12. Testing and Verification

### 12.1 Unit Tests

Add tests for:
- pronunciation artifact validation
- deterministic sort order
- duplicate reading collapse
- NFC normalization
- Pinyin ASCII normalization (`v` for `u:` / `ü`)
- Zhuyin keyboard mapping completeness

### 12.2 Runtime / Integration Tests

Add tests proving:
- existing `cangjie` / `quick` lookup is unchanged when pronunciation artifact is absent
- lookup continues to work when pronunciation loading fails
- merged lookup results include `mandarinReadings` when artifact is present

### 12.3 UI Tests

Update `src/App.test.tsx` and `e2e/lookup-query.spec.ts` for:
- default visible systems
- toggling all four systems
- multi-select behavior
- effective single-select behavior
- polyphonic character rendering
- disabled pronunciation filters when artifact load fails

### 12.4 Build Verification

Release verification for this feature must include:
- pronunciation artifact generation
- matching `meta.json` and `licenses.json`
- `npm run check`
- `npm run build`

## 13. Rollout Plan

### Phase 1 - Hidden Plumbing
- add types, artifact builder, loader, and tests
- do not expose new UI controls yet

### Phase 2 - Pinyin UI
- enable `pinyin` display toggle
- keep default filter set unchanged (`cangjie` + `quick`)

### Phase 3 - Zhuyin UI
- enable `zhuyin` display toggle
- enable Zhuyin keyboard-key hints

### Phase 4 - Optional Example Add-On
- evaluate a separately licensed example-word artifact only after product/legal sign-off
- do not merge this phase into the commercial-safe base dataset

## 14. Acceptance Criteria

The implementation is complete only when all of the following are true:

1. Current `cangjie` / `quick` lookup behavior remains unchanged by default.
2. Pronunciation data can be absent without lookup failure.
3. Users can show any combination of `cangjie`, `quick`, `pinyin`, and `zhuyin`.
4. Polyphonic characters display all readings in deterministic order.
5. Zhuyin rows show keyboard-key hints using the committed mapping table.
6. Base shipped pronunciation artifact is derived only from commercially safe allowed sources.
7. Pronunciation artifact ships with metadata and license/provenance manifests.
8. `npm run check` and `npm run build` pass after the feature lands.

## 15. Post-MVP Extensions

These are explicitly deferred until after the base implementation ships:
- phrase search by Pinyin or Zhuyin
- context-based pronunciation ranking
- user-configurable Zhuyin keyboard layouts
- persisted lookup filter preferences
- CC-CEDICT-backed example words or frequency-ranked examples
