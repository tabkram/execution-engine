import { v4 as uuidv4 } from 'uuid';

import { FunctionMetadata } from '../common/models/executionFunction.model';
import { ExecutionTrace } from '../common/models/executionTrace.model';
import { TimerDetailsModel } from '../common/models/timer.model';
import { Awaited } from '../common/utils/awaited';
import { extractFunctionMetadata } from '../common/utils/functionMetadata';
import { safeError } from '../common/utils/safeError';
import { execute } from '../execution/execute';
import { ExecutionTimer } from '../timer/executionTimer';

export interface TraceContext<O> extends ExecutionTrace<Array<unknown>, O> {
  metadata: FunctionMetadata;
  [key: string]: unknown;
}

function calculateTimeAndDuration(executionTimer: ExecutionTimer): TimerDetailsModel {
  executionTimer.stop();
  const timerDetails = executionTimer.getInfo(undefined, undefined, 3);
  delete timerDetails.executionId;
  return timerDetails;
}

export function executionTrace<O>(
  blockFunction: (...params) => Promise<O>,
  inputs?: Array<unknown>,
  traceHandler?: (traceContext: TraceContext<O>) => void,
  options?: { contextKey?: string; errorStrategy?: 'catch' | 'throw' }
): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>>;

export function executionTrace<O>(
  blockFunction: (...params) => O,
  inputs?: Array<unknown>,
  traceHandler?: (traceContext: TraceContext<O>) => void,
  options?: { contextKey?: string; errorStrategy?: 'catch' | 'throw' }
): ExecutionTrace<Array<unknown>, O>;

/**
 * Executes a given function (`blockFunction`) while tracing its execution details, including inputs, outputs,
 * timing, metadata, and potential errors. Supports both synchronous and asynchronous functions.
 *
 * @template O - The return type of `blockFunction`, which can be synchronous (`O`) or a `Promise<O>`.
 *
 * @param blockFunction - The function to execute and trace.
 * @param inputs - An array of input parameters to pass to `blockFunction`. Defaults to an empty array.
 * @param traceHandler - An optional callback function that processes the trace context after execution.
 * @param options - Optional configuration:
 *   - `contextKey`: A key to store and retrieve execution context.
 *   - `errorStrategy`: Determines how errors are handled:
 *     - `'catch'`: Captures errors and includes them in the trace.
 *     - `'throw'`: Throws the error after recording it in the trace.
 *
 * @returns An Either:
 *   - `ExecutionTrace` object containing execution details.
 *   -  If `blockFunction` is asynchronous, returns a `Promise<ExecutionTrace>`.
 */
export function executionTrace<O>(
  blockFunction: (...params) => O | Promise<O>,
  inputs: Array<unknown> = [],
  traceHandler?: (traceContext: TraceContext<O>) => void,
  options: { contextKey?: string; errorStrategy?: 'catch' | 'throw' } = {
    contextKey: undefined,
    errorStrategy: 'throw'
  }
): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> {
  const id = uuidv4();
  const executionTimer = new ExecutionTimer(id);
  executionTimer?.start();
  const executionTrace: ExecutionTrace<Array<unknown>, O> = { id, inputs, startTime: executionTimer.getStartDate() };
  const functionMetadata = extractFunctionMetadata(blockFunction);
  let traceContext: TraceContext<O> = { metadata: functionMetadata, ...executionTrace };
  if (this && options.contextKey) {
    traceContext = { ...traceContext, ...this[options.contextKey] };
    this[options.contextKey] = traceContext;
  }

  return (execute.bind(this) as typeof execute)(
    blockFunction.bind(this),
    inputs,
    [traceContext],
    (outputs: O, isPromise: boolean): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> => {
      const { startTime, ...traceContextWithoutStartTime } = traceContext;
      traceContext = {
        ...traceContextWithoutStartTime,
        outputs,
        isPromise,
        startTime,
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(traceContext);
      }
      return traceContext;
    },
    (e, isPromise: boolean): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> => {
      const { startTime, ...traceContextWithoutStartTime } = traceContext;
      traceContext = {
        ...traceContextWithoutStartTime,
        errors: [safeError(e)],
        isPromise,
        startTime,
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(traceContext);
      }
      if (options?.errorStrategy === 'catch') {
        return traceContext;
      } else {
        throw e;
      }
    }
  );
}
