import { cache } from './cache.decorator';

describe('cache decorator', () => {
  it('should cache async function results and prevent redundant calls', async () => {
    let memoizationCheckCount = 0;
    let memoizedCalls = 0;
    let totalFunctionCalls = 0;
    let bypassCache= false;
    class DataService {
      @cache({
        ttl: 3000,
        onCacheEvent: (cacheContext) => {
          memoizationCheckCount++;
          if (cacheContext.isCached && !cacheContext.isBypassed) {
            memoizedCalls++;
          }
        }
      })
      async fetchData(id: number): Promise<string> {
        totalFunctionCalls++;
        return new Promise((resolve) => setTimeout(() => resolve(`Data for ID: ${id}`), 100));
      }

      @cache({
        ttl: 3000,
        bypass: () => bypassCache,
        onCacheEvent: (cacheContext) => {
          memoizationCheckCount++;
          if (cacheContext.isCached && !cacheContext.isBypassed) {
            memoizedCalls++;
          }
        }
      })
      async fetchDataWithByPassedCacheFunction(id: number): Promise<string> {
        totalFunctionCalls++;
        return new Promise((resolve) => setTimeout(() => resolve(`Data for ID: ${id}`), 100));
      }

      @cache({
        ttl: 3000,
        onCacheEvent: (cacheContext) => {
          memoizationCheckCount++;
          if (cacheContext.isCached) {
            memoizedCalls++;
          }
        }
      })
      async throwData(name: string): Promise<string> {
        totalFunctionCalls++;
        throw new Error(`hello ${name} but I throw!`);
      }
    }

    const service = new DataService();

    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;

    const result1 = await service.fetchData(1);
    expect(result1).toBe('Data for ID: 1');
    expect(memoizedCalls).toBe(0);
    expect(totalFunctionCalls).toBe(1);
    expect(memoizationCheckCount).toBe(1); // Called once

    const result2 = await service.fetchData(1);
    expect(result2).toBe('Data for ID: 1');
    expect(memoizedCalls).toBe(1); // Now it should be memoized
    expect(totalFunctionCalls).toBe(1); // No new calls
    expect(memoizationCheckCount).toBe(2); // Checked twice

    const result3 = await service.fetchData(2);
    expect(result3).toBe('Data for ID: 2');
    expect(memoizedCalls).toBe(1); // No extra memoized calls yet
    expect(totalFunctionCalls).toBe(2); // New call for different ID
    expect(memoizationCheckCount).toBe(3); // Three checks (1st, 2nd for ID 1, and 3rd for ID 2)

    const result4 = await service.fetchData(2);
    expect(result4).toBe('Data for ID: 2');
    expect(memoizedCalls).toBe(2); // ID 2 result is now memoized
    expect(totalFunctionCalls).toBe(2); // No extra new calls
    expect(memoizationCheckCount).toBe(4); // 4 checks in total

    // test NO cache for a Bypassed cache function
    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    const result21 = await service.fetchDataWithByPassedCacheFunction(2);
    expect(result21).toBe('Data for ID: 2');
    expect(memoizedCalls).toBe(0); // ID 2 result is now memoized
    expect(totalFunctionCalls).toBe(1); // extra new call
    expect(memoizationCheckCount).toBe(1); // 5 checks in total

    bypassCache = false;
    const result22 = await service.fetchDataWithByPassedCacheFunction(2);
    expect(result22).toBe('Data for ID: 2');
    expect(memoizedCalls).toBe(1); // ID 2 result is now memoized
    expect(totalFunctionCalls).toBe(1); // NO extra new call
    expect(memoizationCheckCount).toBe(2); // 2 checks in total

    bypassCache = true;
    const result23 = await service.fetchDataWithByPassedCacheFunction(2);
    expect(result23).toBe('Data for ID: 2');
    expect(memoizedCalls).toBe(1); // ID 2 result is NOT RETRIEVED FROM CACHE AS THEY ARE BYPASSED
    expect(totalFunctionCalls).toBe(2); // extra new call as  bypassCache = true
    expect(memoizationCheckCount).toBe(3); // 5 checks in total



    // test NO cache for a throwing async method
    memoizationCheckCount = 0;
    memoizedCalls = 0;
    totalFunctionCalls = 0;
    await Promise.all([
      expect(service.throwData('akram')).rejects.toThrow('hello akram but I throw!'),
      expect(service.throwData('akram')).rejects.toThrow('hello akram but I throw!'),
      expect(service.throwData('akram')).rejects.toThrow('hello akram but I throw!')
    ]);
    expect(memoizationCheckCount).toEqual(totalFunctionCalls + memoizedCalls);
    expect(memoizedCalls).toEqual(0); // No cache
    expect(totalFunctionCalls).toBe(3); // we call everytime we get a throw
  });
});
