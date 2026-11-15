# What is Execution Engine?

Execution Engine records what your code did at runtime — inputs, outputs, errors and timing — without requiring you
to rewrite function bodies. It runs in your process and returns plain data.

It has two independent modes: use **Execution** for one function, or **Engine** for a connected workflow.

## Execution — individual functions {#execution-apis}

Observe or optimize individual functions without an engine. Use [Trace](../execution/trace.md) for call data,
[Cache](../execution/cache.md) or [Memoize](../execution/memoize.md) to avoid repeated work, and
[Timer](../execution/timer.md) for elapsed time. Use [`retry` or `@retry`](../execution/retry.md) to retry temporary
failures with a bounded attempt count, backoff and cancellation. Retry can also record attempts when given an engine.

## Engine — a whole run

Route related calls through an engine. Each call becomes a **node**; **edges** capture order, nesting and parallel
work. The result is a portable JSON [Trace](../engine/trace.md) of the whole run.

::: info Graph data that travels
Engine traces use a [**Cytoscape-compatible**](https://js.cytoscape.org/) shape.

- **Visualize** — open a trace in the <a href="https://tabkram.github.io/json-to-graph/" target="_blank" rel="noreferrer"><img class="ee-inline-project-icon" src="/json-to-graph.svg" alt="" width="18" height="18" /><strong>json-to-graph viewer</strong></a>.
- **Test** — assert directly on its nodes and edges.
- **Resume** — pass a stored trace back to an engine and continue the run.
:::

## Which one?

| | Execution | Engine |
| --- | --- | --- |
| Scope | One function | Many calls, and their relationships |
| Output | The function's value or a call record, depending on the API | A JSON graph of nodes and edges |
| Setup | Nothing | An engine instance |
| Order, nesting, parallelism | Not tracked | Tracked |
| Use it for | Logging, metrics, caching, deduplication, retries | Pipelines, workflows, orchestration |

The two are independent; use either without adopting the other.
