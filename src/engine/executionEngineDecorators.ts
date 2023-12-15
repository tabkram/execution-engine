/* eslint-disable @typescript-eslint/no-explicit-any */
import { TraceOptions } from '../trace/trace.model';
import { ExecutionEngine } from './executionEngine';

// eslint-disable-next-line @typescript-eslint/ban-types
function isAsync(func: Function): boolean {
  return func.constructor.name === 'AsyncFunction';
}

const executionEngines: {
  [key: string]: ExecutionEngine;
} = {};

/**
 * Represents an abstract EngineTask with a reference to the ExecutionEngine.
 *
 * @abstract
 */
export abstract class EngineTask {
  engine: ExecutionEngine;
}

/**
 * A class decorator that enhances a class with execution engine capabilities.
 * @param options - Configuration options for the execution engine.
 */
export function engine(options?: { id: string }): ClassDecorator {
  /**
   * The actual decorator function.
   * @param target - The target class.
   */
  return (target: any) => {
    const originalConstructor = target;

    /**
     * A new constructor function that incorporates the execution engine.
     * @param args - Arguments passed to the constructor.
     */
    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);
      let executionId = options?.id;
      if (!executionId || !executionEngines[executionId]) {
        const engineInstance = new ExecutionEngine({ executionId: options?.id });
        executionId = engineInstance.getOptions().executionId;
        executionEngines[executionId] = engineInstance;
      }
      instance.engine = executionEngines[executionId];
      return instance;
    };

    // Optionally, you can copy prototype methods from the original constructor to the new one
    Object.setPrototypeOf(newConstructor, originalConstructor.prototype);

    // Return the new constructor
    return newConstructor;
  };
}

/**
 * A method decorator that enables tracing for the decorated method.
 * @param options - Trace options for the execution.
 * @returns A decorator function.
 */
export function run<O>(options?: TraceOptions<Array<any>, O>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store the original method
    const originalMethod = descriptor.value;

    // Modify the descriptor's value property
    descriptor.value = function (...args: any[]) {
      if (isAsync(originalMethod)) {
        return this.engine.run(originalMethod.bind(this), args, options)?.then((r) => r.outputs);
      } else {
        return this.engine.run(originalMethod.bind(this), args, options)?.outputs;
      }
    };

    return descriptor;
  };
}
