# Cache

The `@cache` decorator (and its underlying `executeCache` function) stores the result of a function call and reuses
it for subsequent calls with the same inputs, within a configurable time-to-live (TTL). It's useful for avoiding
redundant expensive computations or API calls.

## Usage

### `@cache` decorator

```typescript
import { cache } from "execution-engine";

class ExampleService {
  @cache({ ttl: 5000 }) // Store result for 5 seconds
  async fetchData(id: number): Promise<string> {
    console.log('Fetching data...');
    return `Data for ${id}`;
  }
}

const service = new ExampleService();
console.log(await service.fetchData(1)); // Fetches data and stores it
console.log(await service.fetchData(1)); // Reuses stored result (within ttl)
```

### Bypassing the cache

```typescript
class ExampleService {
  @cache({
    ttl: 5000,
    bypass: () => process.env.NODE_ENV === 'test' // force a fresh call, ignoring any cached value
  })
  async fetchData(id: number): Promise<string> {
    return `Data for ${id}`;
  }
}
```

### Custom cache store

By default, results are kept in an in-memory `Map` scoped to the instance. Provide `cacheManager` to plug in your own
store (e.g. Redis) as long as it implements `get`/`set`.

```typescript
class ExampleService {
  @cache({
    ttl: 60000,
    cacheManager: myRedisCacheStore
  })
  async fetchData(id: number): Promise<string> {
    return `Data for ${id}`;
  }
}
```

## API

### `cache(options)`

A method decorator that applies caching logic to the decorated method.

- `options.ttl`: `number | (params) => number` — time-to-live for cache entries, in milliseconds. Can be static or
  computed from `{ metadata, inputs }`.
- `options.bypass?`: `(params) => boolean` — return `true` to ignore any existing cached value and force a fresh
  computation. Defaults to `false`.
- `options.cacheKey?`: `(params) => string` — customize the cache key. Defaults to a hash of the inputs.
- `options.cacheManager?`: `CacheStore | (...args) => CacheStore` — custom store implementing `get`/`set`. Defaults to
  an in-memory store scoped to the instance.
- `options.onCacheEvent?`: `(info: CacheContext<O>) => void` — callback fired on every call with cache details
  (`ttl`, `metadata`, `inputs`, `cacheKey`, `isBypassed`, `isCached`, `value`).

### `executeCache(blockFunction, inputs?, options)`

The underlying function used by `@cache`, for direct/non-decorator usage. Requires `options.functionId` to scope the
cache store to a specific function.

## Remarks

- Errors are thrown immediately and **not cached**, so failed calls can be retried.
- `bypass` only skips reading from the cache — the fresh result is still stored back into the cache store.

## See also

- [Memoize](./Memoize.md) — short-lived deduplication for calls happening within the same execution burst.
