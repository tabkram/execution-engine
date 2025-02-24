import { isAsync } from './isAsync';
import { FunctionMetadata } from '../models/executionFunction.model';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function extractFunctionMetadata(fn: Function): FunctionMetadata {
  const source = fn.toString();

  const isBound = fn.name.startsWith('bound ');
  const name = fn.name || 'anonymous';
  const paramMatch = source.match(/\(([^)]*)\)/);
  const rawParams = paramMatch ? paramMatch[1] : '';
  const parameters = rawParams
    .split(',')
    .map((param) => param.trim())
    .filter((param) => param);

  return {
    name,
    parameters,
    isAsync: isAsync(fn),
    isBound
    // source,
  };
}
