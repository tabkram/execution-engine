import { Node } from '../trace/trace.model';
import { engine, EngineTask, run } from './executionEngineDecorators';

describe('decorators', () => {
  describe('an alternative usage of the ExecutionEngine that illustrates the integration of decorators', () => {
    it('should apply the engine decorator to a class', () => {
      const id = 'testId';

      @engine({ id })
      class TestClass extends EngineTask {}

      const instance = new TestClass();
      expect(instance.engine).toBeDefined();
    });

    it('should apply the run decorator to a method', async () => {
      const id = 'testId';

      @engine({ id })
      class TestClass {
        @run()
        async testMethod() {
          return 'Test Result';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();

      expect(result).toBe('Test Result');
    });

    it('should apply the run decorator with options to a method', async () => {
      const id = 'testId';
      const traceOptions = {
        /* your trace options here */
      };

      @engine({ id })
      class TestClass {
        @run(traceOptions)
        async testMethod() {
          return 'Test Result';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();

      expect(result).toBe('Test Result');
    });
  });

  describe('advanced example with custom parameters', () => {
    @engine({ id: 'whetherEngine' })
    class MyWeatherTask extends EngineTask {
      @run()
      async fetchCurrentTemperature(city: string) {
        return Promise.resolve(`Current Temperature in ${city}: 25°C`);
      }

      @run()
      async fetchDailyForecast(city: string) {
        return Promise.resolve(`Daily Forecast in ${city}: Sunny`);
      }

      @run()
      async recommendation(city: string): Promise<[string, void]> {
        const vigilanceTask = new MyVigilanceTask();
        return Promise.all([vigilanceTask.decideIfIShouldGoOut(city), vigilanceTask.decideIfIShouldGoOutNextYear(city)]);
      }
    }

    @engine({ id: 'whetherEngine' })
    class MyVigilanceTask extends EngineTask {
      @run({
        trace: { id: 'decideIfIShouldGoOut_custom_id', narratives: ['Narrative 0 GoOut'] },
        config: { parallel: true, traceExecution: { inputs: true, outputs: true, narratives: ['Narrative 1 GoOut', 'Narrative 2 GoOut'] } }
      })
      async decideIfIShouldGoOut(city: string) {
        const temperature = await new MyWeatherTask().fetchCurrentTemperature(city);
        const forecast = await new MyWeatherTask().fetchDailyForecast(city);

        const color = this.engine.run(() => 'GREEN', [temperature, forecast], {
          trace: { label: 'color' },
          config: { parallel: true, traceExecution: true }
        })?.outputs;

        const decision = this.engine.run(() => 'go out', [temperature, forecast], {
          trace: { label: 'decide' },
          config: { parallel: true, traceExecution: true }
        })?.outputs;

        return Promise.resolve(
          `As daily Forecast in ${city} is ${forecast} and the temperature is ${temperature}, vigilance is ${color} and you can ${decision}`
        );
      }

      @run({ config: { parallel: true, errors: 'catch', traceExecution: true } })
      async decideIfIShouldGoOutNextYear(city: string) {
        throw new Error(`Next year too far!, could not decide for ${city}`);
      }

      @run()
      validateDecision(stringDecision: string) {
        return stringDecision?.includes('GREEN');
      }
    }

    @engine({ id: 'VigilanceValidationEngine' })
    class MyIndependantVigilanceTask extends MyVigilanceTask {}

    it('should create a trace of consecutive user-related actions', async () => {
      const myWeatherTaskInstance = new MyWeatherTask();

      await myWeatherTaskInstance.fetchCurrentTemperature('Monastir');
      await myWeatherTaskInstance.fetchDailyForecast('Monastir');
      const response = await myWeatherTaskInstance.recommendation('Monastir');
      const myWeatherTaskInstanceTraceBeforeValidation = myWeatherTaskInstance.engine.getTrace();

      //call validation:
      const myVigilanceInstance = new MyVigilanceTask();
      myVigilanceInstance.validateDecision(response[0]);

      const myWeatherTaskInstanceTraceAfterValidation = myWeatherTaskInstance.engine.getTrace();
      const myVigilanceInstanceAfterValidation = myVigilanceInstance.engine.getTrace();
      expect(myWeatherTaskInstanceTraceBeforeValidation?.length).toEqual(14);
      expect(myWeatherTaskInstanceTraceAfterValidation?.length).toEqual(16);
      expect(myVigilanceInstanceAfterValidation).toEqual(myWeatherTaskInstanceTraceAfterValidation);

      //call independent validation: as it is decorated with engineID: "VigilanceValidationEngine"
      const myValidationTask = new MyIndependantVigilanceTask();
      myValidationTask.validateDecision(response[0]);
      const myValidationIndependentTrace = myValidationTask.engine.getTrace();
      expect(myValidationIndependentTrace?.length).toEqual(1);
    });
  });

  describe('deepWorkflow', () => {
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

    it('should create a trace of a deep workflow with consecutive tasks', async () => {
      const myDeepEngineTask = new MyDeepEngineTask(10, 5);
      myDeepEngineTask.runInDepth(['starting']);
      const trace = myDeepEngineTask.engine.getTrace();
      const nodesFromTrace: Array<Node> = trace?.filter((tracePart) => tracePart.group === 'nodes') as Array<Node>;
      expect(trace?.length).toEqual(131);
      expect(nodesFromTrace)?.toEqual(myDeepEngineTask.engine.getTraceNodes());
      nodesFromTrace?.forEach((n) => expect((n as Node).data.inputs).toBeDefined());
      nodesFromTrace?.forEach((n) => expect((n as Node).data.outputs).toBeDefined());
    });
  });
});
