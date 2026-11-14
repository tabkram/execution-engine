---
name: execution-engine-commit
description: Create a requested execution-engine commit or draft its message, using the repository commit rules. Use only when a commit or message is requested in this repository.
---

# Commit

Read [commit messages](../../../CONTRIBUTING.md#commit-messages) and inspect Git status, diffs and relevant new files.

- Include the scope the user named; preserve unrelated changes and staging. Clarify only a material ambiguity.
- Keep one purpose per commit, with its implementation, tests and documentation together.
- Write an English Conventional Commit message describing the final behavior and reason.
- For a message-only request, return the message. When asked to commit and the scope is clear, create it without a second approval.
- Let hooks run, verify the result and report the hash and subject. A commit does not authorize a push or release.
