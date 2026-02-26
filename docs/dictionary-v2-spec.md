# Dictionary Data Format v2 Specification (Draft)

Status: Draft (PR1 implemented)
Owner: Dictionary Platform
Last Updated: 2026-02-27

This document defines:
- Binary dictionary artifact format (`*.v2.bin`)
- Metadata sidecar schema (`*.meta.json`)
- Migration rules from v1 CSV/JSON pipeline

It is intended to guide implementation in this repository while preserving current runtime compatibility.

## 1. Scope and Non-Goals

### Scope
- Fast `char -> {cangjie, quick}` lookup for Web runtime
- Reusable build outputs for future iOS/Android
- Deterministic, versioned artifacts with provenance and license traceability

### Non-Goals
- Phrase prediction and multi-character language model
- Input method candidate ranking model training
- Reverse lookup optimization (`code -> chars`) in v2 baseline

## 2. Artifact Set

For each dictionary variant, build pipeline must emit:

1) Binary payload:
- `public/dict/<variant>.<dictVersion>.<contentHash>.v2.bin`

2) Metadata sidecar:
- `public/dict/<variant>.<dictVersion>.<contentHash>.meta.json`

3) License/provenance manifest:
- `public/dict/<variant>.<dictVersion>.<contentHash>.licenses.json`

Where:
- `variant` in `{core, full}`
- `dictVersion` is semantic release-like string (example: `2026.03.0`)
- `contentHash` is stable hash of binary payload (example: first 8-12 chars of SHA-256)

## 3. Binary Format (`v2.bin`)

### 3.1 Endianness
- All numeric fields are little-endian.

### 3.2 File Layout

```text
[Header: fixed 64 bytes]
[Section A: codepoints table]
[Section B: cangjie table]
[Section C: quick table (optional)]
[Section D: frequency table (optional)]
```

### 3.3 Header (64 bytes)

| Offset | Type  | Field            | Description |
|---|---|---|---|
| 0  | u8[8] | magic            | ASCII `CJDICTV2` |
| 8  | u16   | versionMajor     | `2` |
| 10 | u16   | versionMinor     | `0` |
| 12 | u32   | flags            | bit flags (see below) |
| 16 | u32   | entryCount       | Total entries `N` |
| 20 | u32   | headerSize       | Must be `64` |
| 24 | u32   | codepointsOffset | Section A offset |
| 28 | u32   | cangjieOffset    | Section B offset |
| 32 | u32   | quickOffset      | Section C offset, `0` if absent |
| 36 | u32   | frequencyOffset  | Section D offset, `0` if absent |
| 40 | u32   | payloadBytes     | Byte length of all sections |
| 44 | u32   | payloadCrc32     | CRC32 of payload sections |
| 48 | u32   | sourceHash32     | Build input aggregate hash (truncated) |
| 52 | u32   | buildEpochSec    | Build time (epoch seconds) |
| 56 | u32   | reserved0        | Must be `0` |
| 60 | u32   | reserved1        | Must be `0` |

Flags (`u32`):
- bit0 (`1`): hasQuickTable
- bit1 (`2`): hasFrequency
- bit2 (`4`): quickDerivedDefault
- other bits reserved, must be `0`

### 3.4 Section A: Codepoints Table
- Length: `N * 4` bytes
- Type: `u32[N]`
- Content: Unicode codepoints sorted ascending
- Constraint: strictly increasing, no duplicates

### 3.5 Section B: Cangjie Table (Fixed Slot)
- Length: `N * 6` bytes
- Record per entry:
  - byte0: length (`1..5`)
  - byte1..5: `A..Z` encoded as `0..25`
  - unused bytes padded with `255`

### 3.6 Section C: Quick Table (Optional)
- Present when `flags.hasQuickTable = 1`
- Length: `N * 6` bytes
- Same encoding as Section B
- Omit this section when quick is fully derivable from cangjie and `quickDerivedDefault = 1`

### 3.7 Section D: Frequency Table (Optional)
- Present when `flags.hasFrequency = 1`
- Length: `N * 4` bytes
- Type: `u32[N]`
- Interpretation: smaller value means more common character (rank-based)

### 3.8 Runtime Lookup Contract
1) Convert input character to Unicode codepoint.
2) Binary search in Section A.
3) If found index `i`, decode cangjie record at Section B index `i`.
4) Decode quick from Section C if present; otherwise derive from cangjie (first + last, or full when length <= 2).
5) Return miss if not found.

Target complexity:
- Lookup: `O(log N)`
- Decode per hit: `O(1)`

## 4. Metadata Sidecar (`meta.json`) Draft

### 4.1 Required Fields

