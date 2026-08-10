# Execution Engine Examples

Every file here runs on its own — `npx ts-node examples/<file>.ts` — and the ones that build a graph write their trace
next to themselves as JSON. The **Graph Results** links open that JSON in the
[json-to-graph viewer](https://tabkram.github.io/json-to-graph/).

The four marked **docs** are the ones shown on <https://tabkram.github.io/execution-engine/examples>, with their code
beside the run they produced.

## One function at a time

No engine and no graph: these wrap a single function and report what it did.

| Example Code                                 | Output                                     | |
|----------------------------------------------|--------------------------------------------|-------|
| [execution-trace.ts](execution-trace.ts)     | [execution-trace.json](execution-trace.json) | docs |
| [execution-cache.ts](execution-cache.ts)     | prints to the console                      | docs |
| [execution-memoize.ts](execution-memoize.ts) | prints to the console                      | docs |

- **[execution-trace.ts](execution-trace.ts)**: `executionTrace` around one call — inputs, outputs, timing, returned as
  a record.
- **[execution-cache.ts](execution-cache.ts)**: `@cache` keyed on the arguments; the repeat call never reaches the API.
- **[execution-memoize.ts](execution-memoize.ts)**: `@memoize` storing the in-flight promise, so twelve simultaneous
  callers share one execution.

## A run as a graph

| Example Code                                 | Trace Output                                     | Trace Graph                                                                                                                                                     | |
|----------------------------------------------|--------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|------|
| [engine-checkout.ts](engine-checkout.ts)     | [engine-checkout.json](engine-checkout.json)     | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/engine-checkout.json)     | docs |
| [engine-sequential.ts](engine-sequential.ts) | [engine-sequential.json](engine-sequential.json) | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/engine-sequential.json)   |      |
| [engine-recursive.ts](engine-recursive.ts)   | [engine-recursive.json](engine-recursive.json)   | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/engine-recursive.json)     |      |
| [authentication.ts](authentication.ts)       | [authentication.json](authentication.json)       | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/authentication.json)       |      |
| [car.ts](car.ts)                             | [car.json](car.json)                             | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/car.json)                 |      |
| [usage.ts](usage.ts)                         | [usage.json](usage.json)                         | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage.json)               |      |

- **[engine-sequential.ts](engine-sequential.ts)**: the smallest graph there is — four plain functions called through
  `engine.run`, four nodes, three inferred edges.
- **[engine-checkout.ts](engine-checkout.ts)**: one checkout through `@engine` and `@run` that exercises everything at
  once — a chain, nesting, recursion, a `@cache` hit, a `@memoize`d call, and a fork and join at the top level.
- **[engine-recursive.ts](engine-recursive.ts)**: a dependency tree resolved by a method that calls itself, where
  `@memoize` means a package shared by three branches is walked once.
- **[usage.ts](usage.ts)**: the fundamentals of `ExecutionEngine` in a dozen lines.
- **[authentication.ts](authentication.ts)**: sequential execution, with a detailed trace for each step.
- **[car.ts](car.ts)**: orchestrating tasks both simultaneously and hierarchically.

## Decorator-based usage

- **[usage2.ts](usage2.ts)**: `@engine` and `@run` for a class-based approach.
- **[weather.ts](weather.ts)**: custom parameters and options through decorators, including error handling.
- **[usage3.ts](usage3.ts)**: a deep workflow with consecutive tasks.
- **[greeting.ts](greeting.ts)**: `traceOptions` through decorators — extracting and reshaping what gets recorded.

| Example Code                           | Trace Output                               | Trace Graph                                                                                                                                                 |
|----------------------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [usage2.ts](usage2.ts)                 | [usage2.json](usage2.json)                 | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage2.json)         |
| [usage3.ts](usage3.ts)                 | [usage3.json](usage3.json)                 | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage3.json)         |
| [weather.ts](weather.ts)               | [weather.json](weather.json)               | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/weather.json)        |
| [greeting.ts](greeting.ts)             | [greeting.json](greeting.json)             | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/greeting.json)       |
