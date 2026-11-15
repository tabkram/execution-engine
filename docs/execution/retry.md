---
description: Retry functions and methods with bounded attempts, backoff, jitter, per-call cancellation and optional execution graphs.
---

# Retry

`retry` and the `@retry` decorator run a function again after a failure, with a bounded number of attempts, backoff,
optional jitter and per-call cancellation. Both always return a Promise, including for synchronous functions.

By default a call permits three executions and retries errors after 100 ms, then 200 ms. A successful result ends the
call unless `shouldRetry` asks for another attempt. Retry does not reuse results; for that, use
[`cache`](./cache.md) or [`memoize`](./memoize.md).

## Usage

### `@retry` decorator

```ts
import { retry } from 'execution-engine';

class BillingService {
  constructor(private readonly baseUrl: string) {}

  @retry({ attempts: 3, backoff: 'fixed', initialDelay: 200 })
  async getInvoice(invoiceId: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/invoices/${invoiceId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

Enable `experimentalDecorators` and declare the method `async`, so its TypeScript return type matches the runtime
Promise. The receiver and arguments reach every attempt. Attempt counts, results and cancellation are isolated
between concurrent calls and instances. The policy is copied when the decorator is applied.

### `retry` function

```ts
import { retry } from 'execution-engine';

const getInvoice = retry(
  async (invoiceId: string) => {
    const response = await fetch(`/invoices/${invoiceId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    attempts: 3,
    backoff: 'exponential',
    initialDelay: 200,
    maxDelay: 2_000,
    jitter: true,
    shouldRetry: ({ error }) => error instanceof Error && /^HTTP 5\d\d$/.test(error.message),
    onRetry: ({ attempt, delay }) => console.log(`Attempt ${attempt} failed; retrying after ${delay} ms`)
  }
);

const invoice = await getInvoice('inv-123');
```

`attempts` counts executions, so `attempts: 3` permits at most two retries, and the first execution starts without a
delay. Hooks receive a [`RetryContext`](#retrycontext) object. `fetch` does not reject HTTP error responses, so
the example throws explicitly and retries only HTTP 5xx errors. See the
[runnable example](../examples.md#retry-temporary-failures) for both forms without network requests.

### Retrying results

`shouldRetry` can also request another attempt for a successful result, for example while polling:

```ts
import { retry, type RetryBackoff } from 'execution-engine';

const backoff: RetryBackoff = ({ attempt }) => attempt * 250;

const poll = retry(() => fetch('/job/status'), {
  backoff,
  shouldRetry: async (context) => 'error' in context || context.result?.status === 202
});

const response = await poll();
```

Test for the presence of `error` when every failure should be retried: JavaScript permits `throw undefined`.
The final response is returned even if its status is still `202` when the attempt budget is exhausted.

### Cancellation per call

A function wrapper exposes `withOptions({ signal }, ...args)`:

```ts
const controller = new AbortController();
const pending = getInvoice.withOptions({ signal: controller.signal }, 'inv-123');
controller.abort();
await pending; // Rejects with controller.signal.reason (AbortError by default).
```

For a function that needs a receiver, use `wrapped.withOptions.call(receiver, { signal }, ...args)`. The signal is
call configuration and is not appended to the original function's arguments.

For a decorator, `getSignal(args)` selects a signal from the method's own arguments, which the method can also pass
to an operation that supports cancellation:

```ts
class BillingService {
  @retry({ getSignal: (args) => args[1] as AbortSignal | undefined })
  async getInvoice(invoiceId: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(`/invoices/${invoiceId}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

`getSignal` also works for function wrappers; an explicit `withOptions` signal takes precedence. An already aborted
call does not execute the function. Cancellation clears a pending delay and rejects promptly while an operation,
predicate or hook is pending, removes its abort listeners and starts no further attempts. Retry cannot interrupt the
underlying work; pass the signal to that work when it supports cancellation.

### Recording attempts in a trace {#trace-integration}

Pass `{ engine }`, call the wrapper with a `TraceableEngine` receiver, or decorate a method whose receiver has a
`TraceableEngine` at `this.engine`. Retry records one parent operation labeled `retry <function name>` and one child
per execution labeled `attempt 1`, `attempt 2`, and so on. Nested calls keep the engine's current parent.

```ts
import { retry, TraceableEngine } from 'execution-engine';

const engine = new TraceableEngine();
const getStatus = retry(() => fetch('/status'), { engine });
await getStatus();
const graph = engine.getTrace();
```

`@retry` records attempts without `@run`. If the method is also a workflow step, place `@run` above `@retry` to
enclose the retry operation in that step:

```ts
import { engine, EngineTask, retry, run } from 'execution-engine';

@engine()
class BillingService extends EngineTask {
  @run({ trace: { label: 'Get invoice' } })
  @retry({ attempts: 3, initialDelay: 200 })
  async getInvoice(id: string): Promise<unknown> {
    const response = await fetch(`/invoices/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

const service = new BillingService();
const invoice = await service.getInvoice('inv-123');
const graph = service.engine.getTrace();
```

The graph contains the outer `Get invoice` step, a nested `retry getInvoice` operation and its child attempts. The
method returns the invoice directly in a Promise; read the graph from the engine afterwards.

## API

### `retry(fn, options?)` {#retry-fn}

Returns a [`RetryFunction`](#retryfunction) that wraps `fn`. `@retry(options?)` applies the same options to a method.

### `RetryOptions<Result>`

| Option | Default | Behavior |
| --- | --- | --- |
| `attempts` | `3` | Positive safe integer; includes the first execution. |
| `backoff` | `'exponential'` | `'fixed'`, `'exponential'`, a fixed delay in milliseconds, or `(context: RetryContext) => number`. |
| `initialDelay` | `100` | Milliseconds for fixed backoff or the first exponential delay. Ignored by numeric and custom backoff. |
| `maxDelay` | `2_147_483_647` | Caps every strategy before jitter; matches the largest supported timer delay. |
| `jitter` | `false` | Full jitter: an integer between zero and the floored capped delay, inclusive. |
| `shouldRetry` | Retry errors | `(context: RetryContext<Result>) => boolean \| Promise<boolean>`. Can also request retries of results. |
| `onRetry` | — | `(context: RetryContext<Result>) => void \| Promise<void>`, awaited before the delay. |
| `getSignal` | — | `(args: readonly unknown[]) => AbortSignal \| undefined`, resolved once per call. |
| `engine` | Inferred when available | `TraceableEngine` for recording the operation and its attempts. |

Exponential backoff uses `initialDelay * 2 ** (attempt - 1)`. Numeric delay options and custom strategy results must
be finite numbers between zero and `2_147_483_647`; invalid values throw `RangeError`. Policy options are validated
when creating the wrapper; custom delays are validated when evaluated. A zero delay still yields through a timer.

### `RetryContext<Result>` {#retrycontext}

```ts
interface RetryContext<Result = unknown> {
  attempt: number;
  error?: unknown;
  result?: Result;
  delay: number;
}
```

`attempt` is the completed, one-based execution. A failure context contains `error`, even if the thrown value was
`undefined`; a success context contains `result`. A custom backoff receives `delay: 0`; `shouldRetry` and `onRetry`
receive the computed, capped and jittered delay.

### `RetryFunction` and `RetryCallOptions` {#retryfunction}

`RetryFunction<Args, Result, Receiver>` describes the Promise-returning wrapper and its `withOptions` method.
`RetryCallOptions` contains the optional per-call `signal`. All retry functions and types are exported from the
package entry point.

## Remarks

- Custom backoff runs before the predicate. Neither the strategy nor a hook runs after the final allowed execution,
  or after an accepted result when no predicate is set.
- Exhaustion rejects with the exact last thrown value, preserving an Error's identity and stack.
- A predicate returning `false` stops immediately: the call returns the result or rejects with the current error.
- When result retries exhaust the attempt budget, the final result is returned.
- Errors thrown by strategies, predicates and hooks stop the call immediately and propagate without being retried.
- Retry does not reuse results or merge concurrent calls; every invocation has its own attempt budget.

## See also

- [cache](./cache.md) and [memoize](./memoize.md) — reuse or share results instead of retrying.
- [TraceableEngine](../engine/traceable-engine.md) — the engine that records attempts.
- [Which API to use](../guide/which-api-to-use.md#retry-or-retry) — function and decorator side by side.
