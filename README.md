# Execution Engine

Execution Engine is a TypeScript library that enables tracing and visualization of code execution workflows in projects with multiple successive and embedded TypeScript modules. Gain insights into the dynamic sequence of code execution by capturing detailed traces in JSON format, easily parseable into graphs.

## Features ✨

- **Code Tracing:** Trace the execution flow of TypeScript code in your project.
- **Visualization:** Generate JSON traces for clear visualization of code execution paths.
- **Versatile Integration:** Seamless integration with projects using TypeScript.

## Installation 📦

```bash
npm install execution-engine
```

## Usage 📚

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
console.log('Trace:', trace);
```

# Contributing 🤝
If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request. Contributions are welcome!

# License 📄
This project is licensed under the MIT License - see the LICENSE file for details.
