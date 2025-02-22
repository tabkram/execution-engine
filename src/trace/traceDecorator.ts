import { TraceOptions } from './models/engineTraceOptions.model';
import { ExecutionTrace } from './models/executionTrace.model';
import { trace as traceExecution } from './trace';
import { isAsync } from '../common/isAsync';


export function trace<O>(
  traceHandler?: (
    traceContext: Record<string, any>,
    executionTrace: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void,
  traceContext: Record<string, any> = {},
  errorStrategy: 'catch' | 'throw' = 'throw'
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): void {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      if (isAsync(originalMethod)) {
        return traceExecution<O>(originalMethod.bind(this), args, traceHandler, traceContext, errorStrategy)?.then((r) => r.outputs);
      } else {
        return traceExecution<O>(originalMethod.bind(this) as () => O, args, traceHandler, traceContext, errorStrategy)?.outputs;
      }
    };
  };
}
