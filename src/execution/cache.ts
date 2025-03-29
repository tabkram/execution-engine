import { execute } from './execute';
import { CacheOptions, CacheStore } from '../common/models/executionCache.model';
import { generateHashId } from '../common/utils/crypto';
import { extractFunctionMetadata } from '../common/utils/functionMetadata';
import { MapCacheStore } from '../common/utils/mapStore';

export const cacheStoreKey = Symbol('execution-engine/cache');

/**
 * Executes a function with cache to prevent redundant executions.
 * The result is stored temporarily and cleared after a short delay.
 */
export async function executeCache<O>(
  blockFunction: (...params: unknown[]) => O | Promise<O>,
  inputs: Array<unknown> = [],
  options: CacheOptions & { functionId: string }
): Promise<Promise<O> | O> {
  const functionMetadata = extractFunctionMetadata(blockFunction);
  const inputsHash =
    options.cacheKeyResolver?.({
      metadata: functionMetadata,
      inputs
    }) ?? options.functionId + generateHashId(...inputs);
  const expirationMs = typeof options.ttl === 'function' ? options.ttl({ metadata: functionMetadata, inputs }) : options.ttl;

  if (!expirationMs) {
    if (typeof options.cacheHandler === 'function') {
      options.cacheHandler({ ttl: expirationMs, metadata: functionMetadata, inputs, inputsHash, isCached: false });
    }
    return (execute.bind(this) as typeof execute)(
      blockFunction.bind(this) as typeof blockFunction,
      inputs,
      [],
      (res) => res,
      (error) => {
        throw error;
      }
    );
  }


  let cacheStore: CacheStore | MapCacheStore<O> = new MapCacheStore<O>(this[cacheStoreKey], options.functionId);
  if (options.cacheManager) {
    cacheStore = typeof options.cacheManager === 'function' ? options.cacheManager(this) : options.cacheManager;
  }
  const cachedValue: O = (await cacheStore.get(inputsHash)) as O;

  if (typeof options.cacheHandler === 'function') {
    options.cacheHandler({
      ttl: expirationMs,
      metadata: functionMetadata,
      inputs,
      inputsHash,
      isCached: !!cachedValue,
      value: cachedValue
    });
  }

  if (cachedValue) {
    return cachedValue;
  } else {
    return (execute.bind(this) as typeof execute)(
      blockFunction.bind(this) as typeof blockFunction,
      inputs,
      [],
      (res) => {
        cacheStore.set(inputsHash, res as O, expirationMs);
        if((cacheStore as MapCacheStore<O>).fullStorage) {
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
