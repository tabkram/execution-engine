# ExecutionEngine Class

The `ExecutionEngine` class extends the `TraceableExecution` class, inheriting traceability features and adding contextual execution capabilities. This class allows you to manage context, tags, and additional attributes associated with an execution, enhancing traceability in your applications.


## Usage

### Importing the Class

```typescript
import { ExecutionEngine } from 'your-package'; // Replace 'your-package' with the actual package name
```

### Creating an Instance

To create an instance of `ExecutionEngine`, use the constructor:

```typescript
const execution = new ExecutionEngine();
```

### Method Chaining

The class supports method chaining, allowing you to perform a sequence of operations fluently. Here's an example demonstrating method chaining:

```typescript
const execution = new ExecutionEngine()
  .setContext({ user: { name: 'John' } })
  .tag('initial')
  .tag('setup')
  .updateContext({ user: { age: 25, gender: 'male' } })
  .tag('updated')
  .updateContextAttribute('user', { additionalInfo: 'some info' })
  .tag('final');

const finalContext = execution.getContext();
console.log(finalContext);
```

### Context Management

You can manage the context using methods like `setContext`, `getContext`, `updateContext`, and `updateContextAttribute`. These methods allow you to set, retrieve, and update the execution context.

### Tags and Traceability

Use the `tag` method to add tags to the execution, enhancing traceability. The class inherits trace-related methods from the `TraceableExecution` class, providing a comprehensive view of the execution trace.

### Additional Options

The constructor supports additional options for initialization, such as specifying the execution date, ID, and additional attributes.

```typescript
const executionWithOptions = new ExecutionEngine({
  executionDate: new Date(),
  executionId: 'customId',
  additionalAttributes: { priority: 'high' },
});
```

## TraceableExecution Integration

The `ExecutionEngine` class extends the `TraceableExecution` class, inheriting methods for managing the execution trace. This integration provides a complete picture of the execution flow, including contextual information.

Additional details about the `TraceableExecution` class can be found in the [README.md](./trace/README.md) file.
