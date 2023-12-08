import { ExecutionEngine } from '../src';
import { writeTrace } from './common/writeTrace';

export async function run() {
  const engine = new ExecutionEngine();

  // for sync functions:
  const result1 = engine.run((param) => `result1 for ${param}`, ['param1']);

  // for async functions:
  const result2 = await engine.run(async (param) => `result2 for ${param}`, [result1.outputs]);

  // Retrieve the trace
  const trace = engine.getTrace();
  const jsonString = JSON.stringify(trace, null, 2);
  writeTrace(jsonString);
}

run();
