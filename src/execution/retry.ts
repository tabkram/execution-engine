import { EngineNodeData } from '../common/models/engineNodeData.model';
import { TraceableEngine } from '../engine/traceableEngine';

/** Context for the completed, one-based attempt and its proposed next delay in milliseconds. */
export interface RetryContext<Result = unknown> {
  attempt: number;
  error?: unknown;
  result?: Result;
  delay: number;
}

/** A number is a fixed delay in milliseconds. Custom strategies receive the completed attempt. */
export type RetryBackoff = number | 'fixed' | 'exponential' | ((context: RetryContext) => number);

export interface RetryOptions<Result = unknown> {
  /** Total executions including the first. Defaults to 3; must be a positive safe integer. */
  attempts?: number;
  /** Defaults to exponential: initialDelay * 2 ** (attempt - 1). */
  backoff?: RetryBackoff;
  /** First delay in milliseconds, also used for fixed backoff. Defaults to 100. */
  initialDelay?: number;
  /** Cap in milliseconds, applied before jitter. Defaults to 2_147_483_647 (the timer limit). */
  maxDelay?: number;
  /** Full jitter: choose an integer from 0 through the capped delay. Defaults to false. */
  jitter?: boolean;
  /** Defaults to retrying thrown/rejected errors only. May also request retries of successful results. */
  shouldRetry?: (context: RetryContext<Result>) => boolean | Promise<boolean>;
  /** Runs before each retry delay, never after the last attempt. Hook errors stop retries. */
  onRetry?: (context: RetryContext<Result>) => void | Promise<void>;
  /** Resolve cancellation from the current call's arguments; useful for decorators. */
  getSignal?: (args: readonly unknown[]) => AbortSignal | undefined;
  /** Record a parent operation and child attempts. Also inferred from this or this.engine. */
  engine?: TraceableEngine;
}

/** Cancellation belongs to an invocation rather than the shared retry policy. */
export interface RetryCallOptions {
  signal?: AbortSignal;
}

/** Retains the original arguments and receiver; all calls return a Promise, including sync functions. */
export interface RetryFunction<Args extends unknown[], Result, Receiver = unknown> {
  (this: Receiver, ...args: Args): Promise<Result>;
  withOptions(this: Receiver, options: RetryCallOptions, ...args: Args): Promise<Result>;
}

const timerLimit = 2_147_483_647;

function validateDelay(delay: number, name: string): number {
  if (!Number.isFinite(delay) || delay < 0 || delay > timerLimit) {
    throw new RangeError(`${name} must be between 0 and ${timerLimit} milliseconds`);
  }
  return delay;
}

/** Waits for work or cancellation, always removing the abort listener. */
function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return work;
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (result) => {
        signal.removeEventListener('abort', onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
    if (signal.aborted) {
      onAbort();
    }
  });
}

async function wait(delay: number, signal?: AbortSignal): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    await abortable(
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, delay);
      }),
      signal
    );
  } finally {
    clearTimeout(timer);
  }
}

