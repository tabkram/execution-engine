# Types

All types on this page are exported from the package root:

```ts
import type { EngineTrace, EngineNodeData, ExecutionTrace } from 'execution-engine';
```

This page lists their shapes. For behavior and examples, see the engine [Trace](../engine/trace.md) guide.

## Graph model

### `EngineTrace`

A flat array of nodes and edges, discriminated by `group`. This is what
[`getTrace()`](../engine/traceable-engine.md#gettrace) returns, in a shape that can be passed directly to
[Cytoscape](https://js.cytoscape.org/).

```ts
type EngineTrace = Array<EngineNode | EngineEdge>;
```

### `EngineNode`

```ts
interface EngineNode {
  data: EngineNodeData;
  group: 'nodes';
}
```

### `EngineEdge`

```ts
interface EngineEdge {
  data: EngineEdgeData;
  group: 'edges';
}
```

### `EngineNodeTrace`

The graph identity and placement fields shared by every node.

```ts
interface EngineNodeTrace {
  id: string;
  label: string;
  parent?: string;
  parallel?: boolean | string;
  abstract?: boolean;
  createTime?: Date;
  updateTime?: Date;
}
```

| Field | Description |
| --- | --- |
| `id` | Unique node id. Auto-generated as `name_timestamp_uuid`. |
| `label` | Display name. Generated labels depend on the option form: a no-options call uses the bare function name, while other forms may add a sequence prefix such as `1 - fetchUser`. Set `trace.label` when the text must be stable. |
| `parent` | Id of the enclosing node for nested calls. |
| `parallel` | `true`, or a group name, when the node belongs to a parallel fan-out. |
| `abstract` | `true` for placeholder parents the engine created implicitly. |
| `createTime` / `updateTime` | When the node was added to, or last modified in, the graph. |

### `EngineNodeData`

A node's graph data combined with its per-call execution record.

```ts
interface EngineNodeData<I = unknown, O = unknown>
  extends EngineNodeTrace, ExecutionTrace<I, O> {}
```

This is the type of the trailing argument passed to traced functions — see
[TraceableEngine remarks](../engine/traceable-engine.md#remarks).

### `EngineEdgeData`

```ts
interface EngineEdgeData {
  id: string;
  source: string | number;
  target: string | number;
  parent?: string;
  parallel?: boolean | string;
}
```

Edge ids are derived from their endpoints, as `` `${source}->${target}` ``.

## Execution record

### `ExecutionTrace`

The record for one call. Both [`run()`](../engine/traceable-engine.md#run) and
[`executionTrace()`](../execution/trace.md#executiontrace) return this shape.

```ts
interface ExecutionTrace<I, O> {
  id: string;
  inputs?: I;
  outputs?: O;
  isPromise?: boolean;
  errors?: unknown;
  narratives?: Array<string>;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  elapsedTime?: string;
}
```

| Field | Description |
| --- | --- |
| `id` | Unique id for the call. |
| `inputs` / `outputs` | Arguments and return value, subject to `traceExecution`. |
| `isPromise` | Whether the traced call resolved asynchronously. Removed from engine nodes. |
| `errors` | Populated when the call threw. |
| `narratives` | Notes attached via [`pushNarratives()`](../engine/traceable-engine.md#pushnarratives). |
| `startTime` / `endTime` | Timestamps captured around the call. |
| `duration` | Milliseconds, as a number. |
| `elapsedTime` | The same duration formatted for humans. |

### `ExecutionTraceExtractor`

Per-field control over what is recorded. Each field takes `true` to include everything, an array of paths to pull out
specific values, or a function to derive one.

```ts
interface ExecutionTraceExtractor<I, O> {
  inputs?: boolean | Array<string> | ((i: I) => unknown);
  outputs?: boolean | Array<string> | ((o: O) => unknown);
  errors?: boolean | Array<string> | ((e: Array<unknown>) => unknown);
  narratives?: boolean | Array<string> | ((execTrace: Partial<ExecutionTrace<I, O>>) => Array<string>);
  startTime?: boolean;
  endTime?: boolean;
}
```

Path strings resolve against the argument array (`'0.address.city'`) and support array filters
(`'items[key=Y].value'`). Extracted values come back as one `{ path: value }` object per path. `duration` and
`elapsedTime` are emitted only when `startTime` and `endTime` are both `true`.

### `TraceOptions`

The `options` argument of [`run()`](../engine/traceable-engine.md#run) and [`@run`](../engine/engine-run.md#run).

```ts
interface TraceOptions<I, O> {
  trace?: Partial<EngineNodeData>;
  config?: {
    traceExecution?: boolean | Array<keyof ExecutionTrace<I, O>> | ExecutionTraceExtractor<I, O>;
    parallel?: boolean | string;
    errors?: 'catch' | 'throw';
  };
}
```

The defaults are exported as `DEFAULT_TRACE_CONFIG`:

```ts
const DEFAULT_TRACE_CONFIG = {
  traceExecution: true,
  parallel: false,
  errors: 'throw'
};
```

### `FunctionMetadata`

Describes the traced function itself. It is attached to [`TraceContext`](../execution/trace.md#tracecontext),
[`CacheContext`](../execution/cache.md#cachecontext), and
[`MemoizationContext`](../execution/memoize.md#memoizationcontext). Engine nodes omit it.

```ts
interface FunctionMetadata {
  class?: string;
  method?: string | symbol;
  methodSignature?: string;
  name: string;
  parameters: string[];
  isAsync: boolean;
  isBound: boolean;
}
```

`class` and `method` are set only when tracing a class method. `name` falls back to `"anonymous"`.

## Timing

### `TimerDetailsModel`

Returned by [`ExecutionTimer.getInfo()`](../execution/timer.md#getinfo).

```ts
interface TimerDetailsModel {
  executionId: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  duration: number | undefined;
  elapsedTime: string | undefined;
}
```

## Caching & memoization

These are documented alongside their APIs:

- [`CacheOptions`, `CacheContext`, `CacheStore`](../execution/cache.md#api)
- [`MemoizeOptions`, `MemoizationContext`](../execution/memoize.md#api)

The memoization module also exports its bounds as constants: `memoizationDefaultTTL` (`100`) and `memoizationMaxTTL`
(`1000`), both in milliseconds.

## Type guards

| Guard | Narrows to |
| --- | --- |
| `isEngineNodeTrace(value)` | `Partial<EngineNodeTrace>` — true when `id`, `label` or `parent` is present. Used to tell the shorthand `options` form from the full one. |
| `isExecutionTrace(value)` | `ExecutionTraceExtractor` — despite its name, this detects extractor configuration by checking for any extractor field. |

## Deprecated aliases

Deprecated names remain exported for compatibility. See [Migration](./migration.md) for the complete replacement table.
