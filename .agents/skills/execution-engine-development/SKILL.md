---
name: execution-engine-development
description: Implement, fix or refactor TypeScript code in the execution-engine repository only, with matching API tests and documentation.
---

# Development

Read [code and public APIs](../../../CONTRIBUTING.md#code-and-public-apis) and
[validation](../../../CONTRIBUTING.md#validation).

1. Inspect the affected implementation, callers, tests and existing Git changes.
2. Trace the plain-function API and decorator when both expose the behavior.
3. Make the smallest complete change; test the requested behavior and relevant regressions.
4. Update affected API documentation and examples, then run the checks that cover the change.
5. Review the diff and report the result, checks and limits.
