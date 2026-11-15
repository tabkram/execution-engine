import { retry, RetryContext } from './retry';
import { TraceableEngine } from '../engine/traceableEngine';

describe('retry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('preserves typed arguments, receiver and falsy sync results', async () => {
    const receiver = {
      prefix: 'invoice',
      get: retry(function (this: { prefix: string }, id: number, enabled: boolean): string {
        return enabled ? `${this.prefix}-${id}` : '';
      })
    };
    const result: Promise<string> = receiver.get(42, true);
    await expect(result).resolves.toBe('invoice-42');
    await expect(receiver.get(0, false)).resolves.toBe('');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retries synchronous throws using the default three attempts and exponential delays', async () => {
    const error = new Error('temporary');
    const operation = jest
      .fn()
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockReturnValue(7);
    const onRetry = jest.fn();
    const result = retry(operation, { onRetry })();
    await jest.advanceTimersByTimeAsync(99);
    expect(operation).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(199);
    expect(operation).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(7);
    expect(onRetry.mock.calls.map(([context]) => context.delay)).toEqual([100, 200]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['async', 'promise', 'sync'] as const)('preserves the final %s error identity and stack', async (kind) => {
    const errors = [new Error('first'), new Error('last')];
    const stack = errors[1].stack;
    let count = 0;
    const operation =
      kind === 'async'
        ? async (): Promise<never> => {
          throw errors[count++];
        }
        : kind === 'promise'
          ? (): Promise<never> => Promise.reject(errors[count++])
          : (): never => {
            throw errors[count++];
          };
    const result = retry(operation, { attempts: 2, initialDelay: 10 })();
    const rejected = expect(result).rejects.toBe(errors[1]);
    await jest.runAllTimersAsync();
    await rejected;
    expect(count).toBe(2);
    expect(errors[1].stack).toBe(stack);
  });

  it.each([undefined, null, 'failure', 0])('preserves thrown values including %s', async (error) => {
    const result = retry(
      () => {
        throw error;
      },
      { attempts: 1 }
    )();
    await expect(result).rejects.toBe(error);
  });

  it('stops immediately for a non-retryable error', async () => {
    const error = new Error('permanent');
    const operation = jest.fn().mockRejectedValue(error);
    const shouldRetry = jest.fn(async (context: RetryContext) => context.error !== error);
    const onRetry = jest.fn();
    await expect(retry(operation, { shouldRetry, onRetry })()).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith({ attempt: 1, error, delay: 100 });
    expect(onRetry).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    { backoff: 'fixed' as const, initialDelay: 20, expected: [20, 20, 20] },
    { backoff: 15, expected: [15, 15, 15] },
    { backoff: 'exponential' as const, initialDelay: 20, maxDelay: 30, expected: [20, 30, 30] },
    { backoff: ({ attempt }: RetryContext): number => attempt * 10, maxDelay: 25, expected: [10, 20, 25] }
  ])('uses capped backoff $expected', async ({ expected, ...options }) => {
    const operation = jest.fn().mockRejectedValue('failure');
    const onRetry = jest.fn();
    const result = retry(operation, { ...options, attempts: 4, onRetry })();
    const rejected = expect(result).rejects.toBe('failure');
    await jest.runAllTimersAsync();
    await rejected;
    expect(onRetry.mock.calls.map(([context]) => context.delay)).toEqual(expected);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it('applies full jitter after the maximum delay', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const onRetry = jest.fn();
    const operation = jest.fn().mockRejectedValueOnce('failure').mockResolvedValue(false);
    const result = retry(operation, { backoff: 500, maxDelay: 100, jitter: true, onRetry })();
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(false);
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, error: 'failure', delay: 50 });
  });

  it('allows async result predicates and returns the final result on exhaustion', async () => {
    const operation = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValue(2);
    const shouldRetry = jest.fn(async ({ result }: RetryContext<number>) => result < 3);
    const onRetry = jest.fn();
    const result = retry(operation, { shouldRetry, onRetry, backoff: 0 })();
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(2);
    expect(shouldRetry).toHaveBeenCalledTimes(2);
    expect(shouldRetry.mock.calls[0][0]).toEqual({ attempt: 1, result: 0, delay: 0 });
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('returns a result immediately when the predicate accepts it', async () => {
    const operation = jest.fn().mockReturnValue(undefined);
    await expect(retry(operation, { shouldRetry: () => false })()).resolves.toBeUndefined();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('awaits onRetry before starting the delay', async () => {
    let release: () => void;
    const hook = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = jest.fn().mockRejectedValueOnce('failure').mockResolvedValue(1);
    const result = retry(operation, { onRetry: () => hook })();
    await jest.advanceTimersByTimeAsync(1000);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    release();
    await jest.advanceTimersByTimeAsync(99);
    expect(operation).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(1);
  });

  it.each(['shouldRetry', 'onRetry', 'backoff'] as const)('propagates errors from %s without retrying the hook', async (hook) => {
    const error = new Error('hook failed');
    const operation = jest.fn().mockRejectedValue('original');
    const callback = jest.fn((): never => {
      throw error;
    });
    await expect(retry(operation, { [hook]: callback })()).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid attempts %s at construction', (attempts) => {
    expect(() => retry(() => 1, { attempts })).toThrow(RangeError);
  });

  it.each([-1, NaN, Infinity, 2_147_483_648])('rejects invalid delays %s', (delay) => {
    for (const option of ['initialDelay', 'maxDelay', 'backoff']) {
      expect(() => retry(() => 1, { [option]: delay })).toThrow(RangeError);
    }
  });

  it('rejects invalid custom delays before scheduling a timer', async () => {
    await expect(
      retry(
        () => {
          throw 'failure';
        },
        { backoff: () => -1 }
      )()
    ).rejects.toThrow(RangeError);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects an already aborted invocation without executing', async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = jest.fn();
    await expect(retry(operation).withOptions({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(operation).not.toHaveBeenCalled();
  });

  it('cancels pending delays without affecting concurrent calls', async () => {
    const controller = new AbortController();
    const cancelled = new Error('cancelled');
    const counts = new Map<string, number>();
    const operation = jest.fn((id: string) => {
      const count = (counts.get(id) ?? 0) + 1;
      counts.set(id, count);
      if (count < 2) {
        throw new Error('retry');
      }
      return id;
    });
    const wrapped = retry(operation);
    const first = wrapped.withOptions({ signal: controller.signal }, 'first');
    const rejected = expect(first).rejects.toBe(cancelled);
    const second = wrapped('second');
    await jest.advanceTimersByTimeAsync(50);
    controller.abort(cancelled);
    await rejected;
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(50);
    await expect(second).resolves.toBe('second');
    expect(counts.get('first')).toBe(1);
    expect(counts.get('second')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['operation', 'shouldRetry', 'onRetry'] as const)('cancels while %s is pending and removes listeners', async (stage) => {
    const controller = new AbortController();
    const add = jest.spyOn(controller.signal, 'addEventListener');
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const pending = new Promise<never>(() => {});
    const operation = jest.fn(() => (stage === 'operation' ? pending : Promise.reject('failure')));
    const options =
      stage === 'shouldRetry'
        ? { shouldRetry: (): Promise<never> => pending }
        : stage === 'onRetry'
          ? { onRetry: (): Promise<never> => pending }
          : {};
    const result = retry(operation, options).withOptions({ signal: controller.signal });
    const rejected = expect(result).rejects.toBe('cancelled');
    await jest.advanceTimersByTimeAsync(0);
    controller.abort('cancelled');
    await rejected;
    expect(operation).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('removes abort listeners on success and preserves a receiver with call options', async () => {
    const controller = new AbortController();
    const add = jest.spyOn(controller.signal, 'addEventListener');
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const wrapped = retry(function (this: { id: string }, suffix: string): string {
      return this.id + suffix;
    });
    await expect(wrapped.withOptions.call({ id: 'a' }, { signal: controller.signal }, 'b')).resolves.toBe('ab');
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
  });

  it('records attempts, retry delays, failure reasons and the final outcome in the engine', async () => {
    const engine = new TraceableEngine();
    const operation = jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(42);
    const result = retry(operation, { engine, initialDelay: 10 })();
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(42);
    const nodes = engine.getTraceNodes();
    const parent = nodes.find(({ data }) => data.label.startsWith('retry ')).data;
    const children = nodes.filter(({ data }) => data.parent === parent.id).map(({ data }) => data);
    expect(children).toHaveLength(2);
    expect(children[0]).toMatchObject({
      label: 'attempt 1',
      errors: [{ message: 'temporary' }],
      narratives: ['Retry after 10 ms (error).']
    });
    expect(children[1]).toMatchObject({ label: 'attempt 2', outputs: 42 });
    expect(parent).toMatchObject({ outputs: 42, abstract: false });
    expect(parent.errors).toBeUndefined();
    expect(parent.narratives).toEqual(['Retry succeeded.']);
    expect(engine.getTrace().filter((item) => item.group === 'edges')).toHaveLength(1);
  });

  it('infers the engine receiver and preserves nesting inside run', async () => {
    const engine = new TraceableEngine();
    const result = await engine.run(
      retry(function (this: TraceableEngine): number {
        expect(this).toBe(engine);
        return 1;
      }),
      [],
      { trace: { label: 'outer' } }
    );
    expect(result.outputs).toBe(1);
    const nodes = engine.getTraceNodes().map(({ data }) => data);
    const outer = nodes.find((node) => node.label === 'outer');
    const parent = nodes.find((node) => node.label.startsWith('retry '));
    expect(parent.parent).toBe(outer.id);
    expect(nodes.find((node) => node.label === 'attempt 1').parent).toBe(parent.id);
  });

  it('traces cancellation and final failure without replacing the rejection', async () => {
    const engine = new TraceableEngine();
    const controller = new AbortController();
    const result = retry(
      () => {
        throw new Error('temporary');
      },
      { engine }
    ).withOptions({ signal: controller.signal });
    const rejected = expect(result).rejects.toBe('cancelled');
    await jest.advanceTimersByTimeAsync(10);
    controller.abort('cancelled');
    await rejected;
    const parent = engine.getTraceNodes().find(({ data }) => data.label.startsWith('retry ')).data;
    expect(parent).toMatchObject({ errors: ['cancelled'], narratives: ['Retry cancelled.'], abstract: false });
  });

  it('records the last failure on the trace parent after exhausting attempts', async () => {
    const engine = new TraceableEngine();
    const error = new Error('final failure');
    const result = retry(() => {
      throw error;
    }, { engine, backoff: 0, attempts: 2 })();
    const rejected = expect(result).rejects.toBe(error);
    await jest.runAllTimersAsync();
    await rejected;
    const nodes = engine.getTraceNodes().map(({ data }) => data);
    expect(nodes).toHaveLength(3);
    expect(nodes.find((node) => node.label.startsWith('retry '))).toMatchObject({
      errors: [{ message: 'final failure' }], narratives: ['Retry failed.'], abstract: false
    });
  });

  it('passes the failure and receiver to custom backoff and both hooks', async () => {
    const error = new Error('temporary');
    const receiver = { id: 'receiver' };
    const backoff = jest.fn(function (this: typeof receiver, context: RetryContext): number {
      expect(this).toBe(receiver);
      expect(context).toEqual({ attempt: 1, error, delay: 0 });
      return 20;
    });
    const shouldRetry = jest.fn(function (this: typeof receiver, context: RetryContext): boolean {
      expect(this).toBe(receiver);
      return context.error === error;
    });
    const onRetry = jest.fn(function (this: typeof receiver): void {
      expect(this).toBe(receiver);
    });
    const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(42);
    const result = retry(operation, { backoff, shouldRetry, onRetry, attempts: 2 }).call(receiver);
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(42);
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, error, delay: 20 });
  });

  it('uses the explicit per-call signal instead of the argument selector', async () => {
    const controller = new AbortController();
    controller.abort('selector signal');
    const getSignal = jest.fn(() => controller.signal);
    const operation = jest.fn().mockReturnValue(42);
    const wrapped = retry(operation, { getSignal });
    await expect(wrapped()).rejects.toBe('selector signal');
    await expect(wrapped.withOptions({ signal: new AbortController().signal })).resolves.toBe(42);
    expect(getSignal).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries with real timers', async () => {
    jest.useRealTimers();
    const operation = jest.fn().mockRejectedValueOnce('temporary').mockResolvedValue(42);
    await expect(retry(operation, { initialDelay: 1 })()).resolves.toBe(42);
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
