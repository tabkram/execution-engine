<script setup lang="ts">
/**
 * One example: the code on the left, what it produced on the right.
 *
 * The code is the default slot, so it stays a fenced block in the markdown and
 * keeps the theme's highlighting and copy button. The right side is the graph
 * named by `id`, or — for the execution-level examples, which record calls one
 * at a time and build no graph — whatever the `out` slot holds.
 *
 * Drawing vocabulary is shared with `theme/graph.css`: a box is a call, a box
 * inside a box is a nested run, an arrow is an edge the engine inferred, and a
 * pill is a cache or memoize hit.
 */
import { computed } from 'vue';
import { exampleFlows, layoutFlow, MS_SLOT, tagWidth } from '../exampleFlows';

const REPO = 'https://github.com/tabkram/execution-engine';
const RAW = 'https://raw.githubusercontent.com/tabkram/execution-engine/main';
const VIEWER = 'https://tabkram.github.io/json-to-graph/';

const props = defineProps<{ id: string; caption?: string }>();

const example = computed(() => {
  const found = exampleFlows.find((flow) => flow.id === props.id);

  if (!found) {
    throw new Error(`Unknown example: ${props.id}`);
  }

  return found;
});

const flow = computed(() => (example.value.steps ? layoutFlow(example.value.steps) : undefined));

/** Each example that writes a trace writes it next to itself, under the same name. */
const trace = computed(() => (example.value.trace ? example.value.source.replace(/\.ts$/, '.json') : undefined));

const fileName = (path: string) => path.split('/').pop();
</script>

<template>
  <div class="ee-ex-root">
    <div class="ee-ex">
    <div class="ee-ex-code">
      <slot />
    </div>

    <div class="ee-ex-out">
      <p v-if="caption" class="ee-ex-cap">{{ caption }}</p>

      <svg v-if="flow" class="ee-ex-svg" :viewBox="flow.viewBox" role="img" :aria-label="`The ${id} run, traced top to bottom`">
        <defs>
          <marker
            :id="`ee-ex-arrow-${id}`"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 z" class="ee-graph-arrow" />
          </marker>
        </defs>

        <g v-for="(shape, s) in flow.shapes" :key="s">
          <rect
            :x="shape.x"
            :y="shape.y"
            :width="shape.w"
            :height="shape.h"
            :rx="shape.group ? 13 : 9"
            :class="[shape.group ? 'ee-graph-group' : 'ee-graph-box', { 'is-accent': shape.accent }]"
          />

          <!-- A container's row is its header; a plain box centres its own. -->
          <circle
            :cx="shape.x + 15"
            :cy="shape.group ? shape.y + 19 : shape.y + shape.h / 2"
            r="4"
            class="ee-graph-dot"
            :class="{ 'is-group': shape.group, 'is-accent': shape.accent }"
          />
          <text
            :x="shape.x + 26"
            :y="shape.group ? shape.y + 23 : shape.y + shape.h / 2 + 4.5"
            :class="shape.group ? 'ee-graph-group-label' : 'ee-graph-label'"
          >
            {{ shape.label }}<tspan v-if="shape.note" class="ee-ex-note" dx="11">{{ shape.note }}</tspan>
          </text>
          <text
            :x="shape.x + shape.w - 12"
            :y="shape.group ? shape.y + 23 : shape.y + shape.h / 2 + 4"
            class="ee-graph-ms"
            text-anchor="end"
          >
            {{ shape.ms }}
          </text>

          <!-- Inside the box, left of the duration: straddling the top edge put
               it over the label of whatever container the box sits in. -->
          <g v-if="shape.tag">
            <rect
              :x="shape.x + shape.w - MS_SLOT - tagWidth(shape.tag)"
              :y="shape.y + shape.h / 2 - 9"
              :width="tagWidth(shape.tag)"
              height="18"
              rx="9"
              class="ee-graph-tag"
            />
            <text
              :x="shape.x + shape.w - MS_SLOT - tagWidth(shape.tag) / 2"
              :y="shape.y + shape.h / 2 + 3.5"
              class="ee-graph-tag-text"
              text-anchor="middle"
            >
              {{ shape.tag }}
            </text>
          </g>
        </g>

        <!-- After the boxes, not before: an edge drawn inside a container would
             otherwise be painted over by the container's own fill. Edges only
             ever run in the gaps, so nothing of theirs lands on a box. -->
        <path v-for="(edge, e) in flow.edges" :key="e" :d="edge" class="ee-graph-edge" :marker-end="`url(#ee-ex-arrow-${id})`" />
      </svg>

      <slot v-else name="out" />

      <p class="ee-ex-links">
        <a :href="`${REPO}/blob/main/${example.source}`">{{ fileName(example.source) }}</a>
        <template v-if="trace">
          <a :href="`${REPO}/blob/main/${trace}`">{{ fileName(trace) }}</a>
          <a v-if="flow" :href="`${VIEWER}?data=${RAW}/${trace}`" target="_blank" rel="noreferrer">open the graph ↗</a>
        </template>
      </p>
    </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Two columns wherever both fit, one where they do not — decided from the space
 * the doc column actually has, which changes with the sidebar and the window. A
 * width media query would be guessing at it, so the example is its own query
 * container and asks its own width.
 *
 * The split is uneven on purpose: the graph is capped at 470px however much room
 * it is given, while the code is what the reader actually reads, so the extra
 * width goes there and keeps snippets off the horizontal scrollbar.
 */
.ee-ex-root {
  container-type: inline-size;
  margin: 18px 0 40px;
}

.ee-ex {
  display: grid;
  gap: 14px 32px;
  align-items: start;
}

@container (min-width: 960px) {
  .ee-ex {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  }
}

/*
 * The theme's code block brings its own margins; the grid supplies the spacing.
 * A step down in type size keeps the snippets inside half a column, so the
 * common case is a block that reads straight through with nothing to scroll.
 */
.ee-ex :deep(div[class*='language-']) {
  --vp-code-font-size: 13px;
  margin: 0;
  border-radius: var(--ee-radius-md);
}

.ee-ex-out {
  min-width: 0;
}

.ee-ex-cap {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--vp-c-text-3);
}

/*
 * Capped, not just fluid. A run is 420 units wide, so letting it take a full
 * stacked column blew the 12-unit labels up to half again the size of the code
 * they sit under. 470 keeps the two at about the same reading size.
 */
.ee-ex-svg {
  display: block;
  width: 100%;
  max-width: 470px;
  height: auto;
}

.ee-ex-note {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  fill: var(--ee-text-3);
}

.ee-ex-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 12px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  line-height: 1.5;
}

.ee-ex-links a {
  color: var(--ee-text-3);
  font-weight: 400;
  text-decoration: none;
  transition: color var(--ee-motion-fast);
}

.ee-ex-links a:hover {
  color: var(--ee-link);
}
</style>