```json
{
  "schema": "cj-dict-meta@2",
  "dictVersion": "2026.03.0",
  "variant": "core",
  "artifact": {
    "file": "core.2026.03.0.ab12cd34.v2.bin",
    "sha256": "<hex>",
    "bytes": 123456
  },
  "format": {
    "versionMajor": 2,
    "versionMinor": 0,
    "flags": {
      "hasQuickTable": false,
      "hasFrequency": true,
      "quickDerivedDefault": true
    }
  },
  "stats": {
    "entryCount": 7000,
    "duplicateOverrides": 0,
    "rejectedRows": 0
  },
  "unicode": {
    "minCodepoint": "U+3007",
    "maxCodepoint": "U+323AF",
    "includesNonBmpHan": true
  },
  "sources": [
    {
      "id": "unihan",
      "name": "Unihan",
      "license": "Unicode License v3",
      "version": "16.0.0",
      "sha256": "<hex>"
    },
    {
      "id": "cangjie5",
      "name": "Jackchows/Cangjie5",
      "license": "MIT",
      "version": "v4.1-beta",
      "sha256": "<hex>"
    }
  ],
  "build": {
    "toolVersion": "dict-build/0.1.0",
    "generatedAt": "2026-02-27T00:00:00Z",
    "gitCommit": "317839d"
  },
  "compat": {
    "minRuntimeSchema": 2,
    "fallbackFormat": "v1-json-csv"
  }
}
```

### 4.2 Validation Requirements
- `artifact.file` must match emitted binary filename.
- `artifact.sha256` must match binary content.
- `stats.entryCount` must equal header `entryCount`.
- `sources` must be non-empty for production artifacts.
- `compat.minRuntimeSchema` must be checked by runtime loader before activation.

## 5. Migration Rules (v1 -> v2)

`v1` source behavior in current repository:
- Runtime fetch in `src/features/dictionary/useDictionary.ts`
- CSV/JSON parsing + validation in `src/lib/dictionary.ts`
- In-memory `Map` lookup in `src/features/lookup/DictionaryLookup.tsx`

### 5.1 Normative Rules

M1. Preserve v1 semantic defaults:
- Duplicate character conflict remains "last row overrides previous".
- Missing quick continues to derive from cangjie.

M2. Unicode acceptance upgrade:
- Replace BMP-limited CJK regex assumptions with Han-script-aware validation.
- Accept non-BMP Han codepoints.
- Treat U+3007 as accepted Han character.

M3. Single-character definition:
- "single char" means one Unicode codepoint, not one UTF-16 code unit.

M4. Canonical ordering before emit:
- Build output must be sorted by codepoint ascending.
- Output must contain unique codepoints.

M5. Quick storage optimization:
- If quick equals derivation result, quick may be omitted from binary table.
- If any entry requires non-derived quick, enable quick table and store all quick values for deterministic decode.

M6. Integrity and provenance:
- Every v2 binary must ship with matching `meta.json` and `licenses.json`.
- Build must fail when required source license metadata is missing.

M7. Runtime fallback chain:
- Try v2 binary loader first.
- On validation/decode failure, fallback to v1 JSON/CSV parser path.
- On all failures, fallback to built-in dictionary index.

M8. Cache safety:
- Filename must include content hash.
- Never overwrite stable filenames without hash.

M9. Deprecation policy:
- Keep v1 parser path for at least 2 release cycles after v2 production rollout.
- Remove v1 runtime path only after telemetry shows v2 loader stability.

## 6. Implementation Guardrails

### 6.1 Runtime API Stability
- Introduce lookup abstraction (`lookup(char)`) so UI does not depend on concrete storage (`Map` vs binary index).
- Status (PR1): Implemented in `src/App.tsx`, `src/features/dictionary/useDictionary.ts`, `src/features/lookup/DictionaryLookup.tsx`, and `src/lib/dictionary.ts`.

### 6.2 CI and Tests
- Add deterministic codec unit tests for header, offsets, CRC, and decode correctness.
- Add Unicode edge tests (including non-BMP Han).
- Keep existing quality gates green (`check`, `test:e2e`, `build`).

### 6.3 Rollout Strategy
- Start with `core` variant in production.
- Add `full` variant behind runtime config switch.
- Observe load time and lookup latency before defaulting to `full`.

## 7. Open Questions

1) Should quick table be sparse (bitmap + values) instead of all-or-nothing table?
2) Should frequency rank be required for `core` only or both `core/full`?
3) Mobile artifact parity: keep binary reader on mobile, or generate SQLite as first-class output?

## 8. Version History

- v0.2 (2026-02-27): PR1 landed with runtime lookup abstraction in app/hook/UI integration.
- v0.1 (2026-02-27): Initial draft created from architecture planning.
