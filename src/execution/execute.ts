import { extractFunctionMetadata } from '../common/utils/functionMetadata';
import { isAsync } from '../common/utils/isAsync';

// Overload for synchronous blockFunction returning OUTPUT
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => OUTPUT,
  inputs: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT) => RESPONSE,
  errorCallback?: (error: unknown) => ERROR,
  options?: { contextKey: string }
): RESPONSE;

// Overload for asynchronous blockFunction returning Promise<OUTPUT>
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => Promise<OUTPUT>,
  inputs?: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT) => RESPONSE,
  errorCallback?: (error: unknown) => ERROR,
  options?: { contextKey: string }
): Promise<RESPONSE>;

/**
 * Executes a given function (`blockFunction`) with the provided inputs and optional extra inputs.
 * Supports both synchronous and asynchronous functions, with optional success and error callbacks.
 *
 * @template INPUT - A tuple type representing the expected parameters of `blockFunction`.
 * @template OUTPUT - The return type of `blockFunction`, which can be either synchronous (`OUTPUT`) or a `Promise<OUTPUT>`.
 * @template RESPONSE - The type returned by `successCallback` (if provided), otherwise defaults to `OUTPUT`.
 * @template ERROR - The type returned by `errorCallback` (if provided), otherwise defaults to `RESPONSE`.
 *
 * @param blockFunction - The function to execute, which may be synchronous or asynchronous.
 * @param inputs - The primary set of inputs passed to `blockFunction`. Defaults to an empty tuple.
 * @param extraInputs - Additional arguments appended to `inputs` when calling `blockFunction`. Defaults to an empty array.
 * @param successCallback - An optional function that transforms the successful output of `blockFunction`.
 * @param errorCallback - An optional function that transforms or handles errors from `blockFunction`.
 * @param options - Configuration object:
 *   - `contextKey` (string) - The key under which execution metadata is stored in the `this` context.
 *
 * @throws {Error} If insufficient parameters are provided to `blockFunction`, making proper tracing impossible.
 *
 * @returns Either:
 * - `RESPONSE` if `blockFunction` is synchronous.
 * - `Promise<RESPONSE>` if `blockFunction` is asynchronous.
 * - `ERROR` or `Promise<ERROR>` if an error occurs and `errorCallback` is provided.
 */
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => OUTPUT | Promise<OUTPUT>,
  inputs: INPUT = [] as INPUT,
  extraInputs: unknown[] = [],
  successCallback?: (output: OUTPUT) => RESPONSE,
  errorCallback?: (error: unknown) => ERROR,
  options?: { contextKey: string }
): RESPONSE | Promise<RESPONSE> | ERROR | Promise<ERROR> {
  const functionMetadata = extractFunctionMetadata(blockFunction);
  if (blockFunction.length > inputs.length + extraInputs.length) {
    const paramNames = extraInputs.length ? functionMetadata.parameters.slice(0, -extraInputs.length) : functionMetadata.parameters;
    throw new Error(`Could not trace your function properly if you don't provide parameters: (${paramNames})`);
  }

  if (this && options?.contextKey) {
    this[options.contextKey] = { metadata: functionMetadata, ...this[options.contextKey] };
  }

  if (isAsync(blockFunction)) {
    return blockFunction
      .bind(this)(...inputs, ...extraInputs)
      .then((output: OUTPUT) => (successCallback ? successCallback(output) : (output as unknown as RESPONSE)))
      .catch((error) => (errorCallback ? errorCallback(error) : error));
  } else {
    try {
      const result = blockFunction.bind(this)(...inputs, ...extraInputs);
      if (result instanceof Promise) {
        return result
          .then((output: OUTPUT) => (successCallback ? successCallback(output) : (output as unknown as RESPONSE)))
          .catch((error) => (errorCallback ? errorCallback(error) : error));
      }
      return successCallback ? successCallback(result) : (result as unknown as RESPONSE);
    } catch (error) {
      return errorCallback ? errorCallback(error) : error;
    }
  }
}
