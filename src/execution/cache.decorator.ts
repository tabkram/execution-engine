import { executeCache } from './cache';
import { CacheOptions } from '../common/models/executionCache.model';
import { FunctionMetadata } from '../common/models/executionFunction.model';
import { attachFunctionMetadata, extractClassMethodMetadata } from '../common/utils/functionMetadata';

/**
 * Caches method results to avoid redundant executions.
 *
 * @param options - Caching configuration specifying TTL, cache key generation, cache management, and optional logging.
 * @returns A method decorator that applies caching logic.
 *
 * @remarks
 * Uses `executeCache` to store results based on a unique key.
 * Cache behavior can be customized via `cacheKeyResolver`, `ttl`, and `cacheHandler`.
 */
export function cache(options: CacheOptions): MethodDecorator {
  return function <T extends Record<string, unknown>>(target: T, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]): ReturnType<typeof originalMethod> {
      const thisMethodMetadata: FunctionMetadata = extractClassMethodMetadata(target.constructor.name, propertyKey, originalMethod);
      return (executeCache.bind(this) as typeof executeCache)(originalMethod.bind(this), args, {
        functionId: thisMethodMetadata.methodSignature as string,
        ...options,
        cacheKeyResolver: attachFunctionMetadata.bind(this)(options.cacheKeyResolver, thisMethodMetadata),
        ttl: attachFunctionMetadata.bind(this)(options.ttl, thisMethodMetadata),
        cacheHandler: attachFunctionMetadata.bind(this)(options.cacheHandler, thisMethodMetadata)
      });
    };
  };
}
