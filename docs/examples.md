---
title: Examples
description: Real runs, from a single traced call to one checkout drawn as a graph, each with the code that produced it.
aside: false
outline: false
---

# Examples

Every example on this page is a file in the repository that was actually run. The code is on the left, what it produced
is on the right, and the numbers are the ones that run recorded — not a sketch of them.

Three small ones first, each wrapping a single function. Then one checkout, routed through an engine, that puts all of
it into a single graph.

## One function at a time

No engine, nothing to wire up, and no graph — this half of the library wraps a **single function** and reports what it
did. Start here if you want timings, a cache or deduplication and nothing else.

### Trace one call

`executionTrace` runs the function and hands back the record: what went in, what came out, when, and how long it took.
The function is not modified and still returns its own value.

<FlowExample id="trace" caption="the record it returned">

```ts
import { executionTrace } from 'execution-engine';

async function fetchInvoice(id: string) {
  await sleep(45);
  return { id, total: 128.4, currency: 'EUR' };
}

const trace = await executionTrace(
  fetchInvoice,
  ['inv_204']
);

console.log(trace.outputs.currency); // 'EUR'
console.log(trace.elapsedTime); // '46.608 ms'
```

<template #out>

```json
{
  "metadata": {
    "name": "fetchInvoice",
    "parameters": ["id"],
    "isAsync": true
  },
  "inputs": ["inv_204"],
  "outputs": {
    "id": "inv_204",
    "total": 128.4,
    "currency": "EUR"
  },
  "startTime": "2026-08-10T13:42:50.815Z",
  "endTime": "2026-08-10T13:42:50.861Z",
  "duration": 46.608,
  "elapsedTime": "46.608 ms"
}
```

</template>
</FlowExample>

### Keep a result — `@cache`

Keyed on the arguments, kept for a TTL. A repeat of the same call never reaches the API; a different argument is a
different key and runs.

<FlowExample id="cache" caption="what it printed">

```ts
import { cache } from 'execution-engine';

class ExchangeRates {
  @cache({ ttl: 60_000 })
  async get(base: string) {
    apiCalls++;
    return fetchRates(base);
  }
}

const rates = new ExchangeRates();

await rates.get('EUR');
await rates.get('EUR'); // never reaches fetchRates
await rates.get('GBP'); // different key
```

<template #out>

```console
EUR  71.78 ms   ← miss, calls the API
EUR   0.11 ms   ← hit, served from the store
GBP  71.25 ms   ← different key, so it runs

3 calls, 2 reached the API
```

</template>
</FlowExample>

### Share one call — `@memoize`

`cache` stores a result once the call **succeeds**, so callers that arrive while it is still running all miss and all
run. `memoize` stores the in-flight promise instead, so they join the call already going.

<FlowExample id="memoize" caption="what it printed">

```ts
import { memoize } from 'execution-engine';

class FeatureFlags {
  @memoize()
  async load(env: string) {
    return fetchFlags(env); // 80 ms
  }
}

const flags = new FeatureFlags();

// Twelve components render together, all
// needing the same flags.
const asked = Array.from({ length: 12 }, () =>
  flags.load('prod')
);

await Promise.all(asked);
```

<template #out>

```console
12 calls, 1 execution, 11 reused
all settled in 82.5 ms
```

</template>
</FlowExample>

## A run as a graph

Route the same calls through an engine and you get the second half of the library. Every call becomes a node, the
engine infers the edges from what actually happened, and `getTrace()` returns the whole run.

`@engine` attaches an engine to the class and `@run` sends a method through it, so the call sites stay ordinary method
calls. One checkout exercises all of it:

- a **chain** — each step attached to the one before it;
- **nesting**, where a step runs steps of its own, twice in parallel and once as [a graph inside a
  node](#a-graph-inside-a-node);
- **recursion** — `explodeBundle` calls itself, and nests once per level;
- a **`@cache` hit** and a **`@memoize`d call**, both visible as nodes that cost nothing;
- a **fork and a join** at the top level.

<div class="ee-legend">
  <span><i class="ee-legend-box"></i> a traced call</span>
  <span><i class="ee-legend-group"></i> calls that ran inside it</span>
  <span><i class="ee-legend-edge"></i> an edge the engine inferred</span>
  <span><i class="ee-legend-tag"></i> answered without running</span>
</div>

<FlowExample id="checkout">

```ts
@engine()
class Checkout extends EngineTask {
  @run()
  async receiveOrder(id: string) { /* … */ }

  // Two traced steps of its own, at the same time.
  @run()
  async enrichOrder(order: Order) {
    const [customer, subtotal] = await Promise.all([
      this.fetchCustomer(order.customerId),
      this.fetchCatalog(order.items)
    ]);

    return { tier: customer.tier, subtotal };
  }

  // A bundle may contain bundles, so this calls
  // itself — as deep as the order happens to go.
  @run()
  async explodeBundle(sku: string): Promise<Sku[]> {
    const parts = await readBundle(sku);
    if (!parts) return [sku];

    const nested = await Promise.all(
      parts.map((part) => this.explodeBundle(part))
    );

    return nested.flat();
  }

  // Outside @run, so the branch that arrives second
  // joins the call in flight and adds no node.
  @memoize()
  @run()
  async fetchRates(country: string) { /* … */ }

  // A graph inside a node: two steps, in order.
  @run({ config: { parallel: 'fulfil' } })
  async chargeCard(total: number) {
    const auth = await this.authorize(total);

    return this.capture(auth);
  }
}

const task = new Checkout();

const order = await task.receiveOrder('ord-7431');
const enriched = await task.enrichOrder(order);
await task.explodeBundle(order.items[0]);
const priced = await task.priceOrder(order, enriched);

// Independent of each other, so both attach to
// priceOrder instead of chaining.
const [, payment] = await Promise.all([
  task.reserveStock(order.items),
  task.chargeCard(priced.total)
]);

task.confirmOrder(order, payment);

task.engine.getTrace(); // every node, edge and timing
```

</FlowExample>

### The fork at the top

`reserveStock` and `chargeCard` are two ordinary calls in a `Promise.all`. Sequence is the only order the engine can
infer from that, so by default it would chain the second after the first. `config.parallel: 'fulfil'` on both says
they came off the same source — which is why the graph forks into them and `confirmOrder` joins them back.

### A graph inside a node {#a-graph-inside-a-node}

Nesting is not a special case of it. `chargeCard` calls `authorize` and then `capture`, and both are traced, so the
engine records them inside `chargeCard` **and** draws the edge between them. A node that ran a workflow contains that
workflow.

### Nodes that cost nothing

`fetchCatalog` at 0.20 ms and `fetchRates` at 60.5 ms for two callers are the two halves of part one, seen from inside
a graph: `@cache` returned a stored result, and `@memoize` let the second pricing branch await the first one's call.
Both still appear as nodes — the trace records what was asked for as well as what ran.

## More

Each example above links to its own source, and to the trace it wrote where there is one. The repository holds the
rest — a plain sequential run, a recursive dependency resolution, custom trace options, error handling and narratives.

<a class="ee-banner" href="https://github.com/tabkram/execution-engine/tree/main/examples" target="_blank" rel="noreferrer">
  <span class="ee-banner-body">
    <strong>All examples on GitHub</strong>
    <span>Every example, its trace, and a link that opens the graph in the viewer.</span>
  </span>
  <span class="ee-banner-cta">Browse&nbsp;↗</span>
</a>
