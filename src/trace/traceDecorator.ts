import { executionTrace, TraceContext } from './trace';
import { extractFunctionMetadata } from '../common/utils/functionMetadata';
import { isAsync } from '../common/utils/isAsync';

/**
 * Method decorator to trace function execution, capturing metadata, inputs, outputs, and errors.
 *
 * @param traceHandler - handle function of the trace context.
 * @param additionalContext - Additional metadata to attach to the trace context.
 * @param options - Configuration options:
 *   - `contextKey`: Key to store trace context on the instance.
 *   - `errorStrategy`: Determines whether errors should be caught (`'catch'`) or thrown (`'throw'`).
 *
 * @returns A method decorator that wraps the original function with execution tracing.
 */
export function trace<O>(
  traceHandler: (traceContext: TraceContext<O>) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalContext: Record<string, any> = {},
  options: { contextKey?: string; errorStrategy?: 'catch' | 'throw' } = {
    contextKey: undefined,
    errorStrategy: 'throw'
  }
): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const thisTraceContext = {
        metadata: {
          class: target.constructor.name,
          method: propertyKey,
          ...extractFunctionMetadata(originalMethod)
        },
        ...additionalContext
      };
      if (options.contextKey) {
        this[options.contextKey] = thisTraceContext;
      }
      if (isAsync(originalMethod)) {
        return (executionTrace.bind(this) as typeof executionTrace<O>)(
          originalMethod.bind(this),
          args,
          (traceContext) => {
            return traceHandler({ ...traceContext, ...thisTraceContext });
          },
          options
        )?.then((r) => options?.errorStrategy === 'catch' ? r.errors : r.outputs);
      } else {
        const result = (executionTrace.bind(this) as typeof executionTrace<O>)(
          originalMethod.bind(this) as () => O,
          args,
          (traceContext) => {
            return traceHandler({ ...traceContext, ...thisTraceContext });
          },
          options
        );
        if (result instanceof Promise) {
          return result.then((r) => options?.errorStrategy === 'catch' ? r.errors : r.outputs);
        }
        return result?.outputs;

      }
    };
  };
}
