# Release v1.2.0 (2026-02-27)

## Scope

- PR2: v2 binary codec and codec tests.
- PR3: dictionary v2 build pipeline (`bin/meta/licenses`).
- PR4: runtime `.bin` dictionary loading with fallback chain.
- PR5: Han validation upgrade (non-BMP + U+3007 support).
- PR6: dictionary load/decode/parse timing logs.
- PR7: CI binary smoke test gate.
- PR8: documentation updates.
- PR9: SQLite export script and mobile usage document.

## Verification Snapshot

```bash
npm run check
npm run test:binary-smoke
npm run test:e2e
npm run build
npm run dict:build:v2 -- --input public/dict/sample-dictionary.json --variant core --version 2026.03.0 --out-dir dist/dict-v2
npm run dict:export:sqlite -- --input public/dict/sample-dictionary.json --output dist/dict-v2/dict.sqlite
```

All commands passed at release freeze time.

## Artifacts (local release build)

- `dist/dict-v2/core.2026.03.0.228060e6.v2.bin`
- `dist/dict-v2/core.2026.03.0.228060e6.meta.json`
- `dist/dict-v2/core.2026.03.0.228060e6.licenses.json`
- `dist/dict-v2/dict.sqlite`
