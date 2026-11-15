import { executeMemoize } from './memoize';
import { memoize } from './memoize.decorator';

describe('zero-TTL memoization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shares a slow promise and starts fresh immediately after fulfillment', async () => {
    const requests = { executeMemoize };
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = jest.fn(async () => {
      await pending;
      return 'response';
    });
    const options = { functionId: 'request', ttl: 0 };
    const first = requests.executeMemoize(request, ['key'], options);
    await jest.advanceTimersByTimeAsync(5000);
    const second = requests.executeMemoize(request, ['key'], options);
    expect(request).toHaveBeenCalledTimes(1);
    finish();
    await expect(Promise.all([first, second])).resolves.toEqual(['response', 'response']);
    expect(jest.getTimerCount()).toBe(0);
    await expect(requests.executeMemoize(request, ['key'], options)).resolves.toBe('response');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('shares a rejection and allows an immediate successful retry', async () => {
    const requests = { executeMemoize };
    const error = new Error('request failed');
    const request = jest.fn<Promise<string>, []>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('recovered');
    const options = { functionId: 'request', ttl: 0 };
    const first = requests.executeMemoize(request, ['key'], options);
    const second = requests.executeMemoize(request, ['key'], options);
    const results = await Promise.allSettled([first, second]);
    expect(results).toEqual([
      { status: 'rejected', reason: error },
      { status: 'rejected', reason: error }
    ]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await expect(requests.executeMemoize(request, ['key'], options)).resolves.toBe('recovered');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('preserves synchronous reuse until the zero-delay timer runs', () => {
    const requests = { executeMemoize };
    const request = jest.fn(() => 42);
    const options = { functionId: 'request', ttl: 0 };
    expect(requests.executeMemoize(request, ['key'], options)).toBe(42);
    expect(requests.executeMemoize(request, ['key'], options)).toBe(42);
    expect(request).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    jest.runOnlyPendingTimers();
    expect(requests.executeMemoize(request, ['key'], options)).toBe(42);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('preserves zero-TTL memoization during synchronous decorated recursion', () => {
    let executions = 0;
    class Calculator {
      @memoize(undefined, 0)
      fibonacci(n: number): number {
        executions++;
        return n <= 1 ? n : this.fibonacci(n - 1) + this.fibonacci(n - 2);
      }
    }
    const calculator = new Calculator();
    expect(calculator.fibonacci(20)).toBe(6765);
    // Without reuse this needs 21,891 executions.
    expect(executions).toBeLessThan(1000);
    const afterFirstCall = executions;
    expect(calculator.fibonacci(20)).toBe(6765);
    expect(executions).toBe(afterFirstCall);
    jest.runOnlyPendingTimers();
    expect(calculator.fibonacci(20)).toBe(6765);
    expect(executions).toBeGreaterThan(afterFirstCall);
  });

  it('expires a promise-returning non-async function immediately after settlement', async () => {
    const requests = { executeMemoize };
    const request = jest.fn(() => Promise.resolve(42));
    const options = { functionId: 'request', ttl: 0 };
    await expect(Promise.all([
      requests.executeMemoize(request, ['key'], options),
      requests.executeMemoize(request, ['key'], options)
    ])).resolves.toEqual([42, 42]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await expect(requests.executeMemoize(request, ['key'], options)).resolves.toBe(42);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps the default and positive TTLs measured from settlement', async () => {
    for (const [ttl, retainedFor] of [[undefined, 100], [500, 500], [5000, 1000]]) {
      const requests = { executeMemoize };
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const request = jest.fn(async () => {
        await pending;
        return 'response';
      });
      const options = { functionId: 'request', ttl };
      const first = requests.executeMemoize(request, ['key'], options);
      await jest.advanceTimersByTimeAsync(5000);
      const second = requests.executeMemoize(request, ['key'], options);
      expect(request).toHaveBeenCalledTimes(1);
      finish();
      await Promise.all([first, second]);
      await jest.advanceTimersByTimeAsync(retainedFor - 1);
      await requests.executeMemoize(request, ['key'], options);
      expect(request).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await requests.executeMemoize(request, ['key'], options);
      expect(request).toHaveBeenCalledTimes(2);
      jest.clearAllTimers();
    }
  });

  it('continues to retain a rejected promise for a positive TTL', async () => {
    const requests = { executeMemoize };
    const request = jest.fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('request failed'))
      .mockResolvedValue('recovered');
    const options = { functionId: 'request', ttl: 100 };
    await expect(requests.executeMemoize(request, ['key'], options)).rejects.toThrow('request failed');
    await expect(requests.executeMemoize(request, ['key'], options)).rejects.toThrow('request failed');
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(100);
    await expect(requests.executeMemoize(request, ['key'], options)).resolves.toBe('recovered');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('supports zero TTL on decorated methods after both fulfillment and rejection', async () => {
    let executions = 0;
    let fail = false;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    class Service {
      @memoize(undefined, 0)
      async fetchData(key: string): Promise<string> {
        executions++;
        await pending;
        if (fail) {
          throw new Error('request failed');
        }
        return key;
      }
    }
    const service = new Service();
    const first = service.fetchData('key');
    const second = service.fetchData('key');
    expect(executions).toBe(1);
    finish();
    await expect(Promise.all([first, second])).resolves.toEqual(['key', 'key']);
    await expect(service.fetchData('key')).resolves.toBe('key');
    expect(executions).toBe(2);
    fail = true;
    const failures = await Promise.allSettled([service.fetchData('key'), service.fetchData('key')]);
    expect(failures.every((result) => result.status === 'rejected')).toBe(true);
    expect(executions).toBe(3);
    fail = false;
    await expect(service.fetchData('key')).resolves.toBe('key');
    expect(executions).toBe(4);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('memoization keys', () => {
  it('does not share results between distinct Map, Set, undefined, null and NaN inputs', () => {
    const scope = { executeMemoize };
    const keysOf = (map: Map<string, number>): string => [...map.keys()].join(',');
    const format = (x: unknown): string => `${typeof x}:${String(x)}`;

    expect([
      scope.executeMemoize(keysOf as never, [new Map([['a', 1]])], { functionId: 'keysOf' }),
      scope.executeMemoize(keysOf as never, [new Map([['b', 2]])], { functionId: 'keysOf' })
    ]).toEqual(['a', 'b']);
    expect([undefined, null, NaN].map((x) => scope.executeMemoize(format, [x], { functionId: 'format' }))).toEqual([
      'undefined:undefined',
      'object:null',
      'number:NaN'
    ]);
  });

  it('memoizes BigInt arguments instead of throwing', () => {
    const scope = { executeMemoize };
    const byId = jest.fn((id: unknown) => String(id));

    expect(scope.executeMemoize(byId, [1n], { functionId: 'byId' })).toBe('1');
    expect(scope.executeMemoize(byId, [1n], { functionId: 'byId' })).toBe('1');
    expect(byId).toHaveBeenCalledTimes(1);
  });
});
