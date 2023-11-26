# Execution Engine

 <a href="https://www.npmjs.com/package/execution-engine">
    <img src="https://img.shields.io/npm/v/execution-engine.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen" alt="execution-engine on npm" />
  </a>

Execution Engine is a TypeScript library that enables tracing and visualization of code execution workflows in projects
with multiple successive and embedded TypeScript modules. Gain insights into the dynamic sequence of code execution by
capturing detailed traces in JSON format, easily parseable into graphs.

## Features ✨

- **Code Tracing:** Trace the execution flow of TypeScript code in your project.
- **Visualization:** Generate JSON traces for clear visualization of code execution paths.
- **Versatile Integration:** Seamless integration with projects using TypeScript.

## Installation 📦

```bash
npm install execution-engine
```

## Usage 📚

- example:

```typescript
import { ExecutionEngine } from 'execution-engine';

const engine = new ExecutionEngine();

// for sync functions:
const result1 = engine.run((param1) => someResult, [param1Value]);
const function1Output = result1.outputs // The output value returned by the function.

// for async functions:
const result2 = await engine.run(async (param2) => someResult, [param2Value]);
const function2Output = result2.outputs // The output value returned by the function.

//Access the trace information:
const trace = engine.getTrace();
// trace is array containing nodes and edges of the execution trace
console.log('Trace:', trace);
```

- The `result` object has the following structure:

```typescript
result = {
  inputs: [
    param1Value,
    param2Value
  ],
  // An array containing the input values passed to the function.
  outputs: someResult,
  // The output value returned by the function.
  startTime: Date,
  // The start time of the function execution.
  endTime: Date,
  // The end time of the function execution.
  duration: number,
  // The duration of the function execution in milliseconds.
  // ...other properties depending on the configuration and trace options.
}
```

- The `trace` object has the following structure:

```typescript
trace = [
  {
    data: {
      id: function_uuid1,
      label: functionLabel1
      //... other properties of the "result1" of the executed function as mentioned above 
    },
    group: nodes
  },
  {
    data: {
      id: function_uuid2,
      label: functionLabel2
      //... other properties of the "result2" of the executed function as mentioned above
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

- The trace object structure is a JSON array object that can be visualized in the:
    - [json-to-graph online demo](https://tabkram.github.io/json-to-graph/)

## Examples 📘

For additional usage examples, please explore the *
*[/examples](https://github.com/tabkram/execution-engine/tree/main/examples)** directory in this repository.

You'll find a variety of scenarios showcasing the capabilities of Execution Engine.

## Changelog 📝

For a detailed list of changes, enhancements, and bug fixes, please refer to our [Changelog](CHANGELOG.md).

# Contributing 🤝

If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request.
Contributions are welcome!

Before getting started, please read our [Contribution Guidelines](CONTRIBUTING.md).

# Community 👥
Love `execution-engine` ? Give our repo a star ⭐ ⬆️.

# License 📄

This project is licensed under the MIT License - see the LICENSE file for details.
