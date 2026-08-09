# Migration

Every symbol listed here still works in v4. Replace it before the next major release, but an upgrade does not require
all renames at once.

## Renamed symbols

Several types were renamed to make it obvious which belong to the engine's graph model. The old names were generic
enough to collide with DOM and library types (`Node`, `Edge`, `Trace`).

| Deprecated | Replacement |
| --- | --- |
| `TraceableExecution` | [`TraceableEngine`](../engine/traceable-engine.md) |
| `Node` | [`EngineNode`](./types.md#enginenode) |
| `Edge` | [`EngineEdge`](./types.md#engineedge) |
| `Trace` | [`EngineTrace`](./types.md#enginetrace) |
| `NodeData` | [`EngineNodeData`](./types.md#enginenodedata) |
| `NodeTrace` | [`EngineNodeTrace`](./types.md#enginenodetrace) |
| `EdgeData` | [`EngineEdgeData`](./types.md#engineedgedata) |
| `NodeExecutionTrace` | [`ExecutionTrace`](./types.md#executiontrace) |
| `NodeExecutionTraceExtractor` | [`ExecutionTraceExtractor`](./types.md#executiontraceextractor) |
| `isNodeTrace` | `isEngineNodeTrace` |
| `isNodeExecutionTrace` | `isExecutionTrace` |

The deprecated types extend their replacements, the guard functions are direct aliases, and `TraceableExecution`
extends `TraceableEngine`. A find-and-replace is normally enough:

```ts
// Before
import { TraceableExecution, NodeData, Trace } from 'execution-engine';

// After
import { TraceableEngine, EngineNodeData, EngineTrace } from 'execution-engine';
```

## Behaviour change in 4.0.0

Tracing no longer appends the trace context to your function's arguments by default.

Previously the trace context was passed to the traced function as an extra trailing argument. It is now opt-in through
`injectContextInArgs`, which defaults to `false` for **both** [`@trace`](../execution/trace.md#trace-decorator) and
[`executionTrace`](../execution/trace.md#executiontrace).

If your traced function reads that trailing argument, opt back in explicitly:

```ts
// Plain function
executionTrace(myFunction, [a, b], onTrace, {
  contextKey: 'traceContext',
  injectContextInArgs: true
});

// Decorator
class Service {
  @trace(console.log, {}, { contextKey: 'traceContext', injectContextInArgs: true })
  myMethod(a: number, context?: TraceContext<number>) {
    // `context` is populated again
  }
}
```

::: info This does not affect the engine
[`TraceableEngine.run()`](../engine/traceable-engine.md#run) and the [`@run`](../engine/engine-run.md) decorator always
append the current node's data as a trailing argument. That behaviour is unchanged.
:::

## See also

- [Full changelog](https://github.com/tabkram/execution-engine/blob/main/CHANGELOG.md)
- [Types](./types.md) — the current type reference.
