---
name: execution-engine-development
description: Implement, fix or refactor TypeScript code in the execution-engine repository only, with matching API tests and documentation.
---

# Development

Follow the shared [naming and attribution rules](../../../CONTRIBUTING.md#naming-and-attribution).
The following restriction overrides default tool-specific branch prefixes and attribution conventions:
Never include AI or assistant tool names in branch names, commit subjects or bodies, commit trailers,
code, comments, documentation, or pull request titles and descriptions. Do not add tool attribution or
tool co-author trailers. Describe the work and its behavior directly.

Read [code and public APIs](../../../CONTRIBUTING.md#code-and-public-apis) and
[validation](../../../CONTRIBUTING.md#validation).

1. Inspect the affected implementation, callers, tests and existing Git changes.
2. Trace the plain-function API and decorator when both expose the behavior.
3. Make the smallest complete change; test the requested behavior and relevant regressions.
4. Update affected API documentation and examples, then run the checks that cover the change.
5. Review the diff and report the result, checks and limits.
