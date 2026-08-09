# Trace

This page describes the graph accumulated by [`TraceableEngine`](./traceable-engine.md),
[`ExecutionEngine`](./execution-engine.md), and the [`@engine` / `@run`](./engine-run.md) decorators. Each traced call
adds a node; the engine connects those nodes into an [`EngineTrace`](../reference/types.md#enginetrace), a flat array
of **nodes** and **edges**.

Do not confuse it with the standalone [`trace`](../execution/trace.md) API: that API returns one
[`ExecutionTrace`](../reference/types.md#executiontrace) per call and does not build a graph.

```ts
type EngineTrace = Array<EngineNode | EngineEdge>;
```

Each entry carries a `group` field marking which it is, which is what makes the array directly consumable by graph
libraries like [Cytoscape](https://js.cytoscape.org/).

## Nodes

One node is created per traced call. Its `data` holds both **identity** (who ran) and the
[**execution record**](../reference/types.md#executiontrace) (what happened):

```json
{
  "data": {
    "id": "fetchUser_1754666090118_5a5c54e5-94df-4d32-b46b-aaba187a98b8",
    "label": "fetchUser",
    "inputs": ["u_42"],
    "outputs": { "id": "u_42", "plan": "pro" },
    "startTime": "2025-08-08T15:14:50.118Z",
    "endTime": "2025-08-08T15:14:50.176Z",
    "duration": 58.37029099464417,
    "elapsedTime": "58.370 ms",
    "narratives": [],
    "parallel": false,
    "abstract": false,
    "createTime": "2025-08-08T15:14:50.119Z"
  },
  "group": "nodes"
}
```

| Field | Meaning |
| --- | --- |
| `id` | Unique node id. Auto-generated as `name_timestamp_uuid` unless you supply `trace.id`. |
| `label` | Display name. Defaults to the function's `name`. |
| `parent` | Id of the enclosing node, when the call happened inside another traced call. |
| `parallel` | Marks the node as part of a parallel group. |
| `abstract` | `true` for placeholder nodes the engine created implicitly (see [Nesting](#nesting)). |
| `inputs` / `outputs` | The arguments and the return value. |
| `errors` | Populated when the call throws and error recording is enabled; `config.errors` controls whether it is re-thrown. |
| `duration` / `elapsedTime` | Milliseconds as a number, and the same value formatted for humans. |
| `narratives` | Free-form notes attached to this step (see [Narratives](#narratives)). |

::: tip Set `trace.label` for display
Generated labels are implementation-oriented: anonymous functions use `"function"`, and some option forms add a
position prefix such as `"1 - generateGreeting"`. Set `options.trace.label` when a stable UI label matters.
:::

## Edges

You never create edges. The engine infers them when a node is added, by connecting it to every node at the **same
nesting level that does not already have an outgoing edge** — in other words, to the current leaves.

For plain sequential code, that produces a chain:

```ts
engine.run(stepA, []);   // A
engine.run(stepB, []);   // A → B
engine.run(stepC, []);   // A → B → C
```

An edge is minimal — it just points from one node to another:

```json
{
  "data": {
    "id": "stepA_…->stepB_…",
    "source": "stepA_…",
    "target": "stepB_…",
    "parallel": false
  },
  "group": "edges"
}
```

## Nesting

When one traced function calls `engine.run()` inside itself, the inner node is automatically assigned the outer
node's id as its `parent`. `AsyncLocalStorage` carries that relationship across `await` boundaries:

```ts
import { ExecutionEngine } from 'execution-engine';

const engine = new ExecutionEngine();

async function getWeatherInformation(city: string) {
  // Automatically nested under `getWeatherInformation`
  const temperature = (await engine.run(fetchCurrentTemperature, [city])).outputs;

  return `Weather: ${temperature}`;
}

await engine.run(getWeatherInformation, ['Paris']);
```

::: info Accessing the current node
`run()` also appends the current [`EngineNodeData`](../reference/types.md#enginenodedata) after your declared inputs.
Declare an optional last parameter (`node?: EngineNodeData`) only when you need its id or other node data. Functions
with optional parameters or code that inspects `arguments.length` should account for this extra argument.
:::

If you name a `parent` that has no node yet, the engine creates a placeholder for it and marks it `abstract: true`.
Those placeholder nodes are skipped when edges are inferred.

## Parallelism

Sequential inference is wrong for work that fans out. Setting `config.parallel` tells the engine to attach the node to
the **same source** as its sibling instead of chaining after it:

```ts
async function getWeatherInformation(city: string) {
  const [temperature, forecast] = await Promise.all([
    engine.run(fetchCurrentTemperature, [city], {
      config: { parallel: true }
    }).then((r) => r?.outputs),
    engine.run(fetchDailyForecast, [city], {
      config: { parallel: true }
    }).then((r) => r?.outputs)
  ]);

  return `${temperature}, ${forecast}`;
}
```

`parallel` accepts either form:

- `true` — reuse an existing parallel source under the same parent.
- `'some-group'` — reuse the source of the named group anywhere in the current graph. Use a unique name for each
  independent fan-out.

## Narratives

Narratives are human-readable notes pinned to a step — the "why" that inputs and outputs cannot express.

```ts
engine.pushNarratives('price-step', 'Cache was cold, went to the pricing API');
engine.run(fetchPrice, ['sku-42'], { id: 'price-step', label: 'Fetch price' });

engine.getNarratives(); // ordered across the whole trace
```

With the default recording settings, they can be pushed before the node exists; the engine holds them until that node
is created. If you use the per-field `traceExecution` extractor, set `narratives: true`.

## Controlling what gets recorded

By default every traced call retains its full inputs and outputs. That is convenient in development and a liability in
production — it keeps references alive and can put secrets in your trace. `config.traceExecution` narrows it.

**Everything (default), or nothing:**

```ts
{ config: { traceExecution: true } }   // record all fields
{ config: { traceExecution: false } }  // record only identity — no inputs, outputs or timing
```

**A whitelist of fields:**

```ts
{ config: { traceExecution: ['inputs', 'duration'] } }
```

**Per-field extraction**, which is the precise tool. Each of `inputs`, `outputs`, `errors` and `narratives` accepts
`true`, an array of paths, or a mapping function:

```ts
{
  config: {
    traceExecution: {
      inputs: ['0.name', '0.address.city', '1.name'],
      outputs: (out) => `traced output: '${out.fullGreeting}'`,
      errors: true,
      narratives: true,
      startTime: true,
      endTime: false
    }
  }
}
```

Path strings are resolved against the argument array, so `'0.name'` means "the `name` property of the first
argument". Extracted inputs come back as one object per path:

```json
"inputs": [
  { "0.name": "John Doe" },
  { "0.address.city": "Cityville" },
  { "1.name": "Akram" }
]
```

Output paths are resolved against the output value itself. They support array filters — `'items[key=Y].value'` —
and numeric indexes.

::: warning The extractor derives duration from both timestamps
In the per-field extractor form, `duration` and `elapsedTime` are emitted only when **both** `startTime` and `endTime`
are `true`. In the example above, `endTime: false` leaves only `startTime`.
:::

## Errors

`config.errors` decides what happens when a traced function throws:

- `'throw'` (**default**) — the error is recorded on the node, then re-thrown. Your `try`/`catch` behaves as usual.
- `'catch'` — the error is recorded on the node's `errors` field and execution continues, so one failed step does not
  abandon the rest of the trace.

```ts
engine.run(mightFail, [], { config: { errors: 'catch' } });
```

## Resuming a trace

If the recorded inputs, outputs, and errors are JSON-safe, you can serialize the graph and continue it later:

```ts
const engine = new ExecutionEngine({ initialTrace: JSON.parse(saved) });
```

New nodes chain onto the leaves of the restored graph. The same works via
[`initTrace()`](./traceable-engine.md#inittrace) on an existing instance. Use `traceExecution` extraction when raw
values contain secrets, circular references, or non-serializable objects.

## See also

- [Which API to use](../guide/which-api-to-use.md) — which entry point to reach for.
- [Types](../reference/types.md) — the full type reference for everything named on this page.
