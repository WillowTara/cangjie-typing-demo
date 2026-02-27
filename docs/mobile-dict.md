# Mobile Dictionary Artifact Guide

This document defines the mobile-facing output for Dictionary v2.

## Output

- SQLite file path: `public/dict/dict.sqlite`
- Table: `dictionary`
- Schema:
  - `char TEXT PRIMARY KEY`
  - `cangjie TEXT NOT NULL`
  - `quick TEXT NOT NULL`

## Export Command

```bash
npm run dict:export:sqlite -- --input public/dict/sample-dictionary.json --output public/dict/dict.sqlite
```

## Expected Query

```sql
SELECT cangjie, quick FROM dictionary WHERE char = ?;
```

## Notes

- Data semantics follow v1/v2 migration rules: duplicate chars are last-write-wins and quick defaults to derived code when absent.
- This artifact is generated from the same source dataset used for web binary builds to keep web/mobile parity.
