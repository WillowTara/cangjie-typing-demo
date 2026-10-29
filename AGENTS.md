# AGENTS

## Docs Source Of Truth

- GitHub markdown in this repository is the source of truth.
- Notion is a mirror. Project root: [倉頡打字練習 — 專案文檔](https://app.notion.com/p/40790ae2adae80308584c55eed8dab60).
- Obsidian is a mirror of those same docs, via the existing sync scripts when they are present in the workspace. The prior vault import path is `C:\NoteforObsidian\Willow\10-Project-Docs`.
- Do not author canonical docs in Notion or Obsidian first. Edit GitHub, then mirror.
- Any change that affects product behavior, operator workflow, or a documented contract must update the relevant `README.md`, `DEPLOY.md`, `HANDOFF.md` (when that file exists), and/or `docs/` page in the same PR.
- Notion workflow: `docs/notion-github-sync.md`. Page map: `docs/notion-doc-map.json`.

## Notion Sync Policy

Keep sync token-efficient. Mirror deltas only.

- Resolve the target from `docs/notion-doc-map.json` (`source_path` → `notion_url`).
- Patch the changed sections on that page. Never full-copy a markdown file onto a Notion page.
- Skip every mapped page whose source file did not change.
- Hubs (`kind: hub`, including Project Hub) get a one-line status bump only. Do not paste specs, checklists, or README sections into a hub.
- If `notion_url` is null, leave the file unmapped. Do not create a Notion page in order to sync it.
- Do not put credentials, tokens, or dictionary dumps in Notion.

## Obsidian Sync

`npm run docs:sync:obsidian`, `npm run docs:verify:utf8`, and `npm run docs:init:true-open-items` are not in this repo's `package.json` today. Run them only when they are actually present. Do not add them as part of an unrelated change.

When those scripts are present, and a turn changes `README.md`, `HANDOFF.md`, `DEPLOY.md`, or any file under `docs/`:

- Run `npm run docs:sync:obsidian`.
- Run `npm run docs:verify:utf8`.
- Before the final reply, when the Obsidian CLI is available, also verify `obsidian vault="Willow" unresolved total` and `obsidian dev:errors`.
- The vault note must come from `npm run docs:sync:obsidian`. Do not hand-maintain a divergent copy.

When the global skill `workspace-obsidian-docs` is available, use it. Repo-specific commands live in `docs/codex-obsidian-docs-workflow.md` when that file exists.

## UTF-8 Policy

- Treat all markdown docs as UTF-8.
- When reading docs from the shell, request UTF-8 explicitly.
- When a script writes docs, write UTF-8 explicitly.
- Prefer a patch-style edit for Chinese markdown.
- Avoid shell redirection or default-encoding writes for Chinese docs.
- If UTF-8 safety is in doubt and `npm run docs:verify:utf8` exists, run it.

## Checklist Policy

- New project backlog and checklist docs must use the `true-open-items` format.
- When the scaffold exists, create them with `npm run docs:init:true-open-items -- --slug <slug> --title "<title>"`.
- The mirrored Obsidian note must come from `npm run docs:sync:obsidian` when that script exists. Do not keep a second, hand-edited copy.
- Dashboard and task views should read `true-open-items` backlog docs, not every historical unchecked checkbox.
- Checklists already in this repo predate that scaffold. Leave them in place unless the task is to convert that doc. Do not mass-rewrite them only to change the format.

## Release Freeze Notes

When a turn updates the current release status, the `README.md` changelog, or a `docs/release-*.md` freeze note, record the current freeze baseline commit explicitly.

## Credential Hygiene

- If local GitHub sync needs a persistent credential, store it only in the machine-local git credential helper, not in repo docs or tracked files.
- Repo docs may name the credential mechanism or file path for handoff. They must never include the token value.
