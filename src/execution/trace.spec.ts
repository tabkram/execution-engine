import { executionTrace } from './trace';
import { EngineNodeData } from '../common/models/engineNodeData.model';

describe('ExecutionTrace', () => {
  const executionTraceExpectation = {
    id: expect.any(String),
    inputs: expect.any(Array),
    startTime: expect.any(Date),
    endTime: expect.any(Date),
    duration: expect.any(Number),
    elapsedTime: expect.any(String)
  };
  const successfullExecutionTraceExpectation = {
    ...executionTraceExpectation,
    outputs: expect.anything()
  };
  const failedExecutionTraceExpectation = {
    ...executionTraceExpectation,
    errors: expect.anything()
  };

  describe('Tracing synchronous functions', () => {
    it('should trace a synchronous function without parameters', () => {
      function helloWorld(): string {
        return 'Hello World response No Params!';
      }

      const response = executionTrace(helloWorld);
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });

    it('should trace a synchronous function with trace parameter', () => {
      function helloWorldWithTrace(trace: EngineNodeData): string {
        trace.narratives = ['HELLO WORLD AS NARRATIVE!'];
        return 'Hello World response with Trace!';
      }

      const response = executionTrace(helloWorldWithTrace);
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });
  });

  describe('Tracing asynchronous functions', () => {
    it('should trace an async function without parameters', async () => {
      async function helloWorldAsync(): Promise<string> {
        return 'Hello World async response!';
      }

      const response = await executionTrace(helloWorldAsync);
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });

    it('should trace an async function with trace parameter', async () => {
      async function helloWorldAsyncWithTrace(trace: EngineNodeData): Promise<string> {
        trace.narratives = ['HELLO WORLD AS NARRATIVE!'];
        return 'Hello World async response with Trace!';
      }

      const response = await executionTrace(helloWorldAsyncWithTrace);
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });
  });

  describe('Tracing error scenarios', () => {
    function throwErrorFunction(param: string) {
      throw new Error(`Sample Error: ${param}`);
    }

    async function asyncThrowErrorFunction(param: string): Promise<void> {
      throw new Error(`Sample Async Error: ${param}`);
    }

    it('should trace a synchronous function throwing an error', () => {
      const response = executionTrace(throwErrorFunction, ['ErrorParam'], undefined, { errorStrategy: 'catch' });
      expect(response).toMatchObject({
        ...failedExecutionTraceExpectation,
        inputs: ['ErrorParam'],
        errors: [
          {
            code: undefined,
            message: 'Sample Error: ErrorParam',
            name: 'Error'
          }
        ]
      });
    });

    it('should trace an async function throwing an error', async () => {
      const response = await executionTrace(asyncThrowErrorFunction, ['ErrorParam'], undefined, { errorStrategy: 'catch' });
      expect(response).toMatchObject({
        ...failedExecutionTraceExpectation,
        inputs: ['ErrorParam'],
        errors: [
          {
            code: undefined,
            message: 'Sample Async Error: ErrorParam',
            name: 'Error'
          }
        ]
      });
    });
  });

  describe('Tracing function onTraceEventMock and traceContext', () => {
    const divisionFunction = (x: number, y: number, traceContext: Record<string, unknown>) => {
      if (y === 0) {
        traceContext['narratives'] = [`Throwing because division of ${x} by ${y}`];
        throw new Error('Throwing because division by zero is not allowed.');
      }
      traceContext['narratives'] = [`Calculating the division of ${x} by ${y}`];
      return x / y;
    };

    const fetchDataFunction = async (url: string, traceContext: Record<string, unknown>) => {
      traceContext['narratives'] = [`Fetching data from ${url}`];
      if (!url.startsWith('http')) {
        traceContext['narratives'] = [`Throwing because the URL ${url} is invalid`];
        throw new Error('Invalid URL provided.');
      }
      return { data: 'Success' };
    };

    it('should sync trace successfully and pass correct onTraceEventMock and traceContext', () => {
      const onTraceEventMock = jest.fn();
      const response = executionTrace.bind({ __execution: { context: { metadata: { requestId: '12345' } } } })(
        divisionFunction,
        [1, 2],
        onTraceEventMock
      );
      expect(onTraceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.any(Object),
          ...successfullExecutionTraceExpectation,
          narratives: ['Calculating the division of 1 by 2']
        })
      );
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });

    it('should sync trace errors and pass correct onTraceEventMock and traceContext', () => {
      const onTraceEventMock = jest.fn();
      const traceContextMock = { context: { metadata: { requestId: '12345' } } };
      const response = executionTrace.bind({ __execution: traceContextMock })(divisionFunction, [1, 0], onTraceEventMock, {
        errorStrategy: 'catch',
        contextKey: '__execution'
      });
      expect(onTraceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...failedExecutionTraceExpectation,
          ...traceContextMock,
          narratives: ['Throwing because division of 1 by 0']
        })
      );
      expect(response).toMatchObject(failedExecutionTraceExpectation);
    });

    it('should async trace successfully and pass correct onTraceEventMock and traceContext', async () => {
      const onTraceEventMock = jest.fn();
      const traceContextMock = { context: { metadata: { requestId: '12345' } } };
      const response = await (executionTrace.bind({ __execution: traceContextMock }) as typeof executionTrace)(
        fetchDataFunction,
        ['https://api.example.com/data'],
        onTraceEventMock,
        { contextKey: '__execution' }
      );
      expect(onTraceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...successfullExecutionTraceExpectation,
          ...traceContextMock,
          narratives: ['Fetching data from https://api.example.com/data']
        })
      );
      expect(response).toMatchObject(successfullExecutionTraceExpectation);
    });

    it('should async trace errors and pass correct onTraceEventMock and traceContext', async () => {
      const onTraceEventMock = jest.fn();
      const traceContextMock = { context: { metadata: { requestId: '12345' } } };
      const response = await executionTrace.bind({ __execution: traceContextMock })(fetchDataFunction, ['invalid-url'], onTraceEventMock, {
        errorStrategy: 'catch',
        contextKey: '__execution'
      });
      expect(onTraceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...failedExecutionTraceExpectation,
          ...traceContextMock,
          narratives: ['Throwing because the URL invalid-url is invalid']
        })
      );
      expect(response).toMatchObject(failedExecutionTraceExpectation);
    });

    it('should throw an error and trace context when provided with an invalid URL', async () => {
      const onTraceEventMock = jest.fn();
      const traceContextMock = { context: { metadata: { requestId: '12345' } } };

      // Expect the trace function to throw an error for an invalid URL
      await expect(
        (executionTrace.bind({ __execution: traceContextMock }) as typeof executionTrace)(
          fetchDataFunction,
          ['invalid-url'],
          onTraceEventMock,
          { contextKey: '__execution' }
        )
      ).rejects.toThrow('Invalid URL provided.'); // Check the error message

      expect(onTraceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...failedExecutionTraceExpectation,
          ...traceContextMock,
          narratives: ['Throwing because the URL invalid-url is invalid']
        })
      );
    });
  });
});
