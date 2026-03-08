# PR4-PR5 Visible Pronunciation UI Plan

## Goal

Expose the existing pronunciation payload in lookup mode by adding visible filters and pronunciation rows, while preserving current Cangjie/Quick lookup behavior and IME synchronization.

## Scope

- `src/features/lookup/DictionaryLookup.tsx`
- `src/App.css`
- `src/App.test.tsx`

## Constraints

- Do not change the dictionary binary format, pronunciation artifact contract, loader hook, or build script.
- Keep pronunciation loading non-blocking; loader failure must not break Cangjie/Quick lookup.
- Keep current lookup input and IME composition handling intact.
- Keep scope limited to visible UI and regression coverage.

## Execution Steps

1. Add local filter state in `src/features/lookup/DictionaryLookup.tsx` for `cangjie`, `quick`, `pinyin`, and `zhuyin`.
2. Default all four systems to visible so pronunciation is formally enabled in the UI on first load.
3. Derive row rendering from the existing `lookup(char)` result and show only the active systems for each row.
4. Render Pinyin from `mandarinReadings` using tone-marked display values in a compact multi-reading layout.
5. Render Zhuyin from `mandarinReadings` using tone-marked display values plus formatted keyboard key hints from `zhuyinKeySequence`.
6. Keep the existing pronunciation failure message and omit pronunciation rows when pronunciation data is unavailable.
7. Extend `src/App.css` with additive styles for the filter bar, pronunciation rows, reading chips, and responsive mobile layout.
8. Extend `src/App.test.tsx` with regression tests for visible pronunciation render, filter combinations, pronunciation failure fallback, unknown characters, repeated characters, and IME composition-end synchronization.

## Verification

- `lsp_diagnostics` shows zero errors on modified files.
- Targeted tests pass for updated lookup behavior.
- `npm run check` passes.
- `npm run build` passes.

## Risks To Watch

- Pronunciation rows can visually overload the existing card layout on mobile.
- Toggle state must not hide all context in a confusing way; empty active selection is allowed but should degrade cleanly.
- Multi-reading rendering must remain deterministic and stable for repeated characters.
