import { execute } from './execute';
import { CacheOptions, CacheStore } from '../common/models/executionCache.model';
import { generateHashId } from '../common/utils/crypto';
import { extractFunctionMetadata } from '../common/utils/functionMetadata';
import { MapCacheStore } from '../common/utils/mapStore';

export const cacheStoreKey = Symbol('execution-engine/cache');

/**
 * Caches function results to avoid redundant expensive computations
 * If the result is already cached, it returns the cached value; otherwise, it executes the function and stores the result.
 *
 * This is useful for optimizing expensive computations or API calls by reducing duplicate executions.
 * @remarks
 * - Errors are thrown immediately and **not cached** to allow retries.
 */
export async function executeCache<O>(
  blockFunction: (...params: unknown[]) => O | Promise<O>,
  inputs: Array<unknown> = [],
  options: CacheOptions & { functionId: string }
): Promise<Promise<O> | O> {
  const functionMetadata = extractFunctionMetadata(blockFunction);
  const cacheKey = options.cacheKey?.({ metadata: functionMetadata, inputs }) ?? generateHashId(...inputs);
  const bypass = typeof options.bypass === 'function' && !!options.bypass?.({ metadata: functionMetadata, inputs });
  const ttl = typeof options.ttl === 'function' ? options.ttl({ metadata: functionMetadata, inputs }) : options.ttl;
  let cacheStore: CacheStore | MapCacheStore<O>;

  if (options.cacheManager) {
    cacheStore = typeof options.cacheManager === 'function' ? options.cacheManager(this) : options.cacheManager;
  } else {
    cacheStore = new MapCacheStore<O>(this[cacheStoreKey], options.functionId);
  }
  const cachedValue: O | undefined = (await cacheStore.get(cacheKey)) as O;

  if (typeof options.onCacheEvent === 'function') {
    options.onCacheEvent({
      ttl,
      metadata: functionMetadata,
      inputs,
      cacheKey,
      isBypassed: !!bypass,
      isCached: !!cachedValue,
      value: cachedValue
    });
  }

  if (!bypass && cachedValue) {
    return cachedValue;
  } else {
    return (execute.bind(this) as typeof execute)(
      blockFunction.bind(this) as typeof blockFunction,
      inputs,
      [],
      (res) => {
        cacheStore.set(cacheKey, res as O, ttl);
        if ((cacheStore as MapCacheStore<O>).fullStorage) {
          this[cacheStoreKey] = (cacheStore as MapCacheStore<O>).fullStorage;
        }
        return res;
      },
      (error) => {
        throw error;
      }
    );
  }
}
