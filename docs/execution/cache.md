# Cache

The `@cache` decorator and `executeCache` reuse a successful result until its time-to-live (TTL) expires. Use them
when completed results, such as API responses or expensive computations, can be shared across later calls.

The result is stored only after execution succeeds, so overlapping calls can still run more than once. To collapse
identical calls that are already in flight, use [`memoize`](./memoize.md).

## Usage

### `@cache` decorator

```ts
import { cache } from 'execution-engine';

class ExampleService {
  @cache({ ttl: 5000 }) // keep the result for 5 seconds
  async fetchData(id: number): Promise<string> {
    console.log('Fetching data…');
    return `Data for ${id}`;
  }
}

const service = new ExampleService();
await service.fetchData(1); // executes, then stores
await service.fetchData(1); // returns the stored value, no execution
```

By default, the key is a hash of the inputs. The decorator keeps its in-memory store on the class instance and
separates entries by method.

### Dynamic TTL

`ttl` may be a function when the lifetime depends on the call:

```ts
class PricingService {
  @cache({
    ttl: ({ inputs }) => (inputs[0] === 'enterprise' ? 60_000 : 5_000)
  })
  async getPricing(plan: string) {
    /* … */
  }
}
```

### Bypassing the cache

```ts
class ExampleService {
  @cache({
    ttl: 5000,
    bypass: () => process.env.NODE_ENV === 'test'
  })
  async fetchData(id: number): Promise<string> {
    return `Data for ${id}`;
  }
}
```

::: info Bypass affects reuse, not storage
`bypass` ignores the stored value and recomputes. A successful result is still written back for the next call.
:::

### Custom cache keys

When the default input hash is too coarse or too fine, compute the key yourself:

```ts
class UserService {
  @cache({
    ttl: 30_000,
    // Ignore the second argument entirely — only the user id identifies the entry
    cacheKey: ({ metadata, inputs }) => `${metadata.methodSignature}:${inputs[0]}`
  })
  async getUser(id: string, requestOptions?: RequestOptions) {
    /* … */
  }
}
```

### Custom cache store

Provide `cacheManager` to use any store implementing `get` and `set`. A shared external store such as Redis can make
entries available to multiple instances and processes:

```ts
import { CacheStore } from 'execution-engine';

const redisStore: CacheStore = {
  async get<T>(key: string) {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  },
  async set<T>(key: string, value: T, ttl?: number) {
    await redis.set(key, JSON.stringify(value), 'PX', ttl ?? 60_000);
    return value;
  }
};

class ExampleService {
  @cache({ ttl: 60_000, cacheManager: redisStore })
  async fetchData(id: number): Promise<string> {
    return `Data for ${id}`;
  }
}
```

### Observing cache activity

```ts
class ExampleService {
  @cache({
    ttl: 5000,
    onCacheEvent: ({ cacheKey, isCached, isBypassed, ttl }) => {
      metrics.increment(isCached && !isBypassed ? 'cache.hit' : 'cache.miss', { cacheKey });
    }
  })
  async fetchData(id: number) {
    /* … */
  }
}
```

`onCacheEvent` fires once per call after the lookup and before reuse or execution. A value is reused only when
`isCached === true` and `isBypassed === false`.

## API

### `cache(options)` {#cache-fn}

A method decorator applying caching to the decorated method.

| Option | Type | Description |
| --- | --- | --- |
| `ttl` | `number \| (params) => number` | **Required.** Entry lifetime in milliseconds, static or derived from `{ metadata, inputs }`. |
| `bypass` | `(params) => boolean` | Return `true` to ignore any stored value and recompute. Defaults to `false`. |
| `cacheKey` | `(params) => string` | Custom key. Defaults to a hash of the inputs. |
| `cacheManager` | `CacheStore \| (...args) => CacheStore` | Store or store factory implementing `get`/`set`. The factory receives the current `this` value. Defaults to an in-memory store scoped to it. |
| `onCacheEvent` | `(info: CacheContext<O>) => void` | Fired on every call with the full cache decision. |

`params` is always `{ metadata: FunctionMetadata; inputs: unknown[] }`.

### `executeCache(blockFunction, inputs?, options)` {#executecache}

The function behind `@cache`, for non-decorator use. It accepts the same options plus `functionId`:

| Option | Type | Description |
| --- | --- | --- |
| `functionId` | `string` | **Required.** Scopes the cache store to this function. The decorator derives it from the method signature; on your own you must supply it. |

The built-in store is attached to `this`, so give direct calls a stable scope object. Reuse that object to reuse its
entries:

```ts
import { executeCache } from 'execution-engine';

const cacheScope = {};
const data = await executeCache.call(cacheScope, fetchFromApi, [userId], {
  functionId: 'fetchFromApi',
  ttl: 10_000
});
```

**Returns** a `Promise` — `executeCache` is always asynchronous, even when `blockFunction` is synchronous.

### `CacheContext`

```ts
interface CacheContext<O = unknown> {
  metadata: FunctionMetadata;
  inputs: Array<unknown>;
  cacheKey: string;
  ttl: number;
  isBypassed: boolean;
  isCached: boolean;
  value?: O;
}
```

### `CacheStore`

```ts
interface CacheStore {
  set<T>(key: string, value: T, ttl?: number): Promise<T>;
  get<T>(key: string): Promise<T | undefined> | T | undefined;
}
```

## Remarks

- The TTL begins when a successful result is stored. Calls that throw or reject store nothing, so the next call
  retries.
- The lookup uses truthiness. Stored `0`, `''`, `false`, `null` and `undefined` are treated as misses regardless of
  the store; wrap a legitimate falsy result in an object when it must be reused.
- The default store is instance-local. Pass the same `cacheManager` to multiple instances when they need to share
  entries.

## See also

- [memoize](./memoize.md) — short-lived deduplication of concurrent identical calls.
- [Which API to use](../guide/which-api-to-use.md#cache-or-memoize) — a side-by-side comparison.
