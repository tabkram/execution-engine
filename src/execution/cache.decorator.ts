import { executeCache } from './cache';
import { CacheOptions } from '../common/models/executionCache.model';
import { FunctionMetadata } from '../common/models/executionFunction.model';
import { attachFunctionMetadata, extractClassMethodMetadata } from '../common/utils/functionMetadata';

/**
 * Caches function results to avoid redundant expensive computations
 * If the result is already cached, it returns the cached value; otherwise, it executes the function and stores the result.
 *
 * @param options - Caching configuration specifying TTL, cache key generation, cache management, and optional logging.
 * @returns A method decorator that applies caching logic.
 *
 * @remarks
 * - Cache behavior can be customized via `cacheKey`, `ttl`, and `cacheHandler`.
 * - Errors are thrown immediately and **not cached** to allow retries.
 */
export function cache(options: CacheOptions): MethodDecorator {
  return function <T extends Record<string, unknown>>(target: T, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]): ReturnType<typeof originalMethod> {
      const thisMethodMetadata: FunctionMetadata = extractClassMethodMetadata(target.constructor.name, propertyKey, originalMethod);
      return (executeCache.bind(this) as typeof executeCache)(originalMethod.bind(this), args, {
        functionId: thisMethodMetadata.methodSignature as string,
        ...options,
        cacheKey: attachFunctionMetadata.bind(this)(options.cacheKey, thisMethodMetadata),
        ttl: attachFunctionMetadata.bind(this)(options.ttl, thisMethodMetadata),
        onCacheEvent: attachFunctionMetadata.bind(this)(options.onCacheEvent, thisMethodMetadata)
      });
    };
  };
}
