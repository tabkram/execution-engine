import { trace } from './traceDecorator';

describe('trace decorator', () => {
  const executionTraceExpectation = {
    id: expect.any(String),
    inputs: expect.any(Array),
    startTime: expect.any(Date),
    endTime: expect.any(Date),
    duration: expect.any(Number),
    elapsedTime: expect.any(String)
  };

  const successfulExecutionTraceExpectation = {
    ...executionTraceExpectation,
    outputs: expect.anything()
  };

  const failedExecutionTraceExpectation = {
    ...executionTraceExpectation,
    errors: expect.anything()
  };

  describe('Tracing synchronous functions', () => {
    const traceHandlerMock = jest.fn();

    class SyncClass {
      greetingFrom = ['hello from class'];

      @trace(function (...args) {
        this.greetingFrom.push('hello from trace handler');
        traceHandlerMock(...args);
        expect(this.greetingFrom).toEqual(['hello from class', 'hello from method', 'hello from trace handler']);
      })
      helloWorld(): string {
        this.greetingFrom.push('hello from method');
        return 'Hello World';
      }
    }

    it('should trace a synchronous function and verify context', () => {
      const instance = new SyncClass();
      expect(instance.helloWorld()).toBe('Hello World');
      expect(traceHandlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'SyncClass',
            method: 'helloWorld',
            name: 'helloWorld',
            parameters: [],
            isAsync: false,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation
        })
      );
    });
  });

  describe('Asynchronous functions', () => {
    const asyncTraceHandlerMock = jest.fn();

    class AsyncClass {
      greetingFrom = ['hello from class'];

      @trace(function (...args) {
        this.greetingFrom.push('hello from async trace handler');
        asyncTraceHandlerMock(...args);
        expect(this.greetingFrom).toEqual(['hello from class', 'hello from async method', 'hello from async trace handler']);
      })
      async helloWorldAsync(): Promise<string> {
        this.greetingFrom.push('hello from async method');
        return 'Hello World async';
      }
    }

    it('should trace an async function', async () => {
      const instance = new AsyncClass();
      const response = await instance.helloWorldAsync();

      expect(response).toEqual('Hello World async');
      expect(asyncTraceHandlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'AsyncClass',
            method: 'helloWorldAsync',
            name: 'helloWorldAsync',
            parameters: [],
            isAsync: true,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation
        })
      );
    });
  });

  describe('Tracing function traceHandlerMock and traceContext', () => {
    const traceContextDivision = { context: { metadata: { requestId: '12345' } } };
    const traceContextFetchData = { context: { metadata: { requestId: '6789' } } };
    const traceHandlerDivisionMock = jest.fn();
    const traceHandlerFetchDataMock = jest.fn();

    function empty(): MethodDecorator {
      return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: unknown[]) {
          return originalMethod.apply(this, args);
        };
      };
    }

    class MyClass {
      @trace(traceHandlerDivisionMock, traceContextDivision, { contextKey: '__execution' })
      divisionFunction(x: number, y: number, traceContext: Record<string, unknown> = {}): number {
        if (y === 0) {
          traceContext['narratives'] = [`Throwing because division of ${x} by ${y}`];
          throw new Error('Throwing because division by zero is not allowed.');
        }
        traceContext['narratives'] = [`Calculating the division of ${x} by ${y}`];
        return x / y;
      }

      @trace(traceHandlerFetchDataMock, traceContextFetchData, { contextKey: '__execution' })
      async fetchDataFunction(url: string, traceContext: Record<string, unknown> = {}): Promise<{ data: string }> {
        traceContext['narratives'] = [`Fetching data from ${url}`];
        if (!url.startsWith('http')) {
          traceContext['narratives'] = [`Throwing because the URL ${url} is invalid`];
          throw new Error('Invalid URL provided.');
        }
        return { data: 'Success' };
      }

      @trace(traceHandlerDivisionMock, traceContextDivision)
      @empty()
      divisionFunctionOnAnotherDecorator(x: number, y: number, traceContext: Record<string, unknown> = {}): number {
        return this.divisionFunction(x, y, traceContext);
      }

      @trace(traceHandlerFetchDataMock, traceContextFetchData)
      @empty()
      async fetchDataFunctionOnAnotherDecorator(
        url: string,
        traceContext: Record<string, unknown> = {}
      ): Promise<{
        data: string;
      }> {
        return this.fetchDataFunction(url, traceContext);
      }

      @trace(traceHandlerFetchDataMock, traceContextFetchData, { errorStrategy: 'catch' })
      @empty()
      async fetchDataFunctionOnAnotherDecoratorCoughtError(
        url: string,
        traceContext: Record<string, unknown> = {}
      ): Promise<{ data: string }> {
        return this.fetchDataFunction(url, traceContext);
      }
    }

    beforeEach(() => {
      traceHandlerFetchDataMock.mockClear();
      traceHandlerDivisionMock.mockClear();
    });

    it('should sync trace successfully and pass correct traceHandlerMock and traceContext', () => {
      const classInstance = new MyClass();
      const response = classInstance.divisionFunction(1, 2);
      expect(traceHandlerDivisionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'divisionFunction',
            name: 'divisionFunction',
            parameters: ['x', 'y', 'traceContext = {}'],
            isAsync: false,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation,
          ...traceContextDivision,
          narratives: ['Calculating the division of 1 by 2']
        })
      );
      expect(response).toEqual(0.5);
    });

    it('should sync trace errors and pass correct traceHandlerMock and traceContext', () => {
      expect(() => new MyClass().divisionFunction(1, 0)).toThrow('Throwing because division by zero is not allowed.');

      expect(traceHandlerDivisionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'divisionFunction',
            name: 'divisionFunction',
            parameters: ['x', 'y', 'traceContext = {}'],
            isAsync: false,
            isBound: false
          }),
          ...failedExecutionTraceExpectation,
          ...traceContextDivision,
          narratives: ['Throwing because division of 1 by 0']
        })
      );
    });

    it('should async trace successfully and pass correct traceHandlerMock and traceContext', async () => {
      const response = await new MyClass().fetchDataFunction('https://api.example.com/data');
      expect(traceHandlerFetchDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'fetchDataFunction',
            name: 'fetchDataFunction',
            parameters: ['url', 'traceContext = {}'],
            isAsync: true,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation,
          ...traceContextFetchData,
          narratives: ['Fetching data from https://api.example.com/data']
        })
      );
      expect(response).toMatchObject({ data: 'Success' });
    });

    it('should async trace errors and pass correct traceHandlerMock and traceContext', async () => {
      await expect(new MyClass().fetchDataFunction('invalid-url')).rejects.toThrow('Invalid URL provided.');
      expect(traceHandlerFetchDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'fetchDataFunction',
            name: 'fetchDataFunction',
            parameters: ['url', 'traceContext = {}'],
            isAsync: true,
            isBound: false
          }),
          ...failedExecutionTraceExpectation,
          ...traceContextFetchData,
          narratives: ['Throwing because the URL invalid-url is invalid']
        })
      );
    });

    it('should async trace successfully divisionFunctionOnAnotherDecorator', async () => {
      const classInstance = new MyClass();
      const response = classInstance.divisionFunctionOnAnotherDecorator(1, 2);
      expect(traceHandlerDivisionMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'divisionFunctionOnAnotherDecorator',
            name: 'anonymous',
            parameters: ['...args'],
            isAsync: false,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation,
          ...traceContextDivision,
          isPromise: false,
          narratives: ['Calculating the division of 1 by 2']
        })
      );
      expect(response).toEqual(0.5);
    });

    it('should async trace error divisionFunctionOnAnotherDecorator', async () => {
      expect(() => new MyClass().divisionFunctionOnAnotherDecorator(1, 0)).toThrow('Throwing because division by zero is not allowed.');
      expect(traceHandlerDivisionMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'divisionFunctionOnAnotherDecorator',
            name: 'anonymous',
            parameters: ['...args'],
            isAsync: false,
            isBound: false
          }),
          ...failedExecutionTraceExpectation,
          ...traceContextDivision,
          isPromise: false,
          narratives: ['Throwing because division of 1 by 0']
        })
      );
    });

    it('should async trace successfully fetchDataFunctionOnAnotherDecorator', async () => {
      const response = await new MyClass().fetchDataFunctionOnAnotherDecorator('https://api.example.com/data');
      expect(traceHandlerFetchDataMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'fetchDataFunctionOnAnotherDecorator',
            name: 'anonymous',
            parameters: ['...args'],
            isAsync: false,
            isBound: false
          }),
          ...successfulExecutionTraceExpectation,
          ...traceContextFetchData,
          isPromise: true,
          narratives: ['Fetching data from https://api.example.com/data']
        })
      );
      expect(response).toMatchObject({ data: 'Success' });
    });

    it('should async trace error fetchDataFunctionOnAnotherDecorator', async () => {
      await expect(new MyClass().fetchDataFunctionOnAnotherDecorator('invalid-url')).rejects.toThrow('Invalid URL provided.');
      expect(traceHandlerFetchDataMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'fetchDataFunctionOnAnotherDecorator',
            name: 'anonymous',
            parameters: ['...args'],
            isAsync: false,
            isBound: false
          }),
          ...failedExecutionTraceExpectation,
          ...traceContextFetchData,
          isPromise: true,
          narratives: ['Throwing because the URL invalid-url is invalid']
        })
      );
    });

    it('should async trace error fetchDataFunctionOnAnotherDecorator cought', async () => {
      const response = await new MyClass().fetchDataFunctionOnAnotherDecoratorCoughtError('invalid-url');
      expect(traceHandlerFetchDataMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            class: 'MyClass',
            method: 'fetchDataFunctionOnAnotherDecoratorCoughtError',
            name: 'anonymous',
            parameters: ['...args'],
            isAsync: false,
            isBound: false
          }),
          ...failedExecutionTraceExpectation,
          ...traceContextFetchData,
          isPromise: true,
          narratives: ['Throwing because the URL invalid-url is invalid']
        })
      );

      expect(response).toMatchObject([{ code: undefined, message: 'Invalid URL provided.', name: 'Error' }]);
    });
  });
});
