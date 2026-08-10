/**
 * Engine example — one checkout, the whole library, through decorators.
 *
 * `@engine` attaches an engine to the class and `@run` sends a method through
 * it, so the call sites stay ordinary method calls: `this.fetchCustomer(id)`,
 * not `engine.run(fetchCustomer, [id])`. The graph comes out the same.
 *
 * What one run exercises:
 *
 *   receiveOrder                                   the entry step
 *   enrichOrder ▸ fetchCustomer ∥ fetchCatalog     nesting, parallel inside it
 *               ▸ fetchCatalog                      cached: the catalog did not move
 *   explodeBundle ▸ explodeBundle ▸ …              recursion, as deep as the bundle
 *   priceOrder  ▸ applyTax ∥ convertCurrency       nesting, parallel inside it
 *               ▸ fetchRates                        memoized: asked twice, ran once
 *   reserveStock ∥ chargeCard                      a fork at the top level
 *                  ▸ authorize → capture           a graph inside a node
 *   confirmOrder                                   and the join
 *
 * The fork is why `config.parallel` exists: without it the engine would chain
 * `chargeCard` after `reserveStock`, because sequence is the only order it can
 * infer from a series of calls. With it, both attach to the step they came from
 * and `confirmOrder` joins them.
 *
 * The catalog is read once before the checkout, the way a warm process would
 * have read it already, so the trace written next to this file is one order in
 * which `fetchCatalog` is answered from the store.
 */
import { cache, engine, EngineTask, memoize, run } from '../src';
import { writeTrace } from './common/writeTrace';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Order {
  id: string;
  customerId: string;
  country: string;
  items: string[];
}

/** Bundles that contain bundles. `sku-1` unpacks two levels down. */
const bundles: Record<string, string[]> = {
  'sku-1': ['sku-1a'],
  'sku-1a': ['sku-1b']
};

/** Both pricing branches ask for rates; these count what really happened. */
let rateFetches = 0;
let rateCallsShared = 0;

/**
 * The catalog is shared across checkouts, so its store is too: `@cache` keeps
 * its entries on the instance, and this instance outlives any one order.
 */
class Catalog {
  @cache({ ttl: 60_000 })
  async lookup(items: string[]): Promise<number> {
    await sleep(38);
    return items.length * 40;
  }
}

const catalog = new Catalog();

// No `id`, so every instance gets its own engine — and its own trace.
@engine()
class Checkout extends EngineTask {
  @run()
  async receiveOrder(id: string): Promise<Order> {
    await sleep(12);
    return { id, customerId: 'c_88', country: 'FR', items: ['sku-1', 'sku-2'] };
  }

  /** A traced step that runs two traced steps of its own, side by side. */
  @run()
  async enrichOrder(order: Order): Promise<{ tier: string; subtotal: number }> {
    const [customer, subtotal] = await Promise.all([this.fetchCustomer(order.customerId), this.fetchCatalog(order.items)]);

    return { tier: customer.tier, subtotal };
  }

  @run({ trace: { label: 'fetchCustomer' }, config: { parallel: 'enrich', traceExecution: true } })
  async fetchCustomer(customerId: string): Promise<{ id: string; tier: string }> {
    await sleep(55);
    return { id: customerId, tier: 'gold' };
  }

  /** Answered from the store on the second checkout, and the node says so. */
  @run({ trace: { label: 'fetchCatalog' }, config: { parallel: 'enrich', traceExecution: true } })
  async fetchCatalog(items: string[]): Promise<number> {
    return catalog.lookup(items);
  }

  /**
   * Recursion. A bundle may contain bundles, so this method calls itself for as
   * many levels as the order happens to have — and the graph nests once per
   * level without anything declaring how deep it goes.
   */
  @run()
  async explodeBundle(sku: string): Promise<string[]> {
    await sleep(14);
    const parts = bundles[sku];

    if (!parts) {
      return [sku];
    }

    const nested = await Promise.all(parts.map((part) => this.explodeBundle(part)));

    return nested.flat();
  }

  /** The other nested step: two branches that both depend on the rates. */
  @run()
  async priceOrder(order: Order, enriched: { subtotal: number }): Promise<{ total: number; usd: number }> {
    const [total, usd] = await Promise.all([
      this.applyTax(order.country, enriched.subtotal),
      this.convertCurrency(order.country, enriched.subtotal)
    ]);

    return { total, usd };
  }

  @run({ trace: { label: 'applyTax' }, config: { parallel: 'price', traceExecution: true } })
  async applyTax(country: string, subtotal: number): Promise<number> {
    const { vat } = await this.fetchRates(country);
    await sleep(18);

    return Math.round(subtotal * (1 + vat) * 100) / 100;
  }

  @run({ trace: { label: 'convertCurrency' }, config: { parallel: 'price', traceExecution: true } })
  async convertCurrency(country: string, subtotal: number): Promise<number> {
    const { eurUsd } = await this.fetchRates(country);
    await sleep(24);

    return Math.round(subtotal * eurUsd * 100) / 100;
  }

  /**
   * Both pricing branches run at the same time and both need this. `@memoize`
   * sits outside `@run`, so the second branch joins the call already in flight
   * and no second node is recorded — the graph shows the one execution there was.
   */
  @memoize((context: { isMemoized?: boolean }) => {
    context.isMemoized ? rateCallsShared++ : rateFetches++;
  })
  @run()
  async fetchRates(country: string): Promise<{ vat: number; eurUsd: number }> {
    await sleep(60);
    return country === 'FR' ? { vat: 0.2, eurUsd: 1.09 } : { vat: 0, eurUsd: 1 };
  }

  @run({ trace: { label: 'reserveStock' }, config: { parallel: 'fulfil', traceExecution: true } })
  async reserveStock(items: string[]): Promise<string> {
    await sleep(42);
    return `${items.length} items held`;
  }

  /** A graph inside a node: two steps of its own, in order. */
  @run({ trace: { label: 'chargeCard' }, config: { parallel: 'fulfil', traceExecution: true } })
  async chargeCard(total: number): Promise<string> {
    const authorization = await this.authorize(total);

    return this.capture(authorization);
  }

  @run()
  async authorize(total: number): Promise<string> {
    await sleep(38);
    return `auth_${Math.round(total)}`;
  }

  @run()
  async capture(authorization: string): Promise<string> {
    await sleep(30);
    return `charged via ${authorization}`;
  }

  @run()
  confirmOrder(order: Order, payment: string): string {
    return `${order.id} confirmed — ${payment}`;
  }
}

async function checkout(orderId: string) {
  // Its own engine, so `task.engine.getTrace()` is this checkout and nothing else.
  const task = new Checkout();

  const order = await task.receiveOrder(orderId);
  const enriched = await task.enrichOrder(order);
  await task.explodeBundle(order.items[0]);
  const priced = await task.priceOrder(order, enriched);

  // Holding stock and taking the money are independent of each other.
  const [, payment] = await Promise.all([task.reserveStock(order.items), task.chargeCard(priced.total)]);

  return { task, result: task.confirmOrder(order, payment) };
}

export async function main() {
  // A warm process: this order's catalog was read a moment ago, by whatever came
  // before it. The checkout below therefore finds it in the store, and its
  // `fetchCatalog` node is a hit rather than a call.
  await catalog.lookup(['sku-1', 'sku-2']);

  const { task, result } = await checkout('ord-7431');

  console.log('order:', result);
  console.log(`rates: ${rateFetches} fetch, ${rateCallsShared} shared`);
  writeTrace(JSON.stringify(task.engine.getTrace(), null, 2));
}

main().then();
