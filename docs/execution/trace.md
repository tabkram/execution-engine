# Trace

Trace **one function**, with no engine involved.

`@trace` reports each completed method call to a callback while preserving the method's normal return value.
`executionTrace` does the same work for a plain function and returns the trace record, or a promise of it.

::: info No graph here
This path records calls **individually**. It does not track order, nesting or parallelism, and produces no nodes or
edges. For that, route calls through an engine instead — see the engine [Trace](../engine/trace.md) guide.
:::

## Usage

### `@trace` decorator

```ts
import { trace } from 'execution-engine';

class MathOperations {
  @trace(console.log)
  add(a: number, b: number): number {
    return a + b;
  }
}

const mathOps = new MathOperations();
console.log(mathOps.add(2, 3)); // 5
```

The decorated method still returns its own value. Every call additionally invokes the callback with a
[`TraceContext`](#tracecontext) describing what happened.

### `executionTrace` function

For code without classes, call the underlying function directly:

```ts
import { executionTrace } from 'execution-engine';

const result = executionTrace(
  (a: number, b: number) => a + b,
  [2, 3],
  (ctx) => console.log(ctx.duration, ctx.outputs)
);

console.log(result.outputs); // 5
```

Unlike the decorator, this returns the **whole trace object**, not just the output.

### Reading the trace context inside the function

By default, the function receives only the arguments you pass. Set `injectContextInArgs` to append the in-progress
trace context. `contextKey` is optional; it stores that in-progress context on `this`. This decorator example uses
both so its class and method metadata are available inside the call:

```ts
import { trace, TraceContext } from 'execution-engine';

class Service {
  @trace(console.log, {}, { contextKey: 'traceContext', injectContextInArgs: true })
  process(payload: string, ctx?: TraceContext<string>) {
    console.log(ctx?.metadata.method); // "process"
    return payload.toUpperCase();
  }
}
```

::: warning Changed in 4.0.0
`injectContextInArgs` defaults to **`false`** for both `@trace` and `executionTrace`. Before 4.0.0 the context was
always appended. See [Migration](../reference/migration.md#behaviour-change-in-4-0-0).
:::

The injected object contains the data known at call time. `outputs`, `errors` and final timing are added afterwards;
fields you add while the function runs are preserved in the completed trace.

### Attaching your own metadata

`additionalContext` adds your own top-level fields to every trace from the method. Use it for tags such as a domain,
owner or feature flag:

```ts
class Service {
  @trace(sendToLogger, { domain: 'billing', critical: true })
  chargeCard(amount: number) {
    /* … */
  }
}
```

## API

### `trace(onTraceEvent, additionalContext?, options?)` {#trace-fn}

A method decorator that wraps the original method with execution tracing.

| Parameter | Type | Description |
| --- | --- | --- |
| `onTraceEvent` | `(traceContext: TraceContext<O>) => void` | Called with the trace context after execution. Required. |
| `additionalContext` | `Record<string, any>` | Extra fields merged into every trace context. Defaults to `{}`. |
| `options.contextKey` | `string` | Property name under which the trace context is stored on the instance (`this`). |
| `options.errorStrategy` | `'catch' \| 'throw'` | How thrown errors are handled. Defaults to `'throw'`. |
| `options.injectContextInArgs` | `boolean` | Append the trace context as a trailing argument. Defaults to `false`. |

::: warning `errorStrategy: 'catch'` changes the return value
With `'throw'` (the default), failures are recorded and then re-thrown. With `'catch'`, `executionTrace` returns a
trace containing `errors`; `@trace` suppresses the exception and no longer preserves the method's normal return
contract. Use `'catch'` only when callers do not expect the successful return type.
:::

### `executionTrace(blockFunction, inputs?, onTraceEvent?, options?)` {#executiontrace}

The function behind `@trace`. Handles both synchronous and asynchronous `blockFunction`s.

| Parameter | Type | Description |
| --- | --- | --- |
| `blockFunction` | `(...params: unknown[]) => O \| Promise<O>` | The function to execute and trace. |
| `inputs` | `Array<unknown>` | Arguments passed to `blockFunction`. Defaults to `[]`. |
| `onTraceEvent` | `(traceContext: TraceContext<O>) => void` | Optional callback fired after execution. |
| `options` | same as above | `contextKey`, `errorStrategy`, `injectContextInArgs`. |

**Returns** an [`ExecutionTrace`](../reference/types.md#executiontrace) if `blockFunction` is synchronous, or a
`Promise<ExecutionTrace>` if it is asynchronous.

### `TraceContext`

The object passed to `onTraceEvent`. It extends [`ExecutionTrace`](../reference/types.md#executiontrace) with function metadata:

```ts
interface TraceContext<O> extends ExecutionTrace<Array<unknown>, O> {
  metadata: FunctionMetadata;
  [key: string]: unknown;
}
```

`metadata` is a [`FunctionMetadata`](../reference/types.md#functionmetadata) record: `name`, `class`, `method`,
`methodSignature`, `parameters`, `isAsync` and `isBound`.

## Remarks

- Timing is measured with `performance.now()` via [`ExecutionTimer`](./timer.md), and `elapsedTime` is
  reported to three decimal places.
- Errors are normalized before being stored, so non-`Error` throws (strings or objects) still serialize cleanly.
- `onTraceEvent` runs inline after the call. If the callback throws, that error reaches the caller.
- When the context is injected, fields added during the call remain on the final record. Completion fields such as
  `outputs`, `errors`, `endTime` and `duration` are populated after the function settles.

## See also

- [TraceableEngine](../engine/traceable-engine.md) — builds a full node/edge execution graph on top of `executionTrace`.
- [ExecutionEngine](../engine/execution-engine.md) — adds a shared context on top of `TraceableEngine`.
- [Which API to use](../guide/which-api-to-use.md) — when to prefer this over the engine.
