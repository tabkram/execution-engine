# Execution Engine

[![execution-engine on npm](https://img.shields.io/npm/v/execution-engine.svg?logo=npm&label=NPM+package&color=limegreen)](https://www.npmjs.com/package/execution-engine)
[![npm](https://img.shields.io/npm/dm/execution-engine?color=limegreen)](https://www.npmjs.com/package/execution-engine)
[![install size](https://packagephobia.com/badge?p=execution-engine)](https://packagephobia.com/result?p=execution-engine)
[![Bundle size](https://img.shields.io/bundlephobia/min/execution-engine)](https://bundlephobia.com/result?p=execution-engine)
[![Coverage Status](https://coveralls.io/repos/github/tabkram/execution-engine/badge.svg?branch=main)](https://coveralls.io/github/tabkram/execution-engine?branch=main)
[![Dependencies](https://img.shields.io/librariesio/release/npm/execution-engine.svg)](https://www.npmjs.com/package/execution-engine)
[![Github repo](https://img.shields.io/badge/github-grey?logo=github)](https://github.com/tabkram/execution-engine)
[![GitHub Repo stars](https://img.shields.io/github/stars/tabkram/execution-engine?style=social)](https://github.com/tabkram/execution-engine/stargazers)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/documentation-grey?logo=githubpages&color=blue)](https://tabkram.github.io/execution-engine)
[![jsDocs.io](https://img.shields.io/badge/jsDocs.io-reference-blue)](https://www.jsdocs.io/package/execution-engine)

Execution Engine is a TypeScript library that enables tracing, visualization, and optimization of code execution
workflows. It provides tools to trace execution flow, manage caching, and optimize repeated computations, offering
insights through structured execution traces in JSON format.

## Features ✨

Features are divided into two main parts:

### 1. Execution:

- **Trace:** Capture detailed execution flow for debugging and analysis.
- **Cache:** Prevent redundant function executions by storing results temporarily.
- **Memoize:** Optimize repeated computations within the same execution call.

### 2. Engine:

- **Tracing:** Trace the execution flow of code within your project.
- **Timing:** Capture the timing of each executed function.
- **Visualization:** Generate traces in JSON format for clear and insightful visualization.
    - Easily parseable into graphs using tools like [json-to-graph online demo](https://tabkram.github.io/json-to-graph/).

## Installation 📦

Use [npm](https://www.npmjs.com/package/execution-engine) package manager:

```bash
npm install execution-engine
```

Or use the [yarn](https://yarnpkg.com/package?name=execution-engine) package manager:

```bash
yarn add execution-engine
```

## Usage 📚

---
### 1. Execution:

#### Example 1: Memoization with `@memoize`

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
console.log(calc.fibonacci(10));  // Calculates and stores result
console.log(calc.fibonacci(10));  // Reuses pending result, no recalculation
```

In this example, the `fibonacci` method is decorated with `@memoize`, meaning repeated calls with the same `n` will reuse the stored result instead of recalculating it.


#### Example 2: Caching Results with `@cache`

```typescript
import { cache } from "execution-engine";

class ExampleService {
  @cache({ ttl: 5000 })  // Store result for 5 seconds
  async fetchData(id: number): Promise<string> {
    console.log('Fetching data...');
    return `Data for ${id}`;
  }
}

const service = new ExampleService();
console.log(await service.fetchData(1));  // Fetches data and stores it
console.log(await service.fetchData(1));  // Reuses stored result (within ttl)
```

The `fetchData` method is decorated with `@cache`, storing the result for 5 seconds. Subsequent calls within that time reuse the stored result.

#### Example 3: Tracing with `@trace`

```typescript
import { trace } from "execution-engine";

class MathOperations {
  @trace(console.log)  // Trace the execution and log using console.log
  add(a: number, b: number): number {
    return a + b;
  }
}

const mathOps = new MathOperations();
console.log(mathOps.add(2, 3));  // Traces the 'add' method execution and logs it
```

In this example, `@trace`logs the method execution, including input parameters, output, timing, duration, start time, end time, and elapsed time.


---
### 2. Engine:

#### Example 1: Basic Usage

```typescript
import { ExecutionEngine } from "execution-engine";

const engine = new ExecutionEngine();

// for sync functions:
const res1 = engine.run((param) => `result1 for ${param}`, ['param1']);

// for async functions:
const res2 = await engine.run(async (param) => `result2 for ${param}`, [res1.outputs]);

// Retrieve the trace
const trace = engine.getTrace();
console.log('Trace:', trace);
```

You can:

- view the **complete code** in [examples/usage.ts](examples/usage.ts)
- inspect the **trace output** in [examples/usage.json](examples/usage.json).
- visualize the **trace graph** using the json-to-graph online
  tool. [→ See the result ←](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage.json)

#### Example 2: Usage with Decorators

```typescript
import { engine, run } from "execution-engine";

@engine({ id: "uniqueEngineId" })
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
myInstance.myMethod2("param1");
await myInstance.myMethod2("param2");

// Retrieve the trace
const trace = myInstance.engine.getTrace();
console.log("Trace:", trace);
```

You can:

- view the **complete code** in [examples/usage2.ts](examples/usage2.ts)
- inspect the **trace output** in [examples/usage2.json](examples/usage2.json)
- visualize the **trace graph** using the json-to-graph online
  tool. [→ See the result ←](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage2.json)

#### Understanding the Trace 🧭

The `trace` object is an array containing **nodes** and **edges**. It has the following structure:

```typescript
trace = [
  {
    data: {
      id: function_uuid1,
      label: "function"
      //... other properties of the result of the executed function as mentioned above 
    },
    group: nodes
  },
  {
    data: {
      id: function_uuid2,
      label: "function"
      //... other properties of the result of the executed function as mentioned above
    },
    group: nodes
  },
  {
    data: {
      id: function_uuid1 -> function_uuid2,
      source: function_uuid1,
      target: function_uuid2,
      parallel: false
    },
    group: edges
  }
];
```

#### Examples 📘

For additional usage examples, please explore the __[/examples](examples)__ directory in this repository.

You'll find a variety of scenarios showcasing the capabilities of Execution Engine.

## Documentation 📔

Explore the comprehensive __[documentation](https://tabkram.github.io/execution-engine)__ for this project.

## Changelog 📝

For a detailed list of changes, enhancements, and bug fixes, please refer to our [Changelog](CHANGELOG.md).

## Contributing 🤝

If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request.
Contributions are welcome!

Before getting started, please read our [Contribution Guidelines](CONTRIBUTING.md).

## Community 👥

Love `execution-engine` ? Give our repo a star ⭐ ⬆️.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
