# Execution Engine API Documentation

A TypeScript library for tracing and visualizing code execution workflows

[![Github repo](https://img.shields.io/badge/github-grey?logo=github)](https://github.com/tabkram/execution-engine)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Table of Contents

- [Installation](#installation-)
- [Components](#components-)
    - [ExecutionTimer](#executiontimer)
    - [TraceableEngine](#traceableengine)
    - [ExecutionEngine](#executionengine)
    - [EngineTask with @engine and @run Decorators](#enginetask-with-engine-and-run-decorators)

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

### Example 1: Basic Usage

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

- view the **complete code** in [usage.ts](https://github.com/tabkram/execution-engine/blob/main/examples/usage.ts)
- inspect the **trace output**
  in [usage.json](https://github.com/tabkram/execution-engine/blob/main/examples/usage.json).
- visualize the **trace graph** using the json-to-graph online
  tool. [→ See the result ←](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage.json)

### Example 2: Usage with Decorators

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

- view the **complete code** in [usage2.ts](https://github.com/tabkram/execution-engine/blob/main/examples/usage2.ts)
- inspect the **trace output**
  in [usage2.json](https://github.com/tabkram/execution-engine/blob/main/examples/usage2.json)
- visualize the **trace graph** using the json-to-graph online
  tool. [→ See the result ←](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage2.json)

## Components 🧩

### ExecutionTimer

The __[ExecutionTimer](./ExecutionTimer.md)__ is a simple class for measuring the execution time of code blocks.

### TraceableEngine

> **⚠️ Deprecation Notice:**
> - ~~`TraceableExecution`~~  is deprecated and will be removed in a future release. Use `TraceableEngine` instead.

The __[TraceableEngine](./TraceableEngine.md)__ class provides a framework for providing traceable engine and trace the execution of functions.

### ExecutionEngine

The __[ExecutionEngine](./ExecutionEngine.md)__ enhances traceable execution by introducing a context object (`CXT`) for
capturing additional relevant information.
It builds upon the functionality of [TraceableEngine](./TraceableEngine.md).

### EngineTask with @engine and @run Decorators

The __[EngineTask](./EngineTask.md)__ class works in conjunction with the `@engine` decorator and the `@run` decorator
to integrate the ExecutionEngine into your classes, providing tracing capabilities for methods.

For more details and usage examples, refer to the source code in __[EngineTask](./EngineTask.md)__.

