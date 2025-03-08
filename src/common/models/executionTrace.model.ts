/**
 * Represents an execution trace with information about inputs, outputs, errors, and timing.
 */
export interface ExecutionTrace<I, O> {
  id: string;
  inputs?: I;
  outputs?: O;
  isPromise?: boolean;
  errors?: unknown;
  narratives?: Array<string>;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  elapsedTime?: string;
}

/**
 * Defines how to extract specific data from an `ExecutionTrace`.
 *
 * Each property can either be a:
 * - `boolean`: If `true`, include all data for the property.
 * - `Array<string>`: A list of specific keys to extract from the property.
 * - `Function`: A function that processes the data of the property and returns a value.
 */
export interface ExecutionTraceExtractor<I, O> {
  inputs?: boolean | Array<string> | ((i: I) => unknown);
  outputs?: boolean | Array<string> | ((o: O) => unknown);
  errors?: boolean | Array<string> | ((e: Array<unknown>) => unknown);
  narratives?: boolean | Array<string> | ((execTrace: Partial<ExecutionTrace<I, O>>) => Array<string>);
  startTime?: boolean;
  endTime?: boolean;
}

export function isExecutionTrace<I, O>(config: ExecutionTraceExtractor<I, O>): config is ExecutionTraceExtractor<I, O> {
  return (
    'inputs' in config ||
    'outputs' in config ||
    'errors' in config ||
    'startTime' in config ||
    'endTime' in config ||
    'narratives' in config
  );
}

/**
 * @deprecated Use `ExecutionTrace` instead.
 *
 * ⚠️ `NodeExecutionTrace` is deprecated and will be removed in a future release.
 * Migrate to `ExecutionTrace` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NodeExecutionTrace<I, O> extends ExecutionTrace<I, O> {}

/**
 * @deprecated Use `ExecutionTraceExtractor` instead.
 *
 * ⚠️ `NodeExecutionTraceExtractor` is deprecated and will be removed in a future release.
 * Migrate to `ExecutionTraceExtractor` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NodeExecutionTraceExtractor<I, O> extends ExecutionTraceExtractor<I, O> {}

/**
 * @deprecated Use `isExecutionTrace` instead.
 *
 * ⚠️ `isNodeExecutionTrace` is deprecated and will be removed in a future release.
 * Migrate to `isExecutionTrace` to ensure compatibility with future updates.
 */
export const isNodeExecutionTrace = isExecutionTrace;
