import { FunctionMetadata } from './executionFunction.model';

export const memoizationKey = Symbol('execution-engine/memoize');

/** Default expiration in milliseconds that ensures multiple rapid calls can reuse the stored result */
export const memoizationDefaultTTL = 100;
/** Maximum allowable expiration time in milliseconds to prevent excessive retention */
export const memoizationMaxTTL = 1000;

/**
 * Represents the context of a memoized function execution.
 */
export interface MemoizationContext <O> {
  metadata: FunctionMetadata;
  inputsHash: string;
  isMemoized: boolean;
  value?: Promise<O> | O;
}

export interface MemoizeOptions<O> {
  /** Unique identifier for the function being memoized */
  functionId: string;

  /**
   * Optional small expiration time in milliseconds for the memoized result.
   * @remarks:
   * Default is 100ms, capped at 1000ms to prevent excessive retention.
   */
  ttl?: number;

  /** Custom handler for memoization logic */
  onMemoizeEvent?: (info: MemoizationContext<O>) => void;
}
