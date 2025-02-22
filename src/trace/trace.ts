import { TraceOptions } from '../common/models/engineTraceOptions.model';
import { ExecutionTrace } from '../common/models/executionTrace.model';
import { TimerDetailsModel } from '../common/models/timer.model';
import { Awaited } from '../common/utils/awaited';
import { safeError } from '../common/utils/safeError';
import { execute } from '../execution/execute';
import { ExecutionTimer } from '../timer/executionTimer';

function calculateTimeAndDuration(executionTimer: ExecutionTimer): TimerDetailsModel {
  executionTimer.stop();
  const timerDetails = executionTimer.getInfo(undefined, undefined, 3);
  delete timerDetails.executionId;
  return timerDetails;
}


export function executionTrace<O>(
  blockFunction: (...params) => Promise<O>,
  inputs?: Array<unknown>,
  traceHandler?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traceContext: Record<string, any>,
    executionTrace?: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traceContext?: Record<string, any>,
  errorStrategy?: 'catch' | 'throw'
): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>>;

export function executionTrace<O>(
  blockFunction: (...params) => O,
  inputs?: Array<unknown>,
  traceHandler?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traceContext: Record<string, any>,
    executionTrace?: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traceContext?: Record<string, any>,
  errorStrategy?: 'catch' | 'throw'
): ExecutionTrace<Array<unknown>, O>;


export function executionTrace<O>(
  blockFunction: (...params) => O | Promise<O>,
  inputs: Array<unknown> = [],
  traceHandler?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traceContext: Record<string, any>,
    executionTrace?: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traceContext: Record<string, any> = {},
  errorStrategy: 'catch' | 'throw' = 'throw'
): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> {
  const executionTimer = new ExecutionTimer();
  executionTimer?.start();

  return execute(
    blockFunction,
    inputs,
    [traceContext],
    (outputs: O): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> => {
      const executionTrace = {
        inputs,
        outputs,
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(traceContext, executionTrace);
      }
      return executionTrace;
    },
    (e): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> => {
      const executionTrace = {
        inputs,
        errors: [safeError(e)],
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(traceContext, executionTrace);
      }
      if (errorStrategy === 'catch') {
        return executionTrace;
      } else {
        throw e;
      }
    }
  );
}
