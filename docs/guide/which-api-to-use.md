# Which API to use

Use the [Execution APIs](./what-is-execution-engine.md#execution-apis) when calls can be observed or
optimized independently. If you need a graph of several calls, choose an engine below.

## Picking an engine

All three build the same graph. They differ in what else they give you.

| If you want… | Use | Adds |
| --- | --- | --- |
| Just the graph | [`TraceableEngine`](../engine/traceable-engine.md) | `run()`, `getTrace()` |
| …plus state shared across steps | [`ExecutionEngine`](../engine/execution-engine.md) | A typed context object |
| …plus clean call sites | [`@engine` and `@run`](../engine/engine-run.md) | Decorators; methods stay normal |

::: code-group

```ts [TraceableEngine]
const engine = new TraceableEngine();

engine.run(stepA, [1]);
engine.run(stepB, [2]);

engine.getTrace();
```

```ts [ExecutionEngine]
const engine = new ExecutionEngine<{ user: User }>();

engine.setContext({ user });
engine.run(stepA, [1]);

engine.getContext();
```

```ts [@engine and @run]
@engine({ id: 'checkout' })
class Checkout extends EngineTask {
  @run()
  validate(cart: Cart) { /* … */ }
}
```

:::

### `run()` or `@run`?

Same graph, different ergonomics:

- **`engine.run(fn, args)`** returns the whole `ExecutionTrace`, so your value is at `.outputs`. Noisier, but works
  with any function — including ones you did not write.
- **`@run()`** returns your method's value directly. Cleaner, but needs a class you own that extends `EngineTask`, and
  `experimentalDecorators`.

## Decorator or plain function?

Tracing, caching and memoization each have a decorator and a plain-function API, backed by the same implementation.

| Decorator | Plain function |
| --- | --- |
| [`@trace`](../execution/trace.md#trace-decorator) | [`executionTrace`](../execution/trace.md#executiontrace) |
| [`@cache`](../execution/cache.md#cache-decorator) | [`executeCache`](../execution/cache.md#executecache) |
| [`@memoize`](../execution/memoize.md#memoize-decorator) | [`executeMemoize`](../execution/memoize.md#executememoize) |

Use the plain function when you are not writing classes, cannot enable `experimentalDecorators`, or need to wrap
someone else's function. `executeCache` and `executeMemoize` additionally require a `functionId`, since there is no
method identity to derive one from. Their stores also live on `this`, so call them with the same receiver (for example,
`executeMemoize.call(scope, ...)`) when calls should share entries.

## `@cache` or `@memoize`?

Both optimize execution; neither adds trace records.

| | [`@cache`](../execution/cache.md) | [`@memoize`](../execution/memoize.md) |
| --- | --- | --- |
| Purpose | Reuse results across time | Share one result across near-simultaneous identical calls |
| TTL | You set it | `100 ms`, capped at `1000 ms` |
| Typical use | An API response reused for 5 minutes | Recursion, or 50 callers hitting one endpoint at once |
| Custom key | Yes | No — hashed from inputs |
| Custom store | Yes, e.g. Redis | No — in-memory only |

Rule of thumb: use `@cache` when a result should remain reusable and invalidation matters. Use `@memoize` when several
identical calls arriving together should share one execution.
