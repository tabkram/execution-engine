import { isAsync } from './isAsync';
import { FunctionMetadata } from '../models/executionFunction.model';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function extractFunctionParamNames(fn: Function): string[]{
  const source = fn.toString();
  const paramMatch = source.match(/\(([^)]*)\)/);
  const rawParams = paramMatch ? paramMatch[1] : '';
  return rawParams
    .split(',')
    .map((param) => param.trim())
    .filter((param) => param);
}


// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function extractFunctionMetadata(fn: Function): FunctionMetadata {
  return {
    name: fn.name || 'anonymous',
    parameters: extractFunctionParamNames(fn),
    isAsync: isAsync(fn),
    isBound: fn.name.startsWith('bound ')
    // source,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function extractClassMethodMetadata(className: string, methodName: string | symbol, fn: Function): FunctionMetadata {
  const functionMetadata = extractFunctionMetadata(fn);
  return {
    class: className,
    method: methodName,
    methodSignature: `${className}.${methodName?.toString()}(${functionMetadata.parameters.join(',')})`,
    ...functionMetadata
  };
}


/**
 * Wraps a function and attaches method metadata, or returns the value as-is.
 * This is useful in method decorators, where the function needs to be aware of method-specific metadata
 * that would otherwise be inaccessible in a plain function.
 *
 * @returns The original value or a function with attached metadata.
 */
export function attachFunctionMetadata<O = unknown>(paramOrFunction: O | undefined, thisMethodMetadata: FunctionMetadata): O | undefined {
  return typeof paramOrFunction === 'function'
    ? (
      // eslint-disable-next-line unused-imports/no-unused-vars
      ({ metadata, ...rest }: { metadata: FunctionMetadata }): O => {
        return paramOrFunction.bind(this)({ ...rest, metadata: thisMethodMetadata });
      }
    ) as O
    : paramOrFunction;
}
