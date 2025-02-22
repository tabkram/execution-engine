import { isAsync } from '../common/isAsync';

// Overload for synchronous blockFunction returning OUTPUT
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => OUTPUT,
  inputs: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT) => RESPONSE,
  errorCallback?: (error: unknown) => ERROR
): RESPONSE;

// Overload for asynchronous blockFunction returning Promise<OUTPUT>
export function execute<INPUT extends unknown[], OUTPUT, RESPONSE = OUTPUT, ERROR = RESPONSE>(
  blockFunction: (...params: INPUT) => Promise<OUTPUT>,
  inputs?: INPUT,
  extraInputs?: Record<string, unknown>[],
  successCallback?: (output: OUTPUT) => RESPONSE,
  errorCallback?: (error: unknown) => ERROR
): Promise<RESPONSE>;

/**
 * Executes a given function (`blockFunction`) with the provided inputs and optional extra inputs.
 * Supports both synchronous and asynchronous functions, with optional success and error callbacks.
 *
 * @template INPUT - The tuple type representing the parameters expected by `blockFunction`.
 * @template OUTPUT - The return type of `blockFunction`, which can be either synchronous (`OUTPUT`) or a `Promise<OUTPUT>`.
 * @template RESPONSE - The transformed output type returned from `successCallback`, if provided.
 * @template ERROR - The transformed error type returned from `errorCallback`, if provided.
 *
 * @param blockFunction - The function to execute, which can be synchronous or asynchronous.
 * @param inputs - The primary set of inputs to pass to `blockFunction`. Defaults to an empty tuple.
 * @param extraInputs - Additional inputs to append when calling `blockFunction`. Defaults to an empty array.
 * @param successCallback - An optional callback that transforms the output of `blockFunction` before returning it.
 * @param errorCallback - An optional callback that handles errors and transforms them before returning.
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
  errorCallback?: (error: unknown) => ERROR
): RESPONSE | Promise<RESPONSE> | ERROR | Promise<ERROR> {
  if (blockFunction.length > inputs.length + extraInputs.length) {
    const paramNames = blockFunction
      .toString()
      .match(/\(([^)]*)\)/)[1]
      .split(',')
      .map((param) => param.trim())
      .filter((param) => param);
    const paramNames2 = extraInputs.length ? paramNames.slice(0, -extraInputs.length) : paramNames;
    throw new Error(`Could not trace your function properly if you don't provide parameters: (${paramNames2})`);
  }

  const executeFunction = () => blockFunction.bind(this)(...inputs, ...extraInputs);

  if (isAsync(blockFunction)) {
    return executeFunction()
      .then((output: OUTPUT) => (successCallback ? successCallback(output) : (output as unknown as RESPONSE)))
      .catch((error) => (errorCallback ? errorCallback(error) : error));
  } else {
    try {
      const result = executeFunction();
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
