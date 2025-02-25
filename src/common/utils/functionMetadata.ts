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
