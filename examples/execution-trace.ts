/**
 * Execution example — one call, recorded.
 *
 * No engine, no graph, no wiring: `executionTrace` runs a single function and
 * hands back what it did — the inputs it received, the value it returned, when
 * it started and finished, and how long it took. The function itself is
 * untouched and still returns its own value to its own caller.
 *
 * This is the smallest thing the library does, and the whole of part one.
 */
import { executionTrace } from '../src';
import { writeTrace } from './common/writeTrace';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Invoice {
  id: string;
  total: number;
  currency: string;
}

/** Pretends to be a database round trip. */
async function fetchInvoice(id: string): Promise<Invoice> {
  await sleep(45);
  return { id, total: 128.4, currency: 'EUR' };
}

export async function run() {
  const trace = await executionTrace(fetchInvoice, ['inv_204']);

  console.log(`${trace.outputs.id} took ${trace.elapsedTime}`);
  writeTrace(JSON.stringify(trace, null, 2));
}

run().then();
