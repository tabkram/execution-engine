/**
 * The runs drawn on the Examples page, next to the code that produced them.
 *
 * Every label and duration below came out of running the example named in
 * `source` and reading the trace it wrote next to itself — re-run one and the
 * numbers shift by a millisecond or two. The execution-level examples have no
 * `steps`: they record calls one at a time and produce no graph at all.
 *
 * Geometry is not authored here. A run is a list of steps, and `layoutFlow`
 * turns that into boxes and edges, so adding a step is one line.
 */

export interface FlowNode {
  label: string;
  ms: string;
  /** Small pill on the box — "cached", "memoized". */
  tag?: string;
  /** Draws the node in the accent colour: the step the example is about. */
  accent?: boolean;
  /**
   * The traced calls that happened inside this one. They chain, with an edge
   * between each, unless `parallel` says they ran at the same time.
   */
  children?: FlowNode[];
  parallel?: boolean;
}

/**
 * One position in the run. An array means those nodes ran at the same time and
 * share a source: they are drawn side by side, and the edges fan out into them
 * and back in — which is what the trace records, so nothing is invented to hold
 * them together.
 */
export type FlowStep = FlowNode | FlowNode[];

export interface FlowExample {
  id: string;
  /** Path in the repo. Where there is a trace, it sits next to it under the same name. */
  source: string;
  /** Whether the example writes a trace JSON worth linking to. */
  trace?: boolean;
  /** Absent where the example produces no graph. */
  steps?: FlowStep[];
}

export const exampleFlows: FlowExample[] = [
  /* ---- One function at a time: no engine, no graph ---- */

  { id: 'trace', source: 'examples/execution-trace.ts', trace: true },
  { id: 'cache', source: 'examples/execution-cache.ts' },
  { id: 'memoize', source: 'examples/execution-memoize.ts' },

  /* ---- One checkout, as a graph ---- */

  {
    id: 'checkout',
    source: 'examples/engine-checkout.ts',
    trace: true,
    steps: [
      { label: 'receiveOrder', ms: '13.5 ms' },
      {
        label: 'enrichOrder',
        ms: '57.3 ms',
        parallel: true,
        children: [
          { label: 'fetchCustomer', ms: '57.0 ms' },
          { label: 'fetchCatalog', ms: '0.20 ms', tag: 'cached', accent: true }
        ]
      },
      {
        // Recursion: the method calls itself, and nests once per level.
        label: 'explodeBundle',
        ms: '46.1 ms',
        children: [{ label: 'explodeBundle', ms: '30.5 ms', children: [{ label: 'explodeBundle', ms: '15.1 ms' }] }]
      },
      {
        label: 'priceOrder',
        ms: '87.6 ms',
        parallel: true,
        children: [
          // Both branches ask for the rates, and there is one node for the one
          // execution there was: the second joined the call in flight.
          { label: 'applyTax', ms: '80.5 ms', children: [{ label: 'fetchRates', ms: '60.5 ms', tag: 'memoized', accent: true }] },
          { label: 'convertCurrency', ms: '87.0 ms' }
        ]
      },
      // An array is one position held by two nodes: the graph forks into them
      // and `confirmOrder` joins them back.
      [
        { label: 'reserveStock', ms: '42.4 ms' },
        // A graph inside a node: two steps of its own, in order.
        {
          label: 'chargeCard',
          ms: '73.0 ms',
          children: [
            { label: 'authorize', ms: '40.9 ms' },
            { label: 'capture', ms: '31.6 ms' }
          ]
        }
      ],
      { label: 'confirmOrder', ms: '0.24 ms' }
    ]
  }
];

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/** User units. The SVG scales to whatever width its column ends up with. */
const WIDTH = 420;
const BOX_HEIGHT = 36;
/** Between children that ran at the same time: nothing is drawn in the gap. */
const SIBLING_GAP = 10;
/** Between children that follow one another: an edge is. */
const CHAIN_GAP = 20;
/** Between steps that simply follow one another. */
const STEP_GAP = 22;
/** Between steps where the graph forks or joins: the edges need the room. */
const FAN_GAP = 38;
/** Between nodes drawn side by side. */
const COLUMN_GAP = 14;
/** Arrowheads landing on the same node are spread this far apart along its top edge. */
const ARRIVAL_SPREAD = 16;
const HEAD_HEIGHT = 30;
/** Container inset, left, right and bottom. */
const PAD = 13;

