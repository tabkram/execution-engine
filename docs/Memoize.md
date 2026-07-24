# Memoize

The `@memoize` decorator (and its underlying `executeMemoize` function) deduplicates calls to the same function with
the same inputs that happen within a very short time window (e.g. concurrent or rapidly repeated calls). Unlike
`@cache`, it's not meant for long-lived storage — the stored result is cleared automatically after a short delay.

## Usage

```typescript
import { memoize } from "execution-engine";

class Calculator {
  @memoize() // Store the result of Fibonacci calculations
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

const calc = new Calculator();
console.log(calc.fibonacci(10)); // Calculates and stores result
console.log(calc.fibonacci(10)); // Reuses pending result, no recalculation
```

Repeated calls to `fibonacci` with the same `n`, made before the memoized entry expires, reuse the stored result (or
in-flight promise) instead of recalculating it — which also naturally deduplicates recursive calls within the same
computation.

## API

### `memoize(onMemoizeEvent?, ttl?)`

A method decorator that applies memoization to the decorated method.

- `onMemoizeEvent?`: `(info: MemoizationContext<O>) => void` — callback fired on every call with `metadata`,
  `inputsHash`, `isMemoized`, and `value`.
- `ttl?`: `number` — how long (in milliseconds) the memoized result is retained. Defaults to `100`ms and is capped at
  `1000`ms.

### `executeMemoize(blockFunction, inputs?, options)`

The underlying function used by `@memoize`, for direct/non-decorator usage. Requires `options.functionId` to scope
the memoization store to a specific function.

## Remarks

- The memoized value (or in-flight promise, for async functions) is shared by all callers within the TTL window, so
  concurrent calls with the same inputs only execute the function once.
- Because the JavaScript engine may reclaim the entry as soon as the TTL elapses, keep the TTL short — it's meant to
  bridge near-simultaneous calls, not to replace `@cache`.

## See also

- [Cache](./Cache.md) — longer-lived, configurable storage for results across calls.
