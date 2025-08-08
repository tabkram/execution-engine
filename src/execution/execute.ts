import { isAsync } from '../common/utils/isAsync';

// Overload for synchronous blockFunction returning OUTPUT
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => OUTPUT,
  inputs: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT, isPromise: boolean) => RESPONSE,
  errorCallback?: (error: unknown, isPromise: boolean) => ERROR
): RESPONSE;

// Overload for asynchronous blockFunction returning Promise<OUTPUT>
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => Promise<OUTPUT>,
  inputs?: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT, isPromise: boolean) => RESPONSE,
  errorCallback?: (error: unknown, isPromise: boolean) => ERROR
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
  successCallback?: (output: OUTPUT, isPromise: boolean) => RESPONSE,
  errorCallback?: (error: unknown, isPromise: boolean) => ERROR
): RESPONSE | Promise<RESPONSE> | ERROR | Promise<ERROR> {
  if (isAsync(blockFunction)) {
    return blockFunction
      .bind(this)(...inputs, ...extraInputs)
      .then((output: OUTPUT) =>
        successCallback ? (successCallback.bind(this) as typeof successCallback)(output, true) : (output as unknown as RESPONSE)
      )
      .catch((error) => (errorCallback ? (errorCallback.bind(this) as typeof errorCallback)(error, true) : error));
  } else {
    let result;
    try {
      result = blockFunction.bind(this)(...inputs, ...extraInputs);
    } catch (error) {
      return errorCallback ? (errorCallback.bind(this) as typeof errorCallback)(error, false) : error;
    }
    if (result instanceof Promise) {
      return result
        .then((output: OUTPUT) =>
          successCallback ? (successCallback.bind(this) as typeof successCallback)(output, true) : (output as unknown as RESPONSE)
        )
        .catch((error) => (errorCallback ? (errorCallback.bind(this) as typeof errorCallback)(error, true) : error));
    }
    return successCallback ? (successCallback.bind(this) as typeof successCallback)(result, false) : (result as unknown as RESPONSE);
  }
}
