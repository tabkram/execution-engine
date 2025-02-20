// Define a custom error class for testing
import { safeError } from './safeError';

class CustomError extends Error {
  code: number;

  constructor(message, code) {
    super(message);
    this.name = 'CustomError';
    this.code = code; // Add custom attribute
  }
}

describe('safeError', () => {
  it('should return a message for null', () => {
    const error = null;
    const result = safeError(error);
    expect(result).toEqual(null);
  });

  it('should return a message for undefined', () => {
    const error = undefined;
    const result = safeError(error);
    expect(result).toEqual('undefined');
  });

  it('should return a string representation for primitive values', () => {
    const error = 123;
    const result = safeError(error);
    expect(result).toEqual(123);
  });

  it('should return a message for a date', () => {
    const error = new Date();
    const result = safeError(error);
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    expect(iso8601Regex.test(result)).toBe(true);
  });

  it('should return a JSON representation for a simple object', () => {
    const error = { name: 'NotFoundError', code: 404, message: 'Not found' };
    const result = safeError(error);
    expect(result).toEqual({
      name: 'NotFoundError',
      code: 404,
      message: 'Not found'
    });
  });

  it('should return an object with name and message for an Error instance', () => {
    const error = new Error('Test error');
    const result = safeError(error);
    expect(result).toEqual({
      name: 'Error',
      message: 'Test error'
    });
  });

  it('should return an object with name, message, and code for a custom error', () => {
    const error = new CustomError('This is a custom error', 404);
    const result = safeError(error);
    expect(result).toEqual({
      name: 'CustomError',
      message: 'This is a custom error',
      code: 404
    });
  });

  it('should return a string representation for non-serializable values', () => {
    const error = new Map([['key', 'value']]);
    const result = safeError(error);
    expect(result).toEqual({});
  });

  it('should handle non-serializable types gracefully', () => {
    const error = {
      apromise: Promise.resolve('resolved'), // Promise
      aregex: new RegExp('ab+c'), // Regular Expression
      asymbol: Symbol('symbol'), // Symbol
      afunction: () => 'this is a function', // Function
      aweakmap: new WeakMap([[{}, 'value']]) // WeakMap (non-serializable)
    };

    const result = safeError(error);

    expect(result).toEqual({
      apromise: {},
      aregex: {},
      aweakmap: {}
    });
  });

  it('should handle circular references in subobjects gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularObject: any = {
      name: 'Circular Object',
      child: {}
    };

    // Creating a circular reference in the child object
    circularObject.child.parent = circularObject;

    const result = safeError(circularObject);
    expect(result).toEqual('[object Object]'); // or some representation of the error
  });
});
