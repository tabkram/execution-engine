import { FunctionMetadata } from './executionFunction.model';

/**
 * Interface for a cache store that provides methods to interact with cached data.
 */
export interface CacheStore {
  /** Stores a key/value pair in the cache. TTL is in milliseconds.*/
  set<T>(key: string, value: T, ttl?: number): Promise<T>;

  /** Retrieves a value from the cache by key. */
  get<T>(key: string): Promise<T | undefined> | T | undefined;
}

/**
 * Represents the context of a cache function execution, providing details such as metadata, inputs, cache status, and value.
 */
export interface CacheContext<O = unknown> {
  /** Metadata associated with the function being executed. */
  metadata: FunctionMetadata;

  /** The inputs passed to the function. */
  inputs: Array<unknown>;

  /** The hash representing the combination of inputs. */
  inputsHash: string;

  /** The time-to-live (TTL) for the cache entry. */
  ttl: number;

  /** Flag indicating whether the value is cached. */
  isCached: boolean;

  /** The cached value, if any. */
  value?: O;
}

/**
 * Type representing a function that computes the time-to-live (TTL) for cached items based on metadata and inputs.
 * @returns The TTL value in milliseconds.
 */
export type TtlFunction = (params: { metadata: FunctionMetadata; inputs: unknown[] }) => number;

/**
 * A handler function that processes the cache context.
 */
export type CacheHandler<O> = (info: CacheContext<O>) => void;

/**
 * Configuration options for caching behavior.
 */
export interface CacheOptions<O = unknown> {
  /** Unique identifier for the function being memoized. */
  functionId?: string;

  /** Time-to-live (TTL) for cache items. Can be static (number) or dynamic (function that returns a number). */
  ttl: number | TtlFunction;

  /** Function to generate a custom cache key based on method metadata and arguments. */
  cacheKeyResolver?: (params: { metadata: FunctionMetadata; inputs: unknown[] }) => string;

  /** The cache provider or manager used for storing the cache (e.g., in-memory or Redis). */
  cacheManager?: CacheStore | ((...args: unknown[]) => CacheStore);

  /**
   * Optionally defines a callback to handle cache operations.
   * This function is called during cache events, providing all cache information in a CacheContext.
   * It allows customization or additional actions based on the caching behavior.
   */
  cacheHandler?: CacheHandler<O>;
}
