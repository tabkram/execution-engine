/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';

import { Awaited } from '../common/awaited';
import { isAsync } from '../common/isAsync';
import { ExecutionTimer } from '../timer/executionTimer';
import { isNodeTrace, NodeData } from './models/engineNodeTrace.model';
import { DEFAULT_TRACE_CONFIG, TraceOptions } from './models/engineTraceOptions.model';
import { ExecutionTrace } from './models/executionTrace.model';

function calculateTimeAndDuration(executionTimer: ExecutionTimer) {
  executionTimer.stop();
  return {
    startTime: executionTimer.getStartDate(),
    endTime: executionTimer.getEndDate(),
    duration: executionTimer.getDuration(),
    elapsedTime: executionTimer.getElapsedTime(undefined, 3)
  };
}

export function trace<O>(
  blockFunction: (...params) => O | Promise<O>,
  inputs: Array<unknown> = [],
  options: TraceOptions<Array<any>, O> = {
    trace: {
      id: [blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function', new Date()?.getTime(), uuidv4()]?.join('_'),
      label: blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function'
    },
    config: DEFAULT_TRACE_CONFIG
  },
  traceHandler?: (
    nodeTrace: NodeData,
    executionTrace?: ExecutionTrace<Array<unknown>, O>,
    options?: TraceOptions<Array<unknown>, O>['config']
  ) => void
): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> {
  const nodeTraceFromOptions = (isNodeTrace(options) ? options : options.trace) ?? {};
  const executionTimer = new ExecutionTimer();
  executionTimer?.start();
  const nodeTrace: NodeData = {
    id: [
      blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function',
      executionTimer?.getStartDate()?.getTime(),
      uuidv4()
    ]?.join('_'),
    label: [nodeTraceFromOptions?.id ?? (blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function')]?.join(' - '),
    ...nodeTraceFromOptions
  };

  if (isAsync(blockFunction)) {
    return blockFunction
      .bind(this)(...inputs, nodeTrace)
      .then((outputs: O) => {
        const executionTrace = {
          inputs,
          outputs,
          ...calculateTimeAndDuration(executionTimer)
        };
        if (typeof traceHandler === 'function') {
          traceHandler(nodeTrace, executionTrace, options?.config);
        }
        return executionTrace;
      })
      .catch((e) => {
        const executionTrace = {
          inputs,
          errors: [{ name: e?.name, code: e?.code, message: e?.message }],
          ...calculateTimeAndDuration(executionTimer)
        };
        if (typeof traceHandler === 'function') {
          traceHandler(nodeTrace, executionTrace, options?.config);
        }
        if (options.config.errors === 'catch') {
          return executionTrace;
        } else {
          throw e;
        }
      });
  } else {
    try {
      const outputsOrPromise = blockFunction.bind(this)(...inputs, nodeTrace);
      // recheck if blockFunction is not async but returns a promise too:
      if (outputsOrPromise instanceof Promise) {
        return outputsOrPromise
          .then((outputs) => {
            const executionTrace = {
              inputs,
              outputs,
              ...calculateTimeAndDuration(executionTimer)
            };
            if (typeof traceHandler === 'function') {
              traceHandler(nodeTrace, executionTrace, options?.config);
            }
            return executionTrace;
          })
          .catch((e) => {
            const executionTrace = {
              inputs,
              errors: [{ name: e?.name, code: e?.code, message: e?.message }],
              ...calculateTimeAndDuration(executionTimer)
            };
            if (typeof traceHandler === 'function') {
              traceHandler(nodeTrace, executionTrace, options?.config);
            }
            if (options.config.errors === 'catch') {
              return executionTrace;
            } else {
              throw e;
            }
          });
      }
      const executionTrace: ExecutionTrace<Array<unknown>, O> = {
        inputs,
        outputs: outputsOrPromise,
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(nodeTrace, executionTrace, options?.config);
      }
      return executionTrace;
    } catch (e) {
      const executionTrace = {
        inputs,
        errors: [{ name: e?.name, code: e?.code, message: e?.message }],
        ...calculateTimeAndDuration(executionTimer)
      };
      if (typeof traceHandler === 'function') {
        traceHandler(nodeTrace, executionTrace, options?.config);
      }
      if (options.config.errors === 'catch') {
        return executionTrace;
      } else {
        throw e;
      }
    }
  }
}
