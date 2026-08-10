/**
 * Execution example — one call for many callers.
 *
 * Twelve components on a page all need the same feature flags, and they all ask
 * at once. `@memoize` stores the in-flight promise rather than the finished
 * value, so the eleven that arrive while the first call is still running await
 * that call instead of starting their own.
 *
 * Note what does *not* happen: nobody waits longer. All twelve settle together,
 * a few milliseconds after the single request they shared.
 *
 * `cache` would not do this — it stores a result only once the call succeeds,
 * so twelve simultaneous callers would all miss and all run.
 */
import { memoize } from '../src';
import { MemoizationContext } from '../src/common/models/executionMemoization.model';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let executions = 0;
let reused = 0;

class FeatureFlags {
  /** The callback fires for every caller and says which side it landed on. */
  @memoize((context: MemoizationContext<Promise<Record<string, boolean>>>) => {
    context.isMemoized ? reused++ : executions++;
  })
  async load(env: string): Promise<Record<string, boolean>> {
    await sleep(80);
    return { newCheckout: env === 'prod', darkMode: true };
  }
}

const flags = new FeatureFlags();

export async function run() {
  const started = performance.now();

  // Twelve components, rendering together, each asking for what it needs.
  await Promise.all(Array.from({ length: 12 }, () => flags.load('prod')));

  const total = Math.round((performance.now() - started) * 100) / 100;

  console.log(`12 calls, ${executions} execution, ${reused} reused`);
  console.log(`all settled in ${total} ms`);
}

run().then();
