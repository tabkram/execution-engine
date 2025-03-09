import { FunctionMetadata } from './executionFunction.model';

export const memoizationKey = Symbol('execution-engine/memoize');

/** Default expiration that ensures multiple rapid calls can reuse the stored result */
export const memoizationDefaultExpirationMs = 100;
/** Maximum allowable expiration time Prevent excessive retention */
export const memoizationMaxExpirationMs = 1000;

/**
 * Represents the context of a memoized function execution.
 */
export interface MemoizationContext <O> {
  metadata: FunctionMetadata;
  inputsHash: string;
  isMemoized: boolean;
  value?: Promise<O> | O;
}


/**
 * A handler function that processes the memoization context.
 */
export type MemoizationHandler<O> = (info: MemoizationContext<O>) => void;

export interface MemoizeOptions<O> {
  /** Unique identifier for the function being memoized */
  functionId: string;

  /**
   * Optional expiration time in milliseconds for the cached result.
   * Default is 100ms, capped at 1000ms to prevent excessive retention.
   */
  expirationMs?: number;

  /** Custom handler for memoization logic */
  memoizationHandler?: MemoizationHandler<O>;
}
