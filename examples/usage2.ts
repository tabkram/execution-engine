import { engine, EngineTask, run } from '../src';
import { writeTrace } from './common/writeTrace';

@engine({ id: 'uniqueEngineId' })
class MyClass extends EngineTask {
  @run()
  myMethod1(param: string) {
    return `result1 for ${param}`;
  }

  @run()
  async myMethod2(param: string) {
    return `result2 for ${param}`;
  }
}

export async function generate() {
  const myInstance = new MyClass();
  myInstance.myMethod1('param1');
  await myInstance.myMethod2('param2');

  // Retrieve the trace
  const trace = myInstance.engine.getTrace();
  const jsonString = JSON.stringify(trace, null, 2);
  writeTrace(jsonString);
}

generate().then();
