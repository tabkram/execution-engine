/**
 * Execution example — a result kept for a while.
 *
 * A currency service that nobody wants to call twice a second. `@cache` keeps
 * each successful lookup for a minute, keyed on the arguments, so the second
 * request for the same base currency never reaches the API. A different base is
 * a different key, and runs.
 *
 * Still no engine and no graph — one decorated method, called three times.
 */
import { cache } from '../src';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Rates {
  base: string;
  usd: number;
}

/** Counts what really left the process, as opposed to what was asked for. */
let apiCalls = 0;

class ExchangeRates {
  /** Keyed on the arguments by default: `'EUR'` and `'GBP'` are separate entries. */
  @cache({ ttl: 60_000 })
  async get(base: string): Promise<Rates> {
    apiCalls++;
    await sleep(70);
    return { base, usd: base === 'EUR' ? 1.09 : 1.27 };
  }
}

const rates = new ExchangeRates();

/** Runs the call and reports how long this particular one took. */
async function timed(base: string): Promise<{ base: string; ms: number }> {
  const started = performance.now();
  await rates.get(base);

  return { base, ms: Math.round((performance.now() - started) * 100) / 100 };
}

export async function run() {
  const first = await timed('EUR');
  const second = await timed('EUR');
  const other = await timed('GBP');

  console.log(`EUR  ${first.ms} ms   ← miss, calls the API`);
  console.log(`EUR  ${second.ms} ms   ← hit, served from the store`);
  console.log(`GBP  ${other.ms} ms   ← different key, so it runs`);
  console.log(`3 calls, ${apiCalls} reached the API`);
}

run().then();
