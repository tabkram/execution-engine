import { execute } from './execute';

describe('execute function', () => {
  test('should execute a synchronous function and return result', () => {
    const syncFunction = (x: number, y: number) => x + y;
    const result = execute(syncFunction, [2, 3]);
    expect(result).toBe(5);
  });

  test('should execute an async function and return resolved result', async () => {
    const asyncFunction = async (x: number, y: number) => x + y;
    const result = await execute(asyncFunction, [2, 3]);
    expect(result).toBe(5);
  });

  test('should execute an async function and return resolved result or fallback value', async () => {
    const asyncFunction = (x: number, y: number) =>
      x + y > 0 ? Promise.resolve({ result: x + y, message: `positive string: ${x + y}` }) : false;

    const resultOfPositive = (await execute(asyncFunction, [2, 3])) as string;
    expect(resultOfPositive).toMatchObject({ result: 5, message: 'positive string: 5' });

    const resultOfNegative = execute(asyncFunction, [2, -10]) as string;
    expect(resultOfNegative).toBe(false);
  });

  test('should call successCallback with the result', () => {
    const syncFunction = (x: number) => x * 2;
    const successCallback = jest.fn((output) => output + 1);
    const result = execute(syncFunction, [3], [], successCallback);
    expect(successCallback).toHaveBeenCalledWith(6);
    expect(result).toBe(7);
  });

  test('should call successCallback with the async result', async () => {
    const asyncFunction = async (x: number) => x * 2;
    const successCallback = jest.fn((output) => output + 1);
    const result = (await execute(asyncFunction, [3], [], successCallback)) satisfies number;
    expect(successCallback).toHaveBeenCalledWith(6);
    expect(result).toBe(7);
  });

  test('should call errorCallback when sync function throws an error', () => {
    const syncFunction = () => {
      throw new Error('Test Error');
    };
    const errorCallback = jest.fn((error) => `Handled: ${error.message}`);
    const result = execute(syncFunction, [], [], undefined, errorCallback);
    expect(errorCallback).toHaveBeenCalledWith(new Error('Test Error'));
    expect(result).toBe('Handled: Test Error');
  });

  test('should call errorCallback when async function rejects', async () => {
    const asyncFunction = async () => {
      throw new Error('Async Error');
    };
    const errorCallback = jest.fn((error) => `Handled: ${error.message}`);
    const result = await execute(asyncFunction, [], [], undefined, errorCallback);
    expect(errorCallback).toHaveBeenCalled();
    expect(result).toBe('Handled: Async Error');
  });

  test('should return error if no errorCallback is provided for sync function', () => {
    const syncFunction = () => {
      throw new Error('No handler');
    };
    const result = execute(syncFunction, []);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('No handler');
  });

  test('should return error if no errorCallback is provided for async function', async () => {
    const asyncFunction = async () => {
      throw new Error('No handler Async');
    };
    const result = await execute(asyncFunction, []);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('No handler Async');
  });

  test('should throw an error if function requires more parameters than provided', () => {
    const syncFunction = (x: number, y: number, z: number) => x + y + z;
    expect(() => execute(syncFunction, [1, 2])).toThrowError(
      "Could not trace your function properly if you don't provide parameters: (x,y,z)"
    );
  });
});
