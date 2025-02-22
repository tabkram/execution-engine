import { trace } from './traceDecorator';

describe('trace decorator', () => {
  const executionTraceExpectation = {
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

  describe('Synchronous functions', () => {
    class SyncClass {
      @trace()
      helloWorld(): string {
        return 'Hello World';
      }
    }

    it('should trace a synchronous function', () => {
      const instance = new SyncClass();
      const response = instance.helloWorld();
      expect(response).toEqual('Hello World');
    });
  });

  describe('Asynchronous functions', () => {
    class AsyncClass {
      @trace()
      async helloWorldAsync(): Promise<string> {
        return 'Hello World async';
      }
    }

    it('should trace an async function', async () => {
      const instance = new AsyncClass();
      const response = await instance.helloWorldAsync();
      expect(response).toEqual('Hello World async');
    });
  });

  describe('Tracing function traceHandlerMock and traceContext', () => {
    const traceContextDivision = { metadata: { requestId: '12345' } };
    const traceContextFetchData = { metadata: { requestId: '6789' } };
    const traceHandlerDivisionMock= jest.fn();
    const traceHandlerFetchDataMock= jest.fn();
    class MyClass {
      @trace(traceHandlerDivisionMock, traceContextDivision)
      divisionFunction(x: number, y: number, traceContext: Record<string, unknown> = {}): number {
        if (y === 0) {
          traceContext['narratives'] = [`Throwing because division of ${x} by ${y}`];
          throw new Error('Throwing because division by zero is not allowed.');
        }
        traceContext['narratives'] = [`Calculating the division of ${x} by ${y}`];
        return x / y;
      }

      @trace(traceHandlerFetchDataMock, traceContextFetchData)
      async fetchDataFunction(url: string, traceContext: Record<string, unknown> = {}): Promise<{ data: string }> {
        traceContext['narratives'] = [`Fetching data from ${url}`];
        if (!url.startsWith('http')) {
          traceContext['narratives'] = [`Throwing because the URL ${url} is invalid`];
          throw new Error('Invalid URL provided.');
        }
        return { data: 'Success' };
      }
    }

    it('should sync trace successfully and pass correct traceHandlerMock and traceContext', () => {

      const classInstance = new MyClass();
      const response = classInstance.divisionFunction(1, 2);
      expect(traceHandlerDivisionMock).toHaveBeenCalledWith(
        { ...traceContextDivision, narratives: ['Calculating the division of 1 by 2'] },
        expect.objectContaining(successfulExecutionTraceExpectation)
      );
      expect(response).toEqual(0.5);


    });

    it('should sync trace errors and pass correct traceHandlerMock and traceContext', async () => {
      expect(() => new MyClass().divisionFunction(1, 0)).toThrow('Throwing because division by zero is not allowed.');
      expect(traceHandlerDivisionMock).toHaveBeenCalledWith(
        { ...traceContextDivision, narratives: ['Throwing because division of 1 by 0'] },
        expect.objectContaining(failedExecutionTraceExpectation)
      );
    });

    it('should async trace successfully and pass correct traceHandlerMock and traceContext', async () => {
      const response =await new MyClass().fetchDataFunction('https://api.example.com/data');
      expect(traceHandlerFetchDataMock).toHaveBeenCalledWith(
        { ...traceContextFetchData, narratives: ['Fetching data from https://api.example.com/data'] },
        expect.objectContaining(successfulExecutionTraceExpectation)
      );
      expect(response).toMatchObject({ data: 'Success' });
    });

    it('should async trace errors and pass correct traceHandlerMock and traceContext', async () => {
      await expect(new MyClass().fetchDataFunction('invalid-url')).rejects.toThrow('Invalid URL provided.');
      expect(traceHandlerFetchDataMock).toHaveBeenCalledWith(
        { ...traceContextFetchData, narratives: ['Throwing because the URL invalid-url is invalid'] },
        expect.objectContaining(failedExecutionTraceExpectation)
      );
    });
  });
});