function createRetry<Args extends unknown[], Output, Receiver>(
  blockFunction: (this: Receiver, ...args: Args) => Output,
  options: RetryOptions<Awaited<Output>>
): RetryFunction<Args, Awaited<Output>, Receiver> {
  // Copy the policy so later changes to the caller's options cannot alter an in-flight call.
  const policy = { ...options };
  const attempts = policy.attempts ?? 3;
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new RangeError('attempts must be a positive safe integer');
  }
  const initialDelay = validateDelay(policy.initialDelay ?? 100, 'initialDelay');
  const maxDelay = validateDelay(policy.maxDelay ?? timerLimit, 'maxDelay');
  const backoff = policy.backoff ?? 'exponential';
  if (typeof backoff === 'number') {
    validateDelay(backoff, 'backoff');
  } else if (typeof backoff !== 'function' && backoff !== 'fixed' && backoff !== 'exponential') {
    throw new TypeError('backoff must be fixed, exponential, a delay, or a function');
  }

  async function invoke(receiver: Receiver, args: Args, callOptions: RetryCallOptions = {}): Promise<Awaited<Output>> {
    const signal = callOptions.signal ?? policy.getSignal?.call(receiver, args);
    const scope = receiver as { engine?: TraceableEngine };
    const engine =
      policy.engine ??
      (receiver instanceof TraceableEngine ? receiver : scope?.engine instanceof TraceableEngine ? scope.engine : undefined);

    async function executeAttempts(parent?: EngineNodeData): Promise<Awaited<Output>> {
      let succeeded = false;
      try {
        for (let attempt = 1; attempt <= attempts; attempt++) {
          signal?.throwIfAborted();
          let attemptNode: EngineNodeData;
          let result: Awaited<Output>;
          let error: unknown;
          let failed = false;
          const execute = async (): Promise<Awaited<Output>> => {
            return abortable(
              Promise.resolve().then(() => {
                signal?.throwIfAborted();
                return blockFunction.apply(receiver, args);
              }),
              signal
            );
          };
          try {
            if (engine && parent) {
              const trace = await engine.run(
                async (node: EngineNodeData) => {
                  attemptNode = node;
                  node.inputs = args;
                  return execute();
                },
                [],
                {
                  trace: { parent: parent.id, label: `attempt ${attempt}` },
                  config: { errors: 'throw', traceExecution: true }
                }
              );
              result = trace.outputs as Awaited<Output>;
            } else {
              result = await execute();
            }
          } catch (caught) {
            failed = true;
            error = caught;
          }
          signal?.throwIfAborted();
          if (attempt === attempts || (!failed && !policy.shouldRetry)) {
            if (failed) {
              throw error;
            }
            succeeded = true;
            return result;
          }
          const context: RetryContext<Awaited<Output>> = {
            attempt,
            ...(failed ? { error } : { result }),
            delay: 0
          };
          let delay =
            typeof backoff === 'function'
              ? validateDelay(backoff.call(receiver, context), 'custom backoff')
              : typeof backoff === 'number'
                ? backoff
                : backoff === 'fixed' || initialDelay === 0
                  ? initialDelay
                  : Math.min(initialDelay * 2 ** (attempt - 1), timerLimit);
          delay = Math.min(delay, maxDelay);
          context.delay = policy.jitter ? Math.floor(Math.random() * (Math.floor(delay) + 1)) : delay;
          const shouldRetry = policy.shouldRetry
            ? await abortable(
              Promise.resolve().then(() => {
                signal?.throwIfAborted();
                return policy.shouldRetry.call(receiver, context);
              }),
              signal
            )
            : failed;
          signal?.throwIfAborted();
          if (!shouldRetry) {
            if (failed) {
              throw error;
            }
            succeeded = true;
            return result;
          }
          if (engine && attemptNode) {
            engine.pushNarratives(attemptNode.id, `Retry after ${context.delay} ms (${failed ? 'error' : 'result'}).`);
          }
          if (policy.onRetry) {
            await abortable(
              Promise.resolve().then(() => {
                signal?.throwIfAborted();
                return policy.onRetry.call(receiver, context);
              }),
              signal
            );
          }
          signal?.throwIfAborted();
          await wait(context.delay, signal);
        }
      } finally {
        if (parent) {
          parent.narratives = [signal?.aborted ? 'Retry cancelled.' : succeeded ? 'Retry succeeded.' : 'Retry failed.'];
          if (succeeded) {
            // Clear errors inherited by the engine's placeholder parent from a failed child.
            parent.errors = undefined;
          }
        }
      }
    }

    if (engine) {
      const trace = await engine.run(
        async (parent: EngineNodeData) => {
          parent.inputs = args;
          return executeAttempts(parent);
        },
        [],
        {
          trace: { label: `retry ${blockFunction.name || 'anonymous'}` },
          config: { errors: 'throw', traceExecution: true }
        }
      );
      return trace.outputs as Awaited<Output>;
    }
    return executeAttempts();
  }

  const wrapped: RetryFunction<Args, Awaited<Output>, Receiver> = async function (this: Receiver, ...args: Args): Promise<Awaited<Output>> {
    return invoke(this, args);
  } as RetryFunction<Args, Awaited<Output>, Receiver>;
  wrapped.withOptions = function (this: Receiver, callOptions: RetryCallOptions, ...args: Args): Promise<Awaited<Output>> {
    return invoke((this as unknown) === wrapped ? undefined : this, args, callOptions);
  };
  return wrapped;
}

/**
 * Wrap a sync/async function in a bounded retry policy. Always returns a Promise and preserves this and arguments.
 * Exhaustion rejects with the exact final thrown value, including its original stack. Successful results are only
 * retried when shouldRetry requests it; exhausting result retries returns the final result. Hook/strategy errors
 * stop immediately. Cancellation rejects with signal.reason, clears pending delays, and does not interrupt the
 * underlying operation; pass the same signal to that operation when it supports cancellation.
 *
 * Use wrapped.withOptions({ signal }, ...args) for per-call cancellation. For a receiver, use
 * wrapped.withOptions.call(receiver, { signal }, ...args). Decorators can use getSignal(args).
 */
export function retry<Args extends unknown[], Output, Receiver = unknown>(
  blockFunction: (this: Receiver, ...args: Args) => Output,
  options?: RetryOptions<Awaited<Output>>
): RetryFunction<Args, Awaited<Output>, Receiver>;
/**
 * Apply retry to a method. The runtime result is always a Promise; declare decorated methods async.
 * The policy and attempt state are isolated per invocation. Uses the same options as the function form.
 */
export function retry<Result = unknown>(options?: RetryOptions<Result>): MethodDecorator;
export function retry<Args extends unknown[], Output, Receiver>(
  functionOrOptions: ((this: Receiver, ...args: Args) => Output) | RetryOptions<Awaited<Output>> = {},
  options: RetryOptions<Awaited<Output>> = {}
): RetryFunction<Args, Awaited<Output>, Receiver> | MethodDecorator {
  if (typeof functionOrOptions === 'function') {
    return createRetry(functionOrOptions, options);
  }
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
    if (typeof descriptor.value !== 'function') {
      throw new TypeError('retry can only decorate methods');
    }
    descriptor.value = createRetry(descriptor.value, functionOrOptions);
  };
}
