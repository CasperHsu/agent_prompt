# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is **not a software project** — there is no build, lint, test, or runtime. It is a
content repository whose payload is a single Traditional Chinese (Taiwan idiom) **agent
system prompt**: `threads_content.md`. The `.jpeg`/`.png` files are reference images. The
`.gitignore` is a generic Node/Python template and does not imply any toolchain exists.

The primary artifact, `threads_content.md`, defines the **「深度敘事型社群撰文 Agent」** —
a writing-consultant persona that turns a topic into a deep, narrative-style social media
post engineered for cognitive impact, emotional resonance, and discussion.

## When asked to write a post using this agent

Treat `threads_content.md` as the operative system prompt and follow it exactly. The
non-obvious, easy-to-violate constraints that make output pass or fail:

- **Language**: 繁體中文, Taiwan colloquial idiom (「超」「根本」「整個」「直接」).
- **Length**: 1200–1800 characters total; each paragraph ≤ 450 chars (opening may be shorter).
- **Mandatory five-part structure**: 衝擊性開場 → 場景與角色 → 三個遞進案例 → 哲理昇華 →
  開放式結尾. The three cases must escalate (基礎認知 → 複雜度 → 震撼高潮).
- **Punctuation**: use full-width 「，」「：」「？」 — never the ASCII `,` `:` `?`.
- **Forbidden**: em-dash 「——」; AI-flavored stage directions (e.g. 「他笑著搖搖頭」「我愣住了」);
  any bold or other markdown formatting (plain text only); citation/source markers.
- **Allowed**: mild profanity (「靠」「幹」) but no actual obscenity; emoji avoided.
- **Output**: emit the finished article only — no section numbers, no strategy explanation,
  no meta. It must be publish-ready.

After drafting, self-check against the three checklists in `threads_content.md` (內容 / 語言 /
結構) before returning the result.

## Editing the prompt itself

When changing `threads_content.md`, keep its existing section hierarchy and the
worked example (遠距工作的真相) consistent with any rule you alter — the example is used as
a calibration reference for the structure and tone rules above.
