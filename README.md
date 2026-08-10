<div align="center">

<img src="docs/public/logo.svg" alt="Execution Engine logo" width="84" height="84" />

<h1>Execution Engine</h1>

<p><strong>Trace and optimize your function calls. See your whole code run as a graph.</strong></p>

<p>
  <a href="https://www.npmjs.com/package/execution-engine"><img alt="execution-engine on npm" src="https://img.shields.io/npm/v/execution-engine.svg?logo=npm&amp;label=NPM+package&amp;color=limegreen" /></a>
  <a href="https://www.npmjs.com/package/execution-engine"><img alt="npm downloads" src="https://img.shields.io/npm/dm/execution-engine?color=limegreen" /></a>
  <a href="https://packagephobia.com/result?p=execution-engine"><img alt="install size" src="https://packagephobia.com/badge?p=execution-engine" /></a>
  <a href="https://bundlephobia.com/result?p=execution-engine"><img alt="Bundle size" src="https://img.shields.io/bundlephobia/min/execution-engine" /></a>
  <a href="https://coveralls.io/github/tabkram/execution-engine?branch=main"><img alt="Coverage Status" src="https://coveralls.io/repos/github/tabkram/execution-engine/badge.svg?branch=main" /></a>
  <a href="https://www.npmjs.com/package/execution-engine"><img alt="Dependencies" src="https://img.shields.io/librariesio/release/npm/execution-engine.svg" /></a>
</p>

<p>
  <a href="https://github.com/tabkram/execution-engine"><img alt="Github repo" src="https://img.shields.io/badge/github-grey?logo=github" /></a>
  <a href="https://github.com/tabkram/execution-engine/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/tabkram/execution-engine?style=social" /></a>
  <a href="LICENSE"><img alt="GitHub license" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <a href="https://tabkram.github.io/execution-engine"><img alt="Documentation" src="https://img.shields.io/badge/documentation-grey?logo=githubpages&amp;color=blue" /></a>
  <a href="https://www.jsdocs.io/package/execution-engine"><img alt="jsDocs.io" src="https://img.shields.io/badge/jsDocs.io-reference-blue" /></a>
</p>

<p><a href="https://tabkram.github.io/execution-engine"><strong>Read the documentation →</strong></a></p>

</div>

---

Execution Engine records what your code did at runtime — inputs, outputs, errors and timing — without asking you to
rewrite the functions themselves. It runs in your own process, adds no dependencies, and returns plain JSON you can
visualize, assert on in tests, or store and resume later.

## Features ✨

Two independent parts. Use either one without adopting the other.

### 1. Execution — one function at a time

No engine and no graph: wrap a single call to see what it did, or to stop it from happening twice.

