---
layout: home
pageClass: ee-home

hero:
  name: Execution Engine
  # <br> forces the break at the comma; the hero fields are rendered with v-html.
  text: Trace and optimize your function calls,<br>See your whole code run as a graph.
  # Shared with assets/social-preview.html: one transparent asset, no component logic.
  image:
    src: /abstract-execution-graph.svg
    alt: Abstract execution graph
  actions:
    - theme: brand
      text: What is Execution Engine?
      link: /guide/what-is-execution-engine
    - theme: alt
      text: See Examples
      link: /examples
    - theme: alt
      text: View on GitHub
      link: https://github.com/tabkram/execution-engine
---

<!--
  Markup rather than the theme's `features:` frontmatter, which is a flat list:
  each block below holds its own pages, and the cards underneath belong to neither.
-->

<div class="ee-parts">

<section class="ee-part">
  <div class="ee-part-head">
    <span class="ee-part-icon">🔍</span>
    <div>
      <h2>Execution</h2>
      <p class="ee-part-sub">Trace and optimize a single function. No engine, no graph.</p>
    </div>
  </div>
  <div class="ee-part-links">
    <a href="/execution-engine/execution/trace">
      <span class="ee-link-title">Trace</span>
      <span class="ee-link-desc">Capture inputs, outputs, errors and timing of one call</span>
    </a>
    <a href="/execution-engine/execution/cache">
      <span class="ee-link-title">Cache</span>
      <span class="ee-link-desc">Reuse a result for a configurable TTL</span>
    </a>
    <a href="/execution-engine/execution/memoize">
      <span class="ee-link-title">Memoize</span>
      <span class="ee-link-desc">Collapse duplicate concurrent calls into one</span>
    </a>
    <a href="/execution-engine/execution/timer">
      <span class="ee-link-title">Timer</span>
      <span class="ee-link-desc">Measure a code block, in ms and in words</span>
    </a>
  </div>
</section>

<section class="ee-part">
  <div class="ee-part-head">
    <span class="ee-part-icon">🔗</span>
    <div>
      <h2>Engine</h2>
      <p class="ee-part-sub">Route calls through an engine. Get the whole run as a graph.</p>
    </div>
  </div>
  <div class="ee-part-links">
    <a href="/execution-engine/engine/trace">
      <span class="ee-link-title">Trace</span>
      <span class="ee-link-desc">Nodes, edges, nesting and parallelism explained</span>
    </a>
    <a href="/execution-engine/engine/traceable-engine">
      <span class="ee-link-title">TraceableEngine</span>
      <span class="ee-link-desc">Build the graph with run() and getTrace()</span>
    </a>
    <a href="/execution-engine/engine/execution-engine">
      <span class="ee-link-title">ExecutionEngine</span>
      <span class="ee-link-desc">Adds a typed context shared across every step</span>
    </a>
    <a href="/execution-engine/engine/engine-run">
      <span class="ee-link-title">@engine and @run</span>
      <span class="ee-link-desc">Decorators that keep your call sites clean</span>
    </a>
  </div>
</section>

</div>

<div class="ee-small">
  <a class="ee-small-card" href="/execution-engine/guide/which-api-to-use">
    <span class="ee-small-icon">🧩</span>
    <span class="ee-small-body">
      <strong>Decorators or functions</strong>
      <span>Every feature ships twice — a decorator for classes, a plain function for everything else.</span>
    </span>
  </a>
  <a class="ee-small-card" href="/execution-engine/guide/getting-started">
    <span class="ee-small-icon">📦</span>
    <span class="ee-small-body">
      <strong>Zero dependencies</strong>
      <span>No production dependencies. Types bundled, Node.js 18 and above.</span>
    </span>
  </a>
  <a class="ee-small-card" href="/execution-engine/examples">
    <span class="ee-small-icon">📈</span>
    <span class="ee-small-body">
      <strong>See a real run</strong>
      <span>Working examples, each with the code and the trace it produced.</span>
    </span>
  </a>
</div>
