# Execution Engine Examples

| Example Code                           | Trace Output                               | Trace Graph                                                                                                                                                 |
|----------------------------------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [authentication.ts](authentication.ts) | [authentication.json](authentication.json) | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/authentication.json) |
| [car.ts](car.ts)                       | [car.json](car.json)                       | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/car.json)            |
| [weather.ts](weather.ts)               | [weather.json](weather.json)               | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/weather.json)        |
| [usage.ts](usage.ts)                   | [usage.json](usage.json)                   | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage.json)          |
| [usage2.ts](usage2.ts)                 | [usage2.json](usage2.json)                 | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage2.json)         |
| [usage3.ts](usage2.ts)                 | [usage3.json](usage2.json)                 | [Graph Results](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage3.json)         |

### Basic Usage

- **[usage.ts](usage.ts)**: is a fundamental example of using the `ExecutionEngine`.

- **[authentication.ts](authentication.ts):** illustrates the sequential execution of functions, providing a detailed
  trace for each step of the workflow.

- **[car.ts](car.ts)**: an advanced example showcasing the ability to orchestrate intricate tasks simultaneously and
  hierarchically.

### Decorators-based Usage

- **[usage2.ts](usage2.ts)**: an alternative usage of the `ExecutionEngine` that illustrates the integration of
  decorators (`@engine` and `@run`) for a more organized and class-based approach.

- **[weather.ts](weather.ts)**: Advanced example with custom parameters, demonstrating the Execution Engine's
  versatility in handling complex workflows through decorators (`@engine` and `@run`) within TypeScript classes.

- **[usage3.ts](usage3.ts)**: example of a trace with a deep workflow and consecutive tasks.