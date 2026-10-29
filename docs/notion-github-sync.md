# Notion ↔ GitHub sync

GitHub markdown is the source of truth. Notion and, when the scripts exist, Obsidian are mirrors. Rules for agents live in `AGENTS.md`. This page is the workflow. The page map is `docs/notion-doc-map.json`.

Notion root: [倉頡打字練習 — 專案文檔](https://app.notion.com/p/40790ae2adae80308584c55eed8dab60).

## When to sync

Sync after the GitHub text is the one you want to keep, usually in the same change that edited the markdown. Do not draft the canonical text in Notion and copy it back.

Update Notion only for files that changed and that have a `notion_url` in the map. Leave `notion_url: null` entries unmapped until someone adds a page URL to the map.

Product or operator-facing changes still need the matching `README.md`, `DEPLOY.md`, or `docs/` update in the same PR. The Notion mirror does not replace that.

## Delta-only

1. Read `docs/notion-doc-map.json` and select entries whose `source_path` changed.
2. Open the mapped Notion page.
3. Patch the sections that changed. Match headings where the page already follows the markdown.
4. Do not replace the page with a full copy of the file. Do not resend unchanged sections.
5. If the source file did not change, do not open its Notion page.

Hubs are not file mirrors. Project Hub (`kind: hub`) gets one status line only, for example the version, the freeze commit, or `docs updated`. Do not paste a spec, checklist, or README into the hub.

## What stays on GitHub

- Files with `notion_url: null`, including `LICENSE` until a Notion page exists.
- `docs/notion-doc-map.json`. It is the map, not a prose page to mirror.
- `docs/notion-github-sync.md` and `docs/release-v1.2.0.md` until a URL is added to the map.
- `HANDOFF.md` has a Notion URL, and the file is not in the repo. Do not create the file only so it can be synced.

## Obsidian

When `npm run docs:sync:obsidian` and `npm run docs:verify:utf8` exist, run both after edits to `README.md`, `HANDOFF.md`, `DEPLOY.md`, or `docs/`. Those scripts are not in this repo's `package.json` today. The vault copy must come from the sync script. UTF-8 rules are in `AGENTS.md`.

## Credential hygiene

Never put a GitHub token, Notion token, or other secret in the map, in Notion page content, or in any tracked doc.
