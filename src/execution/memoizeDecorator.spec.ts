import { memoize } from './memoizeDecorator';
import { MemoizationContext } from '../common/models/executionMemoization.model';

describe('memoize decorator', () => {
  it('should memoize Fibonacci results and prevent redundant function calls', async () => {
    let memoizationCheckCount = 0;
    let memoizedCalls = 0;
    let totalFunctionCalls = 0;

    class Calculator {
      @memoize((memoContext: MemoizationContext<number>) => {
        memoizationCheckCount++;
        if (memoContext.isMemoized) {
          memoizedCalls++;
        }
      })
      fibonacci(n: number): number {
        totalFunctionCalls++;
        if (n <= 1) {
          return n;
        }
        return this.fibonacci(n - 1) + this.fibonacci(n - 2);
      }
    }

    const calculator = new Calculator();
    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    const fib3 = calculator.fibonacci(3);
    expect(memoizedCalls).toBe(0);
    expect(totalFunctionCalls).toBe(5); // fib(3) = (fib(2) = fib(1) + fib(0)) + fib(1)
    expect(memoizationCheckCount).toEqual(totalFunctionCalls + memoizedCalls);
    expect(fib3).toBe(2);

    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    // first call:
    const fib50_1 = calculator.fibonacci(50);
    expect(memoizedCalls).toBeGreaterThan(0);
    expect(totalFunctionCalls).toBeLessThan(1274); // 1274 calls for fibonacci(50) if all exist
    expect(memoizationCheckCount).toEqual(totalFunctionCalls + memoizedCalls);
    expect(fib50_1).toBe(12586269025);
    const memoizedCallsAfterFirstCall = memoizedCalls;
    const totalFunctionCallsAfterFirstCall = totalFunctionCalls;

    // second call:
    const fib50_2 = calculator.fibonacci(50);
    expect(memoizedCalls).toBe(memoizedCallsAfterFirstCall + 1); // a new get of memoized fib50
    expect(totalFunctionCalls).toBe(totalFunctionCallsAfterFirstCall); // no new call, fib50 is memoized
    expect(memoizationCheckCount).toEqual(totalFunctionCalls + memoizedCalls);
    expect(fib50_2).toBe(12586269025);

    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    const fib51 = calculator.fibonacci(51);
    expect(totalFunctionCalls).toBe(1); // we need 1 extra call to get fibonacci of 51 as we did fibonacci(50)
    expect(memoizedCalls).toBe(2); // yes fib(51-1) and fib(51-2) are memoized
    expect(memoizationCheckCount).toBe(3); // 2memoized and 1 call
    expect(fib51).toBe(20365011074);

    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    const fib5 = calculator.fibonacci(6);
    expect(totalFunctionCalls).toBe(0); // no need for extra call to get fibonacci of 5 as we did fibonacci(50)
    expect(memoizedCalls).toBe(1); // yes fib(5) is memoized implicitly
    expect(memoizationCheckCount).toBe(1); // 1memoized
    expect(fib5).toBe(8);
  });
});
