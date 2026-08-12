# Getting Started

## Requirements

- **Node.js 24+** — the engine uses `AsyncLocalStorage` and supports `Error.cause`.
- **`experimentalDecorators`**, if you use any decorator. The plain functions work without it.

## Installation

```bash
npm install execution-engine
```

If you use decorators, enable legacy decorator support in `tsconfig.json`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

::: warning Legacy decorators, not TC39
This library uses the **legacy** decorator proposal, not the TC39 Stage 3 decorators TypeScript 5 enables by default.
Without this flag, every decorator errors.
:::

## Trace one function

For a single method, `@trace` reports every call without requiring an engine:

```ts
import { trace } from 'execution-engine';

class MathOperations {
  @trace((ctx) => console.log(ctx.metadata.name, ctx.inputs, ctx.outputs, ctx.elapsedTime))
  add(a: number, b: number) {
    return a + b;
  }
}

new MathOperations().add(2, 3);
// add [ 2, 3 ] 5 0.041 ms
```

The method still returns `5`. For a plain function, use
[`executionTrace`](../execution/trace.md#executiontrace) instead. [Trace](../execution/trace.md) documents both APIs.

## Trace a workflow

To capture how several calls relate, route them through an engine. Each call becomes a node; the engine connects the
nodes into a graph:

```ts
import { ExecutionEngine } from 'execution-engine';

const engine = new ExecutionEngine();

// Synchronous functions return the trace directly:
const res1 = engine.run(function step1(param) {
  return `result1 for ${param}`;
}, ['param1']);

// Asynchronous functions return a promise of the trace:
const res2 = await engine.run(async function step2(param) {
  return `result2 for ${param}`;
}, [res1.outputs]);

console.log(res2.outputs); // "result2 for result1 for param1"
console.log(JSON.stringify(engine.getTrace(), null, 2));
```

`run` returns an [`ExecutionTrace`](../reference/types.md#executiontrace): the function result plus the data recorded
about the call. The function's return value is on `.outputs`.

::: tip Name your functions
Node labels come from `Function.prototype.name`. An inline arrow function has no name, so it shows up in the trace as
`"function"`. Use a named function — or pass an explicit label, as shown below — to get a readable graph.
:::

To control the label yourself:

```ts
const res = engine.run(fetchUser, [userId], {
  trace: { id: 'fetch-user', label: 'Fetch user' }
});
```

### A class-based workflow

For class-based code, `@engine` and `@run` remove the wrapper calls. Methods return their own values while the engine
records the calls.

```ts
import { engine, run, EngineTask } from 'execution-engine';

@engine({ id: 'uniqueEngineId' })
class MyClass extends EngineTask {
  @run()
  myMethod1(param: string) {
    return `result1 for ${param}`;
  }

  @run()
  async myMethod2(param: string) {
    return `result2 for ${param}`;
  }
}

const myInstance = new MyClass();

const a = myInstance.myMethod1('param1');  // "result1 for param1"
const b = await myInstance.myMethod2(a);   // "result2 for result1 for param1"

console.log(myInstance.engine.getTrace());
```

Unlike `engine.run`, `@run` returns the method's value directly, **not** an `ExecutionTrace`. Read the graph afterwards
from `this.engine`.

## Visualizing the result

`getTrace()` returns a [Cytoscape](https://js.cytoscape.org/)-compatible array of nodes and edges. Write it to a file
and drop that file into the [json-to-graph viewer](https://tabkram.github.io/json-to-graph/) to explore the run as an
interactive diagram:

```ts
import { writeFileSync } from 'node:fs';

writeFileSync('trace.json', JSON.stringify(engine.getTrace(), null, 2));
```

<a class="ee-banner" href="/execution-engine/examples">
  <span class="ee-banner-body">
    <strong>See it drawn</strong>
    <span>Real runs on the Examples page, each with the code that produced it — and larger traces you can open in the viewer.</span>
  </span>
  <span class="ee-banner-cta">Examples&nbsp;→</span>
</a>

## Where to go next

- [Examples](../examples.md) — runs you can read side by side with their graphs.
- [Trace](../engine/trace.md) — what nodes and edges mean, and how nesting and parallelism are inferred.
- [Which API to use](./which-api-to-use.md) — whether you actually need the full engine, or just `@trace`.
