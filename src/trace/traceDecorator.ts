import { executionTrace as traceExecution } from './trace';
import { TraceOptions } from '../common/models/engineTraceOptions.model';
import { ExecutionTrace } from '../common/models/executionTrace.model';
import { isAsync } from '../common/utils/isAsync';


export function trace<O>(
  traceHandler?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traceContext: Record<string, any>,
    executionTrace: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
