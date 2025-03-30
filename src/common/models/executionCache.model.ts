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

  /** Unique key identifying the cache entry. */
  cacheKey: string;

  /** The time-to-live (TTL) for the cache entry. */
  ttl: number;

  /** Flag indicating whether the value is cached. */
  isCached: boolean;

  /** The cached value, if any. */
  value?: O;
}


/**
 * Configuration options for caching behavior.
 */
export interface CacheOptions<O = unknown> {
  /** Time-to-live (TTL) for cache items. Can be static (number) or dynamic (function that returns a number). */
  ttl: number | ((params: { metadata: FunctionMetadata; inputs: unknown[] }) => number);

  /** Function to generate a custom cache key based on method metadata and arguments. */
  cacheKey?: (params: { metadata: FunctionMetadata; inputs: unknown[] }) => string;

  /** The cache provider or manager used for storing the cache (e.g., in-memory or Redis). */
  cacheManager?: CacheStore | ((...args: unknown[]) => CacheStore);

  /**
   * Callback for handling cache events, providing full access to cache details via `CacheContext`.
   * allowing additional actions based on caching behavior.
   */
  onCacheEvent?: (info: CacheContext<O>) => void;
}
