# TraceableEngine

`TraceableEngine` is the graph-building layer. Each call to `run()` executes one function, returns that call's
[`ExecutionTrace`](../reference/types.md#executiontrace), and adds a node to the engine's accumulated
[`EngineTrace`](../reference/types.md#enginetrace). The engine infers edges as nodes complete, while preserving nested
parent relationships.

Use [`ExecutionEngine`](./execution-engine.md) when the graph also needs shared context and execution identity. For one
independent call with no graph, use the standalone [`trace`](../execution/trace.md) API.

## Usage

### Running functions

```ts
import { TraceableEngine } from 'execution-engine';

const engine = new TraceableEngine();

// Synchronous — returns the per-call record directly
const sync = engine.run(function double(n: number) {
  return n * 2;
}, [21]);

// Asynchronous — returns a promise of the per-call record
const async = await engine.run(async function fetchUser(id: string) {
  return db.users.find(id);
}, ['u_42']);

console.log(sync.outputs);  // 42
console.log(async.outputs); // { id: 'u_42', … }
```

`run` returns an [`ExecutionTrace`](../reference/types.md#executiontrace) — your return value lives on `.outputs`, alongside
`inputs`, `startTime`, `endTime`, `duration`, `elapsedTime` and `errors`.

::: warning Prefer `function` over arrow functions
Overload resolution picks the async signature first, and an arrow function can match it even when it returns
synchronously. Declaring `function` (and `async function`) gives correct types, and gives nodes a usable `label`.
:::

### Reading the graph

```ts
const trace = engine.getTrace();       // nodes + edges
const nodes = engine.getTraceNodes();  // nodes only
```

The graph grows for the lifetime of the instance. Top-level calls form a sequence, calls made inside another traced
function become its children, and `config.parallel` marks a fan-out. See [Trace](./trace.md) for the node and edge
rules, parallel groups, narratives, error handling, and data extraction.

## API

### `constructor(initialTrace?)` {#constructor}

Creates an engine, optionally seeded with an existing [`EngineTrace`](../reference/types.md#enginetrace) so a run can continue
from a previously serialized graph.

### `initTrace(initialTrace)` {#inittrace}

Replaces the current trace with `initialTrace`, resetting nodes, edges and pending narratives. Returns `this`.

### `run(blockFunction, inputs?, options?)` {#run}

Executes a function, records it as a node, and connects it to the graph.

| Parameter | Type | Description |
| --- | --- | --- |
| `blockFunction` | `(...params) => O \| Promise<O>` | The function to execute. |
| `inputs` | `Array<unknown>` | Arguments to pass. Defaults to `[]`. |
| `options` | `TraceOptions<Array<any>, O>` | Trace identity and configuration — see below. |

`options` accepts either the full shape or just the `trace` part as a shorthand:

```ts
engine.run(fn, [x], { trace: { id: 'step-1', label: 'Step 1' }, config: { parallel: true } });
engine.run(fn, [x], { id: 'step-1', label: 'Step 1' }); // shorthand for `trace`
```

**`options.trace`** — a partial [`EngineNodeData`](../reference/types.md#enginenodedata):

| Field | Description |
| --- | --- |
| `id` | Node id. Auto-generated as `name_timestamp_uuid` if omitted. |
| `label` | Display label. Defaults to the function's name. |
| `parent` | Enclosing node id. Inferred automatically for nested calls. |

**`options.config`** — a [`TraceOptions['config']`](../reference/types.md#traceoptions):

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `traceExecution` | `boolean \| Array<keyof ExecutionTrace> \| ExecutionTraceExtractor` | `true` | What to record. See [Controlling what gets recorded](./trace.md#controlling-what-gets-recorded). |
| `parallel` | `boolean \| string` | `false` | Fan out from the sibling's source instead of chaining. A string names the group. |
| `errors` | `'catch' \| 'throw'` | `'throw'` | Whether a thrown error is recorded and swallowed, or recorded and re-thrown. |

**Returns** the per-call `ExecutionTrace` for a synchronous function, or a `Promise<ExecutionTrace>` for an
asynchronous one. Read the accumulated graph separately with `getTrace()`.

**Throws** if any element of `inputs` is a `TraceableEngine` instance — that would make the trace contain itself.

### `getTrace()`

Returns the full [`EngineTrace`](../reference/types.md#enginetrace): all nodes followed by all edges.

### `getTraceNodes()`

Returns only the nodes, in creation order.

### `pushNarratives(nodeId, narratives)` {#pushnarratives}

Appends one narrative or an array of them to a node. With the default recording settings, notes for a node that does
not exist yet are held until it is created. If you use the per-field extractor, set `narratives: true`. Returns `this`.

### `getNarratives()`

Returns every narrative across the trace, in node order, with empty entries removed.

## Remarks

- **Your function receives an extra trailing argument.** `run` always appends the current node's
  [`EngineNodeData`](../reference/types.md#enginenodedata) after your `inputs`. Declare it as an optional last parameter
  (`node?: EngineNodeData`) when you need it, and ignore it otherwise. Watch out for functions with optional
  parameters or ones that inspect `arguments.length`.
- **Nesting relies on `AsyncLocalStorage`.** It survives `await`, but not code that escapes the async context — a
  callback stored and invoked later will not be attributed to its original parent. Pass `trace.parent` explicitly
  there.
- **Referencing a parent that does not exist** creates a placeholder node marked `abstract: true`. Placeholders are
  excluded from edge inference.
- **`this` is bound.** `blockFunction` is invoked bound to the engine instance, so a function relying on its own
  `this` should be bound by you before being passed in.

## See also

- [ExecutionEngine](./execution-engine.md) — adds typed context and execution identity to this class.
- [Trace](./trace.md) — how nodes, edges, nesting and parallelism fit together.
- [Types](../reference/types.md) — the full type reference.
