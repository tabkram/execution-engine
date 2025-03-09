import { executeMemoize } from './memoize';
import { FunctionMetadata } from '../common/models/executionFunction.model';
import { MemoizationHandler } from '../common/models/executionMemoization.model';
import { extractClassMethodMetadata } from '../common/utils/functionMetadata';

/**
 * Decorator to memoize method executions and prevent redundant calls.
 *
 * @param memoizationHandler - Optional callback triggered after checking memory
 * @param expirationMs  - Duration (in milliseconds) before clearing the stored result,
 *                                capped at 1000ms to prevent excessive retention.
 * @returns A method decorator for applying memoization.
 *
 * @remarks
 * Uses `executeMemoize` internally to store and reuse results.
 * A short delay (e.g., 100ms) ensures that multiple rapid calls can reuse the stored result.
 */
export function memoize<O>(memoizationHandler?: MemoizationHandler<O>, expirationMs?: number): MethodDecorator {
  return function <T extends Record<string, unknown>>(target: T, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]): ReturnType<typeof originalMethod> {
      const thisMethodMetadata: FunctionMetadata = extractClassMethodMetadata(target.constructor.name, propertyKey, originalMethod);
      return (executeMemoize.bind(this) as typeof executeMemoize<O>)(originalMethod.bind(this), args, {
        functionId: thisMethodMetadata.methodSignature,
        memoizationHandler:
          typeof memoizationHandler === 'function'
            ? (memoContext): ReturnType<typeof memoizationHandler> => {
              return (memoizationHandler.bind(this) as typeof memoizationHandler)({
                ...memoContext,
                metadata: thisMethodMetadata
              });
            }
            : undefined,
        expirationMs
      });
    };
  };
}
