# ExecutionEngine

The `ExecutionEngine` class extends the [`TraceableExecution`](./TraceableExecution.md) class, inheriting traceability
features and adding contextual execution capabilities.

## Usage

### Importing the Class

```typescript
import { ExecutionEngine } from "execution-engine";
```

### Creating an Instance

To create an instance of `ExecutionEngine`, use the constructor:

```typescript
const execution = new ExecutionEngine();
```

The constructor supports a custom `options` argument for initialization, allowing you to specify the execution date, ID, and an initial trace.
```typescript
const executionWithOptions = new ExecutionEngine({
  executionDate: new Date(),
  executionId: "customId",
  initialTrace: [] // Initial trace can be provided to continue tracing based on it
});
```

> The `initialTrace` parameter is a JSON trace for initializing tracing. It lets you start from a predefined state instead of an empty trace, facilitating the continuation of tracing based on the provided data.

### Method Chaining

The class supports method chaining, allowing you to perform a sequence of operations fluently. Here's an example
demonstrating method chaining:

```typescript
const execution = new ExecutionEngine()
  .setContext({ user: { name: 'John' } })
  .updateContext({ user: { age: 25, gender: 'male' } })
  .updateContextAttribute('user', { additionalInfo: 'some info' })
  .setContext({ tag: 'example' });

const finalContext = execution.getContext();
console.log(finalContext);
```

### Context Management

You can manage the context using methods like `setContext`, `getContext`, `updateContext`, and `updateContextAttribute`.
These methods allow you to set, retrieve, and update the execution context.

# API

## Constructor

### `constructor(options?: ExecutionEngineOptions)`

Creates an instance of `ExecutionEngine`.

- `options` (optional): Options for initializing the execution.
    - `executionDate` (optional): Date of the execution.
    - `executionId` (optional): Unique identifier for the execution.
    - `initialTrace` (optional): The initial trace for the execution.

## Methods

### `setContext(value: CXT): ExecutionEngine`

Sets the context of the execution.

- `value`: The context object.

Returns the updated instance of `ExecutionEngine`.

### `getContext(): CXT`

Gets the context of the execution.

Returns the context object.

### `updateContext(partialContext: Partial<CXT>): ExecutionEngine`

Updates the context of the execution with partial information.

- `partialContext`: Partial context information to update.

Returns the updated instance of `ExecutionEngine`.

### `updateContextAttribute<K extends keyof CXT>(key: K, partialContextAttribute: CXT[K]): ExecutionEngine`

Updates a specific attribute of the context object.

- `key`: The key of the attribute to update.
- `partialContextAttribute`: Partial information to update for the attribute.

Returns the updated instance of `ExecutionEngine`.

## Additional Information

### [TraceableExecution](./TraceableExecution.md) Integration

The `ExecutionEngine` class extends the [`TraceableExecution`](./TraceableExecution.md) class, inheriting methods for
managing the execution trace.
This integration provides a complete picture of the execution flow, including contextual information.

Note: This documentation is a basic overview. For detailed information on each method's parameters and return types,
refer to the TypeScript source code.
