import { retry } from './retry';
import { engine, EngineTask, run } from '../engine/executionEngineDecorators';
import { TraceableEngine } from '../engine/traceableEngine';

describe('@retry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('preserves arguments, instance state and independent calls', async () => {
    class Service {
      calls = 0;
      constructor(readonly prefix: string) {}

      @retry({ backoff: 0 })
      async get(id: number): Promise<string> {
        this.calls++;
        if (this.calls < 2) {
          throw new Error('transient');
        }
        return `${this.prefix}-${id}`;
      }
    }
    const first = new Service('first');
    const second = new Service('second');
    const results = Promise.all([first.get(1), second.get(2)]);
    await jest.runAllTimersAsync();
    await expect(results).resolves.toEqual(['first-1', 'second-2']);
    expect(first.calls).toBe(2);
    expect(second.calls).toBe(2);
  });

  it('selects cancellation from each method call without changing the policy', async () => {
    class Service {
      calls = 0;

      @retry({ getSignal: (args) => args[1] as AbortSignal, backoff: 10 })
      async get(id: string, signal?: AbortSignal): Promise<string> {
        this.calls++;
        if (signal) {
          throw new Error('retry');
        }
        return id;
      }
    }
    const service = new Service();
    const controller = new AbortController();
    const cancelled = service.get('first', controller.signal);
    const rejected = expect(cancelled).rejects.toBe('stop');
    await jest.advanceTimersByTimeAsync(0);
    controller.abort('stop');
    await rejected;
    await expect(service.get('second')).resolves.toBe('second');
    expect(service.calls).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('supports symbol methods and discovers this.engine for tracing', async () => {
    const method = Symbol('get');
    class Service {
      engine = new TraceableEngine();
      calls = 0;

      @retry({ backoff: 0 })
      async [method](): Promise<number> {
        this.calls++;
        if (this.calls < 2) {
          throw new Error('temporary');
        }
        return 42;
      }
    }
    const service = new Service();
    const result = service[method]();
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(42);
    expect(service.engine.getTraceNodes()).toHaveLength(3);
    expect(service.engine.getTraceNodes().filter(({ data }) => data.parent)).toHaveLength(2);
  });

  it('composes with @run and @engine without losing the Promise result', async () => {
    @engine()
    class Service extends EngineTask {
      calls = 0;

      @run({ trace: { label: 'service' } })
      @retry({ backoff: 0 })
      async get(): Promise<number> {
        this.calls++;
        if (this.calls === 1) {
          throw new Error('temporary');
        }
        return 42;
      }
    }
    const service = new Service();
    const result = service.get();
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe(42);
    const nodes = service.engine.getTraceNodes().map(({ data }) => data);
    expect(nodes).toHaveLength(4);
    expect(nodes.find((node) => node.label.startsWith('retry ')).parent).toBe(nodes.find((node) => node.label === 'service').id);
  });
});
