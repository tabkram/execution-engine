import { execute } from './execute';
import { memoizationDefaultTTL, memoizationKey, memoizationMaxTTL, MemoizeOptions } from '../common/models/executionMemoization.model';
import { generateHashId } from '../common/utils/crypto';
import { extractFunctionMetadata } from '../common/utils/functionMetadata';

export function executeMemoize<O>(
  blockFunction: (...params: unknown[]) => Promise<O>,
  inputs?: Array<unknown>,
  options?: MemoizeOptions<O>
): Promise<Awaited<O>>;

export function executeMemoize<O>(
  blockFunction: (...params: unknown[]) => O,
  inputs?: Array<unknown>,
  options?: MemoizeOptions<O>
): O;

/**
 * Executes a function with memoization to prevent redundant executions.
 * The result is stored temporarily and cleared after a short delay.
 *
 * @param blockFunction - The function to execute and memoize.
 * @param inputs - Arguments used to generate a unique memoization key.
 * @param options - Additional options.
 * @returns The memoized result or a newly computed value.
 *
 * @remarks
 * The JavaScript engine may clear the memoized value before another call retrieves it.
 * A short delay (e.g., 100ms) ensures that multiple rapid calls can reuse the stored result.
 * The expiration is capped at 1000ms for efficiency and to avoid unnecessary memory usage.
 */
export function executeMemoize<O>(
  blockFunction: (...params: unknown[]) => O | Promise<O>,
  inputs: Array<unknown> = [],
  options: MemoizeOptions<O>
): Promise<O> | O {
  const ttl = Math.min(options.ttl ?? memoizationDefaultTTL, memoizationMaxTTL); // Default short delay and Prevent excessive retention
  const memoizationFullStore: Map<string, Map<string, Promise<O> | O>> = (this[memoizationKey] ??= new Map<
    string,
    Map<string, Promise<O> | O>
  >());
  const memoizationStore = memoizationFullStore.get(options.functionId) ?? new Map<string, Promise<O> | O>();
  const inputsHash = generateHashId(...inputs);
  const memoizedValue = memoizationStore.get(inputsHash);

  if (typeof options.onMemoizeEvent === 'function') {
    const functionMetadata = extractFunctionMetadata(blockFunction);
    options.onMemoizeEvent({ metadata: functionMetadata, inputsHash, isMemoized: !!memoizedValue, value: memoizedValue });
  }

  if (memoizedValue) {
    return memoizedValue;
  } else {
    const callResponseOrPromise = (execute.bind(this) as typeof execute)(
      blockFunction.bind(this) as typeof blockFunction,
      inputs,
      [],
      (res) => res,
      (error) => {
        throw error;
      }
    );
    memoizationStore.set(inputsHash, callResponseOrPromise);
    this[memoizationKey].set(options.functionId, memoizationStore);

    if (callResponseOrPromise instanceof Promise) {
      return callResponseOrPromise.finally(() => setTimeout(() => memoizationStore.delete(inputsHash), ttl));
    } else {
      setTimeout(() => memoizationStore.delete(inputsHash), ttl);
      return callResponseOrPromise;
    }
  }
}
