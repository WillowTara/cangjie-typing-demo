
Dictionary import MVP

- Supported CSV (comma or tab): columns `char,cangjie,quick` (header optional)
- Supported JSON:
  - Array of entries: `[ { "char": "日", "cangjie": "A", "quick": "A" } ]`
  - Object map: `{ "日": { "cangjie": "A", "quick": "A" } }`
- Parsing + indexing implemented in `src/lib/dictionary.ts` (no deps)
- App loads dictionary via URL fetch or local file upload (Lookup tab)

Stage-1 contract additions

- Schema version introduced: `v1` (`DICTIONARY_SCHEMA_VERSION`)
- Validation report model: `DictionaryImportReport` + issue code enum
- Cleaning rules now enforced:
  - `char` must be single CJK char (basic + extension ranges)
  - `cangjie` required, normalized upper-case A-Z, length 1-5
  - `quick` normalized upper-case A-Z, length 1-5
  - missing/invalid `quick` auto-derived from `cangjie` (1-2 keep as-is, >2 use first+last)
  - duplicate `char` rows use latest row and emit warning code
- Parser now exposes report path: `parseDictionaryTextWithReport(...)`
- Lookup tab surfaces compact import report summary + first six issues
