# Trace

The `@trace` decorator (and its underlying `executionTrace` function) captures the execution details of a function or
method: inputs, outputs, errors, timing, and metadata. It's the primitive that powers tracing at the function level,
independent of the graph-building `TraceableEngine`/`ExecutionEngine`.

## Usage

### `@trace` decorator

```typescript
import { trace } from "execution-engine";

class MathOperations {
  @trace(console.log) // Trace the execution and log using console.log
  add(a: number, b: number): number {
    return a + b;
  }
}

const mathOps = new MathOperations();
console.log(mathOps.add(2, 3));
```

Every call to `add` logs a trace context containing the metadata, inputs, output, timing, duration, start time, end
time, and elapsed time.

### `executionTrace` function

For non-decorator usage, call `executionTrace` directly:

```typescript
import { executionTrace } from "execution-engine";

const traceContext = executionTrace(
  (a: number, b: number) => a + b,
  [2, 3],
  (ctx) => console.log(ctx)
);
```

## API

### `trace(onTraceEvent, additionalContext?, options?)`

A method decorator that wraps the original method with execution tracing.

- `onTraceEvent`: `(traceContext: TraceContext<O>) => void` — callback invoked with the trace context after execution.
- `additionalContext` (optional): extra metadata merged into every trace context produced by this method.
- `options` (optional):
  - `contextKey`: key used to store/retrieve the trace context on the instance (`this`).
  - `errorStrategy`: `'catch'` to capture errors in the trace and resolve with them, or `'throw'` (default) to
    re-throw after recording. Note the decorator's own default is `'throw'`.
  - `injectContextInArgs` (boolean): whether to append the trace context as an extra argument to the decorated method.
    Defaults to `true` for the decorator.

### `executionTrace(blockFunction, inputs?, onTraceEvent?, options?)`

The underlying function used by `@trace`. Supports both synchronous and asynchronous `blockFunction`s.

- `blockFunction`: the function to execute and trace.
- `inputs` (optional): array of arguments passed to `blockFunction`. Defaults to `[]`.
- `onTraceEvent` (optional): callback invoked with the resulting `TraceContext` after execution.
- `options` (optional):
  - `contextKey`: key to store/retrieve the trace context on `this`.
  - `errorStrategy`: `'catch'` or `'throw'` (default).
  - `injectContextInArgs` (boolean): whether to append the trace context as an extra argument to `blockFunction`.
    Defaults to `false` for the plain function.

Returns an `ExecutionTrace` synchronously if `blockFunction` is sync, or a `Promise<ExecutionTrace>` if it's async.

### `TraceContext<O>`

The object passed to `onTraceEvent`, extending `ExecutionTrace` with:

- `metadata`: `FunctionMetadata` describing the traced function (name, class, signature, etc.).
- Any additional keys merged in via `additionalContext` or `contextKey`.

## See also

- [TraceableEngine](./TraceableEngine.md) — builds a full node/edge execution graph on top of `executionTrace`.
- [ExecutionEngine](./ExecutionEngine.md) — adds a shared context on top of `TraceableEngine`.
