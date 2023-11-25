import { ExecutionEngine } from './executionEngine';

class TestExecutionEngine extends ExecutionEngine<{ user: { name?: string; age?: number }; itemsBought?: Array<string> }> {
  // Expose protected members for testing
  constructor() {
    super({ executionId: 'customId' });
  }

  getTags() {
    return this.tags;
  }
}

describe('ExecutionEngine', () => {
  // Test case for the constructor and basic properties
  test('should create an instance with default values', () => {
    const execution = new TestExecutionEngine();
    expect(execution).toBeInstanceOf(TestExecutionEngine);
    expect(execution.getContext()).toBeUndefined();
    expect(execution.getTags()).toEqual([]);
  });

  // Test case for setContext method
  test('should set context with setContext method', () => {
    const execution = new TestExecutionEngine();
    const contextValue = { user: { name: 'John' } };
    execution.setContext(contextValue);
    expect(execution.getContext()).toEqual(contextValue);
  });

  // Test case for updateContext method
  test('should update context with updateContext method', () => {
    const execution = new TestExecutionEngine();
    const initialContext = { user: { age: 25 } };
    execution.setContext(initialContext);

    const partialContext = { user: { name: 'John' }, itemsBought: ['phone'] };
    execution.updateContext(partialContext);

    const expectedContext = { user: { name: 'John' }, itemsBought: ['phone'] };
    expect(execution.getContext()).toEqual(expectedContext);
  });

  // Test case for updateContextAttribute method
  test('should update a specific attribute with updateContextAttribute method', () => {
    const execution = new TestExecutionEngine();
    const initialContext = { user: { name: 'John' } };
    execution.setContext(initialContext);

    const partialContextAttribute = { age: 25 };
    execution.updateContextAttribute('user', partialContextAttribute);

    const expectedContext = { user: { name: 'John', age: 25 } };
    expect(execution.getContext()).toEqual(expectedContext);
  });

  // Test case for tag method
  test('should add a tag with tag method', () => {
    const execution = new TestExecutionEngine();
    const tag = 'important';
    execution.tag(tag);
    expect(execution.getTags()).toContain(tag);
  });
});
