import { engine, EngineTask, run } from '../src';
import { writeTrace } from './common/writeTrace';

@engine({ id: 'complexEngineId' })
class MyDeepEngineTask extends EngineTask {
  private depth: number;
  private sequence: number;
  private currDepth: number;
  private currSequence: number;

  constructor(depth: number = 10, sequence: number = 5) {
    super();
    this.depth = depth;
    this.sequence = sequence;
    this.currDepth = depth;
    this.currSequence = sequence;
  }

  @run()
  runInDepth(param: Array<string>): string {
    const res = this.runSequence(this.currDepth);
    if (this.currDepth > 0) {
      this.currDepth = this.currDepth - 1;
      return this.runInDepth(res);
    }
    this.currDepth = this.depth;
    return `result1 for ${param} at level ${this.currDepth}`;
  }

  @run()
  runSequence(depth: number) {
    const res = [];
    while (this.currSequence > 0) {
      res.push(this.task(this.sequence));
      this.currSequence = this.currSequence - 1;
    }
    this.currSequence = this.sequence;
    res.push(`finished runSequenceInDepth for depth : ${depth}`);
    return res;
  }

  @run()
  task(param: string | number) {
    return `run for sequence: ${param}`;
  }
}

export async function generate() {
  const myInstance = new MyDeepEngineTask(10, 5);
  await myInstance.runInDepth(['starting']);

  // Retrieve the trace
  const trace = myInstance.engine.getTrace();
  const jsonString = JSON.stringify(trace, null, 2);
  writeTrace(jsonString);
}

generate().then();
