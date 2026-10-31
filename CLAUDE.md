# CLAUDE.md

Guidance for AI assistants working in this repository.

## Repository Purpose

`agent_prompt` is a curated collection of **agent system prompts** — reusable
instructions that configure LLMs (Claude, ChatGPT, etc.) to behave as
specialized assistants. Each Markdown file at the repo root defines one
self-contained agent: its role, capabilities, output rules, and workflow.

This is a **prompt-engineering repo**, not a software project. There is no
build step, no test suite, no runtime dependencies. Changes are content
edits to Markdown.

## Layout

```
.
├── README.md              # Repo title only
├── threads_content.md     # 深度敘事型社群撰文 Agent (Threads-style narrative writer, zh-TW)
└── .gitignore             # Multi-language defaults (Node, Python, IDE)
```

One file = one agent. Filename pattern: `<topic>_<agent-type>.md`
(e.g. `threads_content.md` → content agent for Threads).

## Prompt File Conventions

Existing prompts follow a consistent structure. New agent prompts should
match this template unless the user asks otherwise:

1. **Title** — `# <Agent Name>` (one H1)
2. **Agent 身份定位 / Identity** — who the agent is, tone, expertise
3. **核心能力 / Core Capabilities** — bulleted list
4. **寫作規範 / Output Rules** — language, length, formatting constraints
5. **結構 / Structure** — section-by-section output template with word counts
6. **品質檢核清單 / Quality Checklist** — checkboxes the agent self-verifies
7. **工作流程 / Workflow** — numbered steps the agent runs on each request
8. **注意事項 / Notes** — do's and don'ts
9. **成功標準 / Success Criteria** — what a good output looks like

Use `---` between major sections, `###` for sub-sections inside the
five-part structure.

## Language & Style Rules (Content Files)

The current prompts are written in **Traditional Chinese (Taiwan usage)**.
When editing or adding zh-TW content:

- Use full-width punctuation: `，` `：` `？` (not `,` `:` `?`)
- Avoid em-dashes `——`
- Avoid AI-flavored stage directions (e.g. 「他笑著搖搖頭」「我愣住了」)
- Keep Taiwan colloquialisms (「超」「根本」「整個」「直接」)
- Paragraphs ≤ 450 字; short, broken-up sentences

For English content or meta-files (this file, README), use standard ASCII
punctuation.

## Development Workflow

### Branch policy

- **Default branch**: `main`
- **Work branches**: per-task feature branches. The current session is on
  `claude/add-claude-documentation-PsPCN`.
- Never push directly to `main`; open a PR from the feature branch when
  explicitly requested.

### Editing prompts

- Edit the Markdown file in place — prefer `Edit` over `Write` for changes
  to existing files.
- Preserve the section hierarchy and the checklist items; downstream users
  rely on the structure being stable.
- When adding examples, keep them under `## 範例應用 / Examples` near the
  end of the file, not inline in the rules.

### Adding a new agent

1. Create `<topic>_<type>.md` at the repo root.
2. Follow the nine-section template above.
3. State the target language in the rules section if it isn't zh-TW.
4. Add an entry to the README's file list (one line, agent purpose).

### Commits

- One agent change per commit when possible.
- Commit message style observed in history:
  - `init <agent-name> agent` for new agents
  - `Add <thing>` / `Update <thing>` for ancillary changes
- Keep messages in English even though prompt content is zh-TW.

## What NOT to Do

- Don't introduce code, package files, CI configs, or build tooling — this
  is a content repo.
- Don't translate existing zh-TW prompts to English unless asked; the
  Taiwan voice is the product.
- Don't add `node_modules/`, `venv/`, or other artifacts (covered by
  `.gitignore` but worth noting).
- Don't reformat existing prompts to use different punctuation or section
  order — the conventions above are intentional.

## Quick Reference

| Task | Approach |
|------|----------|
| Add a new agent prompt | New `.md` at root, follow 9-section template |
| Edit an existing agent | `Edit` tool, preserve structure |
| Translate a prompt | Only if explicitly requested |
| Run / test the prompt | No runtime — paste into an LLM to verify |
| Open a PR | Only when the user asks |
