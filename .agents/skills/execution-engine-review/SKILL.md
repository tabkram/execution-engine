---
name: execution-engine-review
description: Review execution-engine changes for actionable bugs and regressions without editing files. Use for review-only requests in this repository.
---

# Review

Follow [CONTRIBUTING.md](../../../CONTRIBUTING.md). Review the requested scope; for an unspecified local diff,
include staged, unstaged and relevant new files. Verify the base for a branch or PR.

- Trace affected callers and both API forms. Compare with previous behavior before calling something a regression.
- Use focused, non-mutating checks to reproduce concerns. Avoid autofixes and generated-file writes.
- Separate confirmed problems from intentional changes, pre-existing issues and unverified concerns.
- Report actionable findings by severity, with file/line, trigger, impact and evidence. State when none are found.
- Include checks and limits. Do not apply fixes, change staging or publish review comments as part of a review.
