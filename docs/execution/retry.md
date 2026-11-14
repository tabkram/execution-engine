# Retry

`retry(fn, options?)` wraps a function with bounded retries. `@retry(options?)` applies the same policy to a method.
Both accept synchronous throws, rejected promises, and successful results. Every invocation returns a Promise,
including when the original function is synchronous. Declare decorated methods `async` so their TypeScript return
types match runtime behavior.

## Usage

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

The hooks receive a context object, rather than positional `error, attempt` arguments. Attempts count executions,
so `attempts: 3` permits at most two retries. The first execution starts without a delay.

### Decorator

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

Enable `experimentalDecorators`. Both forms preserve the receiver and forward the original arguments to every
attempt. Attempt counts, results and cancellation are isolated between concurrent calls and instances. The policy
is copied when the wrapper or decorator is created.

### Cancellation per call

The function wrapper exposes `withOptions({ signal }, ...args)`:

```ts
const controller = new AbortController();
const pending = getInvoice.withOptions({ signal: controller.signal }, 'inv-123');
controller.abort();
await pending; // Rejects with controller.signal.reason (AbortError by default).
```

For a function that needs a receiver, use
`wrapped.withOptions.call(receiver, { signal }, ...args)`. The signal is call configuration and is not appended
to the original function's arguments.

For decorators, `getSignal(args)` selects a signal from the method's own arguments. This also lets the method
pass it to an operation that supports cancellation:

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

`getSignal` is also available to function wrappers; an explicit `withOptions` signal takes precedence.
An already aborted call does not execute the function. Cancellation clears a pending delay and rejects promptly
while an operation, predicate, or hook is pending. It removes its abort listeners and starts no further attempts.
Retry cannot interrupt the underlying work itself; pass the signal to that work when cancellation is supported.

## API

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

```ts
import type { RetryContext, RetryBackoff } from 'execution-engine';

const backoff: RetryBackoff = ({ attempt }) => attempt * 250;

// The predicate can retry successful results as well as errors.
const poll = retry(() => fetch('/job/status'), {
  backoff,
  shouldRetry: async ({ error, result }) => error !== undefined || result?.status === 202
});
```

### `RetryContext<Result>`

```ts
interface RetryContext<Result = unknown> {
  attempt: number;
  error?: unknown;
  result?: Result;
  delay: number;
}
```

`attempt` is the completed, one-based execution. A failure context contains `error` (even if the thrown value
was `undefined`); a success context contains `result`. A custom backoff receives `delay: 0`; `shouldRetry` and
`onRetry` receive the computed, capped and jittered delay. Custom backoff runs before the predicate. Neither
hook nor the strategy runs after the final allowed execution, or after an accepted result with no predicate.

Exhaustion rejects with the exact last thrown value, preserving an Error's identity and stack. A predicate returning
`false` stops immediately and returns the result or rejects with the current error. When result retries exhaust
the attempt budget, the final result is returned. Errors from strategies, predicates and hooks stop the call
immediately and propagate without being retried.

`RetryFunction<Args, Result, Receiver>` describes the Promise-returning wrapper and its `withOptions` method.
`RetryCallOptions` contains the optional per-call `signal`. All retry functions and types are exported from the
package entry point.

## Trace integration

Pass `{ engine }`, invoke the wrapper with a `TraceableEngine` receiver, or decorate a method whose receiver has
a `TraceableEngine` at `this.engine`. Retry records one parent operation labeled `retry <function name>` and one
child per execution labeled `attempt 1`, `attempt 2`, and so on. Nested calls retain the engine's current parent.

```ts
import { retry, TraceableEngine } from 'execution-engine';

const engine = new TraceableEngine();
const getStatus = retry(() => fetch('/status'), { engine });
await getStatus();
const graph = engine.getTrace();
```

Attempt nodes record inputs, outputs or serialized failure reasons, and timing. Retried attempts have a narrative
containing the planned delay and whether the retry came from an error or result. The parent records the final
output or error and a success, failure, or cancellation narrative. Aborted delays do not create another attempt.
Trace errors use the engine's existing serialization; the rejected error remains the original value.

Without an engine, retry executes without creating a graph. Retry trace nodes explicitly record full execution
details; any enclosing node's extraction settings still apply to that enclosing node.