export interface FlowShape {
  group: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  ms: string;
  tag?: string;
  accent?: boolean;
  /** Set on a container whose children ran at the same time. */
  note?: string;
}

export interface FlowLayout {
  viewBox: string;
  shapes: FlowShape[];
  /** Edge paths, drawn with an arrowhead at the end. */
  edges: string[];
}

interface Anchor {
  x: number;
  y: number;
}

const nodesOf = (step: FlowStep): FlowNode[] => (Array.isArray(step) ? step : [step]);

const childGap = (node: FlowNode): number => (node.parallel ? SIBLING_GAP : CHAIN_GAP);

function heightOf(node: FlowNode): number {
  if (!node.children) {
    return BOX_HEIGHT;
  }

  const children = node.children.reduce((total, child) => total + heightOf(child), 0);

  return HEAD_HEIGHT + children + childGap(node) * (node.children.length - 1) + PAD;
}

/** Leaves straight down, arrives straight down, bends in between. */
function edgePath(from: Anchor, to: Anchor): string {
  const bend = (to.y - from.y) * 0.55;

  // Stops 2 units short: the arrowhead covers the rest.
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + bend}, ${to.x} ${to.y - bend - 2}, ${to.x} ${to.y - 2}`;
}

/**
 * Depth-first, parent before child, so a container never paints over its own
 * contents. Children that ran in sequence get an edge between them — a node with
 * a graph inside it looks like one.
 */
function place(node: FlowNode, x: number, y: number, w: number, shapes: FlowShape[], edges: string[]): void {
  shapes.push({
    group: Boolean(node.children),
    x,
    y,
    w,
    h: heightOf(node),
    label: node.label,
    ms: node.ms,
    tag: node.tag,
    accent: node.accent,
    note: node.parallel ? `${node.children?.length} in parallel` : undefined
  });

  const gap = childGap(node);
  let childY = y + HEAD_HEIGHT;

  node.children?.forEach((child, i) => {
    if (i > 0 && !node.parallel) {
      const center = x + PAD + (w - PAD * 2) / 2;

      edges.push(edgePath({ x: center, y: childY - gap }, { x: center, y: childY }));
    }

    place(child, x + PAD, childY, w - PAD * 2, shapes, edges);
    childY += heightOf(child) + gap;
  });
}

export function layoutFlow(steps: FlowStep[]): FlowLayout {
  const shapes: FlowShape[] = [];
  const edges: string[] = [];

  let y = 0;
  let exits: Anchor[] = [];

  steps.forEach((step, i) => {
    const nodes = nodesOf(step);

    if (i > 0) {
      y += exits.length > 1 || nodes.length > 1 ? FAN_GAP : STEP_GAP;
    }

    const width = (WIDTH - COLUMN_GAP * (nodes.length - 1)) / nodes.length;
    const arrivals: Anchor[] = [];
    const departures: Anchor[] = [];

    nodes.forEach((node, column) => {
      const x = column * (width + COLUMN_GAP);

      place(node, x, y, width, shapes, edges);
      arrivals.push({ x: x + width / 2, y });
      departures.push({ x: x + width / 2, y: y + heightOf(node) });
    });

    // Every source reaches every node of this step. One source and two nodes is
    // a fork; two sources and one node is a join, and those arrowheads are
    // nudged apart so the join reads as two edges rather than one.
    exits.forEach((from, source) => {
      const offset = exits.length > 1 ? (source - (exits.length - 1) / 2) * ARRIVAL_SPREAD : 0;

      arrivals.forEach((to) => edges.push(edgePath(from, { x: to.x + offset, y: to.y })));
    });

    y += Math.max(...nodes.map(heightOf));
    exits = departures;
  });

  // 2 units of slack all round so the 1px strokes are not clipped.
  return { viewBox: `-2 -2 ${WIDTH + 4} ${y + 4}`, shapes, edges };
}

/** Monospace at 9.5px advances ~5.8 units per character; the pill wraps that. */
export function tagWidth(tag: string): number {
  return Math.round(tag.length * 5.8) + 18;
}

/**
 * Room kept at the right edge of every row for the duration, so a pill placed
 * beside one never lands on top of it. Durations are "98.1 ms" — seven or eight
 * monospace characters at 10.5px, plus the 12-unit inset.
 */
export const MS_SLOT = 64;
