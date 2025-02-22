import { Awaited } from '../common/awaited';
import { ExecutionTimer } from '../timer/executionTimer';
import { TraceOptions } from './models/engineTraceOptions.model';
import { ExecutionTrace } from './models/executionTrace.model';
import { safeError } from '../common/safeError';
import { execute } from '../execute/execute';
import { TimerDetailsModel } from '../timer/models/timer.model';

function calculateTimeAndDuration(executionTimer: ExecutionTimer): TimerDetailsModel {
  executionTimer.stop();
  const timerDetails = executionTimer.getInfo(undefined, undefined, 3);
  delete timerDetails.executionId;
  return timerDetails;
}

export function trace<O>(
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

  const eee = execute(
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

  return eee;
}
