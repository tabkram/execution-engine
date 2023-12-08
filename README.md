# Execution Engine

[![execution-engine on npm](https://img.shields.io/npm/v/execution-engine.svg?logo=npm&label=NPM+package&color=limegreen)](https://www.npmjs.com/package/execution-engine)
![npm](https://img.shields.io/npm/dm/execution-engine?color=limegreen)
[![install size](https://packagephobia.com/badge?p=execution-engine)](https://packagephobia.com/result?p=execution-engine)
[![Github repo](https://img.shields.io/badge/github-grey?logo=github)](https://github.com/tabkram/execution-engine)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/documentation-grey?logo=githubpages&color=blue)](https://tabkram.github.io/execution-engine)

Execution Engine is a TypeScript library that enables tracing and visualization of code execution workflows in your
project. Gain insights into the dynamic sequence of code execution by
capturing detailed traces in JSON format, easily parseable into graphs.

## Features ✨

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

- example:

```typescript
import { ExecutionEngine } from "execution-engine";

const engine = new ExecutionEngine();

// for sync functions:
const result1 = engine.run((param) => `result1 for ${param}`, ['param1']);

// for async functions:
const result2 = await engine.run(async (param) => `result2 for ${param}`, [result1.outputs]);

// Retrieve the trace
const trace = engine.getTrace();
console.log('Trace:', trace);
```

- The `result` object contains function output (`outputs`), input parameters (`inputs`), and other attributes related to
  the engine. It has the following structure:

```typescript
result = {
  // An array containing the input values passed to thunction:
  inputs: [
    "param1"
  ],
  // The output value returned by the function:
  outputs: "result1 for param1",
  // The start time of the function execution:
  startTime: Date,
  // The end time of the function execution:
  endTime: Date,
  // The duration of the function execution in milliseconds:
  duration: number,
  // ...other properties depending on the configuration and trace options.
}
```

- The `trace` object is an array containing **nodes** and **edges**. It has the following structure:

```typescript
trace = [
  {
    data: {
      id: function_uuid1,
      label: "function"
      //... other properties of the "result1" of the executed function as mentioned above 
    },
    group: nodes
  },
  {
    data: {
      id: function_uuid2,
      label: "function"
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

- Visualize the `trace` object using the json-to-graph online tool. [→ See the result ←](https://tabkram.github.io/json-to-graph/?data=https://raw.githubusercontent.com/tabkram/execution-engine/main/examples/usage.json)

You can view the complete code in [examples/usage.ts](examples/usage.ts) and inspect the entire trace output
in [examples/usage.json](examples/usage.json).

## Examples 📘

For additional usage examples, please explore the __[/examples](examples)__ directory in this repository.

You'll find a variety of scenarios showcasing the capabilities of Execution Engine.

## Documentation 📔

Explore the comprehensive __[documentation](https://tabkram.github.io/execution-engine)__ for this project.

## Changelog 📝

For a detailed list of changes, enhancements, and bug fixes, please refer to our [Changelog](CHANGELOG.md).

# Contributing 🤝

If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request.
Contributions are welcome!

Before getting started, please read our [Contribution Guidelines](CONTRIBUTING.md).

# Community 👥

Love `execution-engine` ? Give our repo a star ⭐ ⬆️.

# License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