- **[Trace](https://tabkram.github.io/execution-engine/execution/trace):** Capture inputs, outputs, errors and timing
  of a single call.
- **[Cache](https://tabkram.github.io/execution-engine/execution/cache):** Reuse a result for a configurable TTL.
- **[Memoize](https://tabkram.github.io/execution-engine/execution/memoize):** Collapse duplicate concurrent calls
  into one.
- **[Timer](https://tabkram.github.io/execution-engine/execution/timer):** Measure a code block, in ms and in words.

### 2. Engine — the whole run as a graph

Route related calls through an engine, and the graph assembles itself while they run.

- **[Nodes and edges](https://tabkram.github.io/execution-engine/engine/trace):** Each call becomes a node, and the
  edges are inferred from order, nesting and parallelism — you never draw them yourself.
- **Timing:** Every node carries its own start, end, duration and elapsed time.
- **Portable JSON:** A [Cytoscape](https://js.cytoscape.org/)-compatible shape you can assert on in tests, store and
  resume, or open in the
  <a href="https://tabkram.github.io/json-to-graph/"><img src="docs/public/json-to-graph.svg" alt="" width="16" height="16" align="absmiddle" /> <strong>json-to-graph viewer</strong></a>.

Every feature ships twice — a decorator for classes, a plain function for everything else.
See [Which API to use](https://tabkram.github.io/execution-engine/guide/which-api-to-use).

## Installation 📦

Use [npm](https://www.npmjs.com/package/execution-engine) package manager:

```bash
npm install execution-engine
```

Or use the [yarn](https://yarnpkg.com/package?name=execution-engine) package manager:

```bash
yarn add execution-engine
```

Requires Node.js 18+. Decorators need `"experimentalDecorators": true` in your `tsconfig.json`; the plain functions
work without it — see [Getting Started](https://tabkram.github.io/execution-engine/guide/getting-started).

## Usage 📚

### 1. Execution: trace one function

```typescript
import { trace } from "execution-engine";

class MathOperations {
  @trace(console.log) // logs inputs, outputs and duration on every call
  add(a: number, b: number): number {
    return a + b;
  }
}

new MathOperations().add(2, 3); // still returns 5
```

### 2. Engine: get the whole run as a graph

```typescript
import { ExecutionEngine } from "execution-engine";

const engine = new ExecutionEngine();

const res1 = engine.run((param) => `result1 for ${param}`, ['param1']);
await engine.run(async (param) => `result2 for ${param}`, [res1.outputs]);

const trace = engine.getTrace(); // a flat array of nodes and edges
```

Each call becomes a node holding what it received, what it returned and how long it took. You never create the edges:
the engine works them out from how the calls actually ran.

```json
[
  {
    "data": {
      "id": "fetchUser_…",
      "label": "fetchUser",
      "inputs": ["u_42"],
      "outputs": { "id": "u_42", "plan": "pro" },
      "duration": 58.37,
      "elapsedTime": "58.370 ms"
    },
    "group": "nodes"
  },
  {
    "data": { "id": "fetchUser_…->chargeCard_…", "source": "fetchUser_…", "target": "chargeCard_…" },
    "group": "edges"
  }
]
```

Caching, memoization, decorators, engine context and the full trace format are covered in the
__[documentation](https://tabkram.github.io/execution-engine)__.

## Examples 📘

Runnable examples live in the __[/examples](examples)__ directory, each with the trace it produced — and the main ones
are shown beside their graphs on the __[Examples page](https://tabkram.github.io/execution-engine/examples)__.

- [execution-trace.ts](examples/execution-trace.ts) — one call, recorded as a plain record. No engine, no graph.
- [engine-sequential.ts](examples/engine-sequential.ts) — the smallest graph there is: four calls, four nodes, three
  inferred edges.
- [engine-checkout.ts](examples/engine-checkout.ts) — one checkout that exercises everything at once: a chain,
  nesting, recursion, a cache hit, a memoized call, and a fork and join.
  <a href="https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/engine-checkout.json"><img src="docs/public/json-to-graph.svg" alt="" width="16" height="16" align="absmiddle" /> <strong>See its graph →</strong></a>

## Documentation 📔

Explore the comprehensive __[documentation](https://tabkram.github.io/execution-engine)__ for this project:

- [Getting Started](https://tabkram.github.io/execution-engine/guide/getting-started) — install, requirements, first trace.
- [Which API to use](https://tabkram.github.io/execution-engine/guide/which-api-to-use) — decorators or functions, and which engine.
- [Engine trace format](https://tabkram.github.io/execution-engine/engine/trace) — nodes, edges, nesting and parallelism.
- [Migration](https://tabkram.github.io/execution-engine/reference/migration) — upgrading to v4.

## Changelog 📝

For a detailed list of changes, enhancements, and bug fixes, please refer to our [Changelog](CHANGELOG.md).

## Contributing 🤝

If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request.
Contributions are welcome!

Before getting started, please read our [Contribution Guidelines](CONTRIBUTING.md).

## Community 👥

Love `execution-engine`? Give our repo a star ⭐ ⬆️.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
