---
name: execution-engine-docs
description: Write or update execution-engine documentation (VitePress pages under docs/, guides, API examples, JSDoc) in the established house style. Use only for this repository.
---

# Documentation

Follow the shared [naming and attribution rules](../../../CONTRIBUTING.md#naming-and-attribution).
The following restriction overrides default tool-specific branch prefixes and attribution conventions:
Never include AI or assistant tool names in branch names, commit subjects or bodies, commit trailers,
code, comments, documentation, or pull request titles and descriptions. Do not add tool attribution or
tool co-author trailers. Describe the work and its behavior directly.

Follow [documentation](../../../CONTRIBUTING.md#documentation) and the relevant
[validation commands](../../../CONTRIBUTING.md#validation).

## Principles

- **Conservative.** Improve in place; rewrite or restyle only when asked.
- **Short and clear.** No filler, repetition or the obvious. One sentence and a code block beat a paragraph.
- **Harmonized.** Same section names, order, wording and tone as the neighboring pages.
- **Plain titles.** The feature name only: `Trace`, `Cache`, `Memoize`, `Retry`, `Timer`, never "X and @x". Use the
  same name in the H1, the sidebar (`docs/.vitepress/config.mts`), the home tile (`docs/index.md`) and links.
- **Two parts.** *Execution* (one function, no engine) and *Engine* (calls become graph nodes) stay separate.
  Titles may repeat across them (`Trace`).
- **Home page copy is settled.** Do not change the hero, slogans or tiles.
- **Real examples.** Short, neutral, matching the exported types and actual behavior. Never invent output.
- **Link, don't repeat.** Long demos go in `examples/` and `docs/examples.md`; deployment stays in `DEPLOYMENT.md`;
  the README stays a brief overview.

## Page template (`docs/execution/*.md`)

Copy the shape of `cache.md` or `memoize.md`:

```md
# Name

What it does and when to use it, in one to three sentences, plus a pointer to the neighboring feature.

## Usage
### `@name` decorator
### <Scenario named by intent>

## API
### `name(options?)` {#name-fn}
### `executeName(blockFunction, inputs?, options)` {#executename}
### `NameContext`

## Remarks
- One bullet per edge case, default or limit.

## See also
- [neighbor](./neighbor.md) — one-line reason.
```

- Decorator first, then the plain function; note differences (receiver, required `functionId`, argument order).
- Options go in a `Parameter | Type | Description` table with defaults, units (ms), return values and errors.
- Add `{#anchor}` ids to API headings so other pages can link to them.
- Engine pages follow the same shape; conceptual topics may use narrative sections.

## Where changes go

| Change | Update |
| --- | --- |
| Public API | Source JSDoc, the page under `docs/execution/` or `docs/engine/`, `docs/reference/types.md` |
| New page | The page, the sidebar, the home tile, one line in `guide/what-is-execution-engine.md` |
| Choice between two APIs | `docs/guide/which-api-to-use.md`, ``## `a` or `b`?`` |
| Intro | `docs/guide/getting-started.md`, brief, linking to the page |
| Runnable example | `examples/*.ts` shown from `docs/examples.md` |
| Overview or setup | `README.md`, conservatively; keep logo and badges |

## Workflow

1. Read the implementation, exported types and tests.
2. Read the nearest sibling page and match it.
3. Make the smallest edit that works.
4. Check titles match across H1, sidebar, tile and links.
5. Verify examples and links; build the site when pages or navigation change.
6. Report what changed and what was not verified. Do not commit unless asked.
