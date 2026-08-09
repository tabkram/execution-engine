# `@engine` and `@run`

The `@engine` class decorator attaches an [`ExecutionEngine`](./execution-engine.md) to each class instance, and the
`@run` method decorator sends selected methods through it. Callers still invoke those methods normally and receive
their original return values.

Use `EngineTask` to declare the injected `engine` property to TypeScript. This API requires classes you can decorate
and `experimentalDecorators` enabled.

## Usage

### The basic shape

```ts
import { engine, run, EngineTask } from 'execution-engine';

@engine({ id: 'uniqueEngineId' })
class MyClass extends EngineTask {
  @run()
  myMethod1(param: string) {
    return `result1 for ${param}`;
  }

  @run()
  async myMethod2(param: string) {
    return `result2 for ${param}`;
  }
}

const myInstance = new MyClass();

myInstance.myMethod1('param1');       // "result1 for param1"
await myInstance.myMethod2('param2'); // "result2 for param2"

console.log(myInstance.engine.getTrace());
```

Three things to notice:

1. Extending `EngineTask` makes the injected `engine` property type-safe.
2. Decorated methods return their own value, not an `ExecutionTrace`. The decorator unwraps the `outputs` returned by
   [`TraceableEngine.run()`](./traceable-engine.md#run).
3. The trace is read afterwards from `this.engine`.

### Configuring a traced method

`@run` takes the same options as [`TraceableEngine.run()`](./traceable-engine.md#run):

```ts
class WeatherTask extends EngineTask {
  @run({
    trace: { label: 'Decide whether to go out' },
    config: { parallel: true, errors: 'catch', traceExecution: true }
  })
  async decideIfIShouldGoOut(city: string) {
    /* … */
  }

  // Shorthand: pass just the `trace` part
  @run({ label: 'Validate decision' })
  validateDecision(decision: string) {
    return decision.includes('GREEN');
  }
}
```

Use `config.traceExecution` to redact or transform inputs, outputs, errors, and narratives. See
[Controlling what gets recorded](./trace.md#controlling-what-gets-recorded) for the extractor syntax.

### Sharing an engine across classes

`@engine({ id })` registers the engine under that id in a module-level registry. **Two classes decorated with the same
id share one engine and therefore one trace** — which is how you trace a workflow spanning several classes:

```ts
@engine({ id: 'checkout' })
class CartTask extends EngineTask { /* … */ }

@engine({ id: 'checkout' })
class PaymentTask extends EngineTask { /* … */ }

// Both contribute to the same graph
new CartTask().addItem(item);
new PaymentTask().charge(card);
```

Omit `id` and each instance gets its own engine.

## API

### `engine(options?)` {#engine}

A class decorator that attaches an `ExecutionEngine` to every instance of the class.

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string` | Identifier for the engine. Classes sharing an id share an engine and a trace. Omit for a per-instance engine. |

### `run(options?)` {#run}

A method decorator that routes the method through the engine's `run()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `TraceOptions<Array<any>, O>` or its `trace` part | Same options as [`TraceableEngine.run()`](./traceable-engine.md#run). |

The decorated method returns the original return value — the value for sync methods, a promise for async ones.

### `EngineTask`

An abstract base class declaring the engine reference:

```ts
abstract class EngineTask {
  engine: ExecutionEngine;
}
```

Extending it makes `this.engine` type-check inside your methods. At runtime, `@run` relies on the property installed by
`@engine`, not on the base class itself.

## Remarks

- **The decorator registry never releases engines.** A fixed `id` reuses one engine, so its trace grows until you call
  [`initTrace()`](./traceable-engine.md#inittrace). Omitting `id` gives each instance a fresh engine, but those engines
  are still retained by the module-level registry. Consider the direct class API for high-churn, long-running code.
- **`@run` needs `this.engine`**, so it only works on methods of a class decorated with `@engine`. On an
  undecorated class the property is undefined and the call fails.
- **Async detection is based on the `async` keyword.** A non-`async` method returning a promise is traced as
  synchronous, and its node closes before the promise settles. Declare `async`.
- **Methods receive the node data as a trailing argument**, exactly as with
  [`TraceableEngine.run()`](./traceable-engine.md#remarks).

## See also

- [ExecutionEngine](./execution-engine.md) — the engine these decorators attach.
- [Which API to use](../guide/which-api-to-use.md#run-or-run) — `run()` versus `@run`.
- [Getting Started](../guide/getting-started.md#requirements) — enabling `experimentalDecorators`.
