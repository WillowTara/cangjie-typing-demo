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

## Post-release continuation (PR10-PR12)

### Scope

- PR10: add `public/dict/core-dictionary.csv` and core v2 artifacts (`core.2026.03.0.5b9218e9.*`).
- PR11: add `scripts/dict/verify-core-artifacts.mts`, npm script `dict:verify:core`, and CI verification step.
- PR12: refresh release/readme/deploy documentation for PR10-PR11 evidence chain.

### Verification Snapshot (PR10-PR12)

```bash
npm run dict:verify:core
npm run check
npm run test:e2e
npm run build
```

All commands passed on branch `pr/01-dict-v2-lookup-abstraction`.

### Artifacts (core common dictionary)

- `public/dict/core-dictionary.csv`
- `public/dict/core.2026.03.0.5b9218e9.v2.bin`
- `public/dict/core.2026.03.0.5b9218e9.meta.json`
- `public/dict/core.2026.03.0.5b9218e9.licenses.json`

### Traceability commits

- `918d1d8` - PR10 data import (`core-dictionary.csv` + core artifacts)
- `714bd88` - PR11 verifier + CI step
