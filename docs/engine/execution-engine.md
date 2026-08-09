# ExecutionEngine

`ExecutionEngine` is a [`TraceableEngine`](./traceable-engine.md) with two additions: mutable, typed context shared by
its traced calls, and identity for the execution as a whole. It uses the same `run()` method and produces the same
[Trace](./trace.md); choose it when several steps need to exchange state.

## Usage

### Creating an instance

```ts
import { ExecutionEngine } from 'execution-engine';

const engine = new ExecutionEngine();
```

The constructor accepts identity and a starting graph:

```ts
const engine = new ExecutionEngine({
  executionDate: new Date(),
  executionId: 'customId',
  initialTrace: [] // resume from a previously serialized trace
});

engine.getOptions(); // { executionDate: Date, executionId: string }
```

If you omit `executionId`, one is generated from the execution date and a UUID, in the form
`exec_20250808_151450118_9f1c…`.

### Typing the context

The context is generic. Give it a shape, then initialize it before reading it:

```ts
type CheckoutContext = {
  user: { id: string; plan: 'free' | 'pro' };
  cart: { total: number };
};

const engine = new ExecutionEngine<CheckoutContext>();

engine.setContext({ user: { id: 'u_42', plan: 'pro' }, cart: { total: 99 } });

const { user } = engine.getContext();
```

The constructor does not initialize context. Until `setContext()` or `updateContext()` is called, `getContext()` is
`undefined` at runtime even though its TypeScript return type is `CheckoutContext`.

### Managing the context

Use `setContext()` to replace the whole value, `updateContext()` to merge top-level fields, and
`updateContextAttribute()` to merge inside one field:

```ts
type ProfileContext = {
  user: { name?: string; age?: number };
  tag: string;
};

const profileEngine = new ExecutionEngine<ProfileContext>();
profileEngine.setContext({ user: { name: 'John' }, tag: 'a' });

// Shallow merge at the top level — `user` is replaced wholesale
profileEngine.updateContext({ user: { age: 25 } });
// → { user: { age: 25 }, tag: 'a' }

profileEngine.setContext({ user: { name: 'John' }, tag: 'a' });

// Merge *inside* one attribute — `name` survives
profileEngine.updateContextAttribute('user', { age: 25 });
// → { user: { name: 'John', age: 25 }, tag: 'a' }
```

All three write methods return the engine, so they can be chained. `setContext()` deep-clones its input; the update
methods keep the references they merge.

### Reading context from a traced step

Context is stored on the engine; it is not injected into function arguments. A step can read it when the engine is in
scope:

```ts
const checkoutEngine = new ExecutionEngine<CheckoutContext>().setContext({
  user: { id: 'u_42', plan: 'pro' },
  cart: { total: 99 }
});

async function applyDiscount(total: number) {
  const { user } = checkoutEngine.getContext();
  return user.plan === 'pro' ? total * 0.8 : total;
}

const discounted = (await checkoutEngine.run(applyDiscount, [99])).outputs;
```

## API

### `constructor(options?)` {#constructor}

| Option | Type | Description |
| --- | --- | --- |
| `executionDate` | `Date` | Date of the execution. Defaults to now. |
| `executionId` | `string` | Unique identifier. Auto-generated from the date and a UUID if omitted. |
| `initialTrace` | `EngineTrace` | A trace to continue from, instead of starting empty. |

### `getOptions()`

Returns `{ executionDate: Date; executionId: string }` for this engine instance.

### `setContext(value)` {#setcontext}

Replaces the entire context with a **deep clone** of `value`. Returns `this`.

### `getContext()`

Returns the current context object.

### `updateContext(partialContext)` {#updatecontext}

Shallow-merges `partialContext` into the context — top-level keys are replaced, not deep-merged. Returns `this`.

### `updateContextAttribute(key, partialContextAttribute)` {#updatecontextattribute}

Updates a single attribute. Primitives and `null` replace the existing value; anything else is shallow-merged into it.
Returns `this`.

### Inherited from `TraceableEngine`

`run()`, `getTrace()`, `getTraceNodes()`, `initTrace()`, `pushNarratives()`, `getNarratives()` — see
[TraceableEngine](./traceable-engine.md#api).

## Remarks

- **Keep context plain and serializable.** The `setContext()` cloner handles plain objects and arrays, but does not
  preserve `Date`, `Map`, `Set`, or class instances.
- **Use `updateContextAttribute()` for object-valued fields.** It spreads object inputs, so arrays become objects with
  numeric keys and a `Date` becomes `{}`. Replace those values with `updateContext()` or `setContext()` instead.
- **The context is not part of the trace.** `getTrace()` returns nodes and edges only; serialize `getContext()`
  separately if you need it alongside.

## See also

- [TraceableEngine](./traceable-engine.md) — the tracing behaviour this class builds on.
- [`@engine` and `@run`](./engine-run.md) — the same capabilities as class decorators.
- [Trace](./trace.md) — the structure of the graph produced here.
