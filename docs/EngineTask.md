# EngineTask

The `EngineTask` class represents an abstract task with a reference to the `ExecutionEngine`. It serves as a base class for integrating execution engine capabilities into other classes.

## @engine Decorator

The `@engine` decorator enhances a class with execution engine capabilities. It takes a configuration object as an argument, allowing you to customize the behavior of the associated engine.

### Usage

```typescript
@engine({ id: "uniqueEngineId" })
class MyClass extends EngineTask {
  // Class implementation
}
```

#### Explanation

The `@engine` decorator is applied to a class to inject execution engine capabilities. The configuration object passed as an argument provides a unique identifier (`id`) for the associated engine. This allows multiple classes to use different engines, each with its own configuration.

## @run Decorator

The `@run` decorator enables tracing for decorated methods. It takes trace options as an optional argument, allowing you to fine-tune the tracing behavior.

### Usage

```typescript
class MyClass extends EngineTask {
  @run()
  myMethod1(param: string) {
    // Method implementation
  }

  @run()
  async myMethod2(param: string) {
    // Async method implementation
  }
```

#### Explanation

The `@run` decorator is applied to methods within a class to enable tracing for their executions. The optional trace options allow you to customize the tracing behavior for specific methods. For example, you can configure whether a method should be traced asynchronously or set additional options for the trace.

This section provides a detailed explanation of how to use the `@engine` and `@run` decorators along with the `EngineTask` class. By understanding the purpose and usage of these decorators, you can effectively integrate execution engine features and tracing into your TypeScript classes, tailoring them to the specific requirements of your project. Adjust the import statements and decorator parameters based on your actual implementation.