/**
 * Engine example — four ordinary calls, one graph.
 *
 * A nightly job: read the export, drop the bad rows, roll it up, write the
 * report. The functions are plain functions and know nothing about tracing —
 * the only change is that they are called through `engine.run` instead of
 * directly.
 *
 * That is enough. The engine records each call as a node, infers the edge from
 * the call that came before, and `getTrace()` hands back the whole run: four
 * nodes, three edges, a timing on each.
 */
import { ExecutionEngine } from '../src';
import { writeTrace } from './common/writeTrace';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Order {
  id: string;
  total: number;
  region: string;
}

async function readExport(path: string): Promise<Order[]> {
  await sleep(38);
  return [
    { id: 'o_1', total: 42, region: 'eu' },
    { id: 'o_2', total: 0, region: 'eu' },
    { id: 'o_3', total: 91, region: 'us' }
  ];
}

function dropInvalid(orders: Order[]): Order[] {
  return orders.filter((order) => order.total > 0);
}

async function summarise(orders: Order[]): Promise<Record<string, number>> {
  await sleep(24);

  return orders.reduce<Record<string, number>>((totals, order) => {
    totals[order.region] = (totals[order.region] ?? 0) + order.total;
    return totals;
  }, {});
}

async function writeReport(totals: Record<string, number>): Promise<string> {
  await sleep(16);
  return `${Object.keys(totals).length} regions written`;
}

export async function run() {
  const engine = new ExecutionEngine();

  const orders = (await engine.run(readExport, ['orders.csv'])).outputs as Order[];
  const valid = engine.run(dropInvalid, [orders]).outputs as Order[];
  const totals = (await engine.run(summarise, [valid])).outputs as Record<string, number>;
  const report = await engine.run(writeReport, [totals]);

  console.log('report:', report.outputs);
  writeTrace(JSON.stringify(engine.getTrace(), null, 2));
}

run().then();
