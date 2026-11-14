# Memoize

The `@memoize` decorator and `executeMemoize` deduplicate calls with the same inputs in memory. They store a
synchronous result immediately or share an asynchronous call's in-flight promise, then remove the entry after a
short TTL.

Use memoization to collapse concurrent or rapidly repeated work. For configurable retention, custom keys, or a
shared store, use [`cache`](./cache.md).

## Usage

### `@memoize` decorator

```ts
import { memoize } from 'execution-engine';

class Calculator {
  @memoize()
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

const calc = new Calculator();
calc.fibonacci(10); // computes
calc.fibonacci(10); // reuses the stored result
```

Repeated subproblems are reused while their entries are alive, reducing the work performed by this recursive
implementation. See the note about [synchronous falsy results](#remarks).

### Collapsing concurrent requests

Async results are stored as the **in-flight promise**, so simultaneous callers await the same execution:

```ts
class RatesService {
  @memoize()
  async getRates(currency: string): Promise<Rates> {
    return fetch(`/rates/${currency}`).then((r) => r.json());
  }
}

const service = new RatesService();

// One HTTP request, not fifty.
await Promise.all(Array.from({ length: 50 }, () => service.getRates('EUR')));
```

### Share only in-flight work

For asynchronous calls, set `ttl` to `0` when a completed result or rejection must never be reused. Concurrent calls with identical inputs
still share one execution, regardless of how long it takes. The entry is removed immediately when the promise
fulfills or rejects, before callers resume; the next call starts fresh work without waiting for a timer.

```ts
class RatesService {
  @memoize(undefined, 0)
  async getRates(currency: string): Promise<Rates> {
    return fetch(`/rates/${currency}`).then((r) => r.json());
  }
}

const service = new RatesService();
await Promise.all([service.getRates('EUR'), service.getRates('EUR')]); // One request.
await service.getRates('EUR'); // A new request, even immediately after the await.
```

The first decorator argument is the optional event callback; the TTL is the second. The equivalent plain-function
option is `{ functionId: 'getRates', ttl: 0 }`. This mode coordinates callers within one process and one shared
instance; it does not provide a lock between CLI processes.

Synchronous functions keep their existing timer-based expiration, including `setTimeout(..., 0)` with a zero TTL.
Immediate repeats and recursive calls can reuse their results until that timer runs; subsequent calls recompute.
This preserves synchronous memoization while allowing immediate retries after asynchronous completion or failure.

### Observing memoization

```ts
class Calculator {
  @memoize(
    ({ inputsHash, isMemoized }) => console.log(isMemoized ? 'reused' : 'computed', inputsHash),
    500 // ttl in ms
  )
  heavyCompute(n: number) {
    /* … */
  }
}
```

Note the argument order: the event handler comes **first**, the TTL second.

## API

### `memoize(onMemoizeEvent?, ttl?)` {#memoize-fn}

A method decorator applying memoization to the decorated method.

| Parameter | Type | Description |
| --- | --- | --- |
| `onMemoizeEvent` | `(info: MemoizationContext<O>) => void` | Fired on every call with `metadata`, `inputsHash`, `isMemoized` and `value`. |
| `ttl` | `number` | Retention after completion, in milliseconds. Defaults to `100`, capped at `1000`. With `0`, promises expire immediately at settlement; synchronous results expire via a zero-delay timer. |

### `executeMemoize(blockFunction, inputs?, options)` {#executememoize}

The function behind `@memoize`, for non-decorator use.

| Option | Type | Description |
| --- | --- | --- |
| `functionId` | `string` | **Required.** Scopes the store to this function. The decorator derives it from the method signature. |
| `ttl` | `number` | As above. Defaults to `100`, capped at `1000`. |
| `onMemoizeEvent` | `(info: MemoizationContext<O>) => void` | As above. |

Like the decorator, the plain function keeps its store on `this`. Give direct calls a stable scope object and reuse it:

```ts
import { executeMemoize } from 'execution-engine';

const requests = { executeMemoize }; // Create once and reuse this receiver.
const rates = await requests.executeMemoize(() => fetchRates('EUR'), ['EUR'], {
  functionId: 'fetchRates',
  ttl: 0
});
```

`inputs` are both hashed for lookup and passed to `blockFunction`. The closure above intentionally ignores the
forwarded arguments. `options.functionId` is required at runtime; provide the options object even though the current
overload declarations mark it optional. Calling a detached import without a receiver fails because the store lives
on `this`.

**Returns** the memoized value if one is live, otherwise the result of executing `blockFunction` — synchronously for
sync functions, as a promise for async ones.

### `MemoizationContext`

```ts
interface MemoizationContext<O> {
  metadata: FunctionMetadata;
  inputsHash: string;
  isMemoized: boolean;
  value?: Promise<O> | O;
}
```

## Remarks

- For asynchronous calls, the TTL countdown starts when the promise settles. A request that takes two seconds with a
  `100` ms TTL remains shared while in flight, then remains available for another 100 ms.
- `ttl` defaults to `100` ms and is capped at `1000` ms. Use [`cache`](./cache.md) for longer retention.
- With `ttl: 0`, fulfilled and rejected promises are removed immediately at settlement, without a timer. A new
  call after either outcome starts a new execution. Synchronous results still expire via `setTimeout(..., 0)`,
  preserving immediate reuse and recursive memoization until the timer runs.
- A synchronous throw is not stored. With a positive TTL, an asynchronous rejection is shared with concurrent callers
  and remains stored until its post-settlement TTL expires; calls during that window receive the same rejection.
- Synchronous `0`, `''`, `false`, `null` and `undefined` results are treated as misses because lookup uses truthiness.
  Async functions store a promise, so their falsy resolved values are still reused.
- The input hash and store are instance-local; memoization has no custom key or external store option.

## See also

- [cache](./cache.md) — longer-lived, configurable storage with custom keys and stores.
- [Which API to use](../guide/which-api-to-use.md#cache-or-memoize) — a side-by-side comparison.
