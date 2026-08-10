/**
 * Engine example — a recursive resolution, drawn as the tree it walks.
 *
 * A package manager resolving a dependency tree. `resolvePackage` reads a
 * manifest and then resolves that manifest's dependencies — by calling itself,
 * through the engine, for as many levels as the tree happens to have. Nothing
 * declares the shape: the graph comes out four levels deep because the tree is.
 *
 * Two things run into each other here, which is the point of the example:
 *
 *   - Siblings resolve at the same time, so a parent costs about what its
 *     slowest child costs rather than the sum of them.
 *   - `core` is a dependency of all three top-level packages. `@memoize` stores
 *     the in-flight resolution, so the second and third branches await the first
 *     one instead of walking that subtree again — and the graph records it once,
 *     under whichever branch reached it first.
 */
import { ExecutionEngine, memoize } from '../src';
import { writeTrace } from './common/writeTrace';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const engine = new ExecutionEngine();

/** The registry this example resolves against: dependencies, and what each manifest costs to read. */
const registry: Record<string, { deps: string[]; ms: number }> = {
  app: { deps: ['ui', 'api', 'cli'], ms: 18 },
  ui: { deps: ['core'], ms: 34 },
  api: { deps: ['core', 'http'], ms: 26 },
  cli: { deps: ['core'], ms: 22 },
  core: { deps: ['types'], ms: 48 },
  http: { deps: [], ms: 30 },
  types: { deps: [], ms: 16 }
};

let walked = 0;
let shared = 0;

class Resolver {
  /**
   * Keyed on the package name. Three branches ask for `core`; the first walks
   * it and the other two await that walk.
   */
  @memoize((context: { isMemoized?: boolean }) => {
    context.isMemoized ? shared++ : walked++;
  }, 1000)
  async resolve(name: string): Promise<string[]> {
    const { deps, ms } = registry[name];
    await sleep(ms);

    if (!deps.length) {
      return [name];
    }

    // Every dependency of this package resolves at the same time. Each one is a
    // traced node, nested under this one because this is what called it.
    const resolved = await Promise.all(
      deps.map((dep) =>
        engine
          .run(resolvePackage, [dep], {
            trace: { label: dep },
            config: { traceExecution: true, parallel: name }
          })
          .then((trace) => trace.outputs as string[])
      )
    );

    return [name, ...resolved.flat()];
  }
}

const resolver = new Resolver();

/**
 * `run()` appends the current node data after the declared inputs, and
 * `@memoize` keys on the arguments it receives, so the decorated method is
 * reached through this wrapper — it forwards the package name and nothing else.
 */
async function resolvePackage(name: string): Promise<string[]> {
  return resolver.resolve(name);
}

export async function run() {
  const tree = await engine.run(resolvePackage, ['app'], { trace: { label: 'app' } });
  const resolved = new Set(tree.outputs as string[]);

  console.log(`resolved ${resolved.size} packages: ${[...resolved].join(', ')}`);
  console.log(`${walked} walked, ${shared} shared`);
  writeTrace(JSON.stringify(engine.getTrace(), null, 2));
}

run().then();
