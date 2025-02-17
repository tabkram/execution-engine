import { NodeData } from '../trace/models/engineNodeTrace.model';
import { Node } from '../trace/models/engineTrace.model';
import { TraceableEngine } from './traceableEngine';

describe('TraceableEngine', () => {
  describe('TraceableEngine without initialTrace', () => {
    let traceableExecution: TraceableEngine;

    beforeEach(() => {
      traceableExecution = new TraceableEngine();
    });

    it('should create a trace of consecutive user-related actions', async () => {
      function registerUser(username: string, password: string) {
        if (username && password) {
          return Promise.resolve(`User ${username} successfully registered`);
        } else {
          return Promise.reject('Invalid registration information');
        }
      }

      function loginUser(username: string, password: string) {
        if (username && password) {
          return `User ${username} successfully logged in`;
        } else {
          throw new Error('Invalid login credentials');
        }
      }

      function getUserInformation(username: string) {
        const userInfo = {
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          role: 'User'
        };
        return `User Information for ${username}: Full Name - ${userInfo.fullName}, Email - ${userInfo.email}, Role - ${userInfo.role}`;
      }

      // Sequential consecutive calls for user registration, login, and retrieving user information
      const newUserCredentials = {
        username: 'john_doe',
        password: 'secure_password'
      };
      await traceableExecution.run(registerUser, [newUserCredentials.username, newUserCredentials.password]);
      traceableExecution.run(loginUser, [newUserCredentials.username, newUserCredentials.password]);
      traceableExecution.run(getUserInformation, [newUserCredentials.username]);

      // Retrieve the trace
      const finalTrace = traceableExecution.getTrace();

      // Perform assertions on the finalTrace
      expect(finalTrace?.length).toEqual(5);
      expect(finalTrace?.filter((node) => node.group === 'nodes')?.length).toEqual(3);
      expect(finalTrace?.filter((node) => node.group === 'edges')?.length).toEqual(2);
    });

    it('should create a trace of fetching weather information simultaneously', async () => {
      async function fetchCurrentTemperature(city: string) {
        return Promise.resolve(`Current Temperature in ${city}: 25°C`);
      }

      async function fetchDailyForecast(city: string) {
        return Promise.resolve(`Daily Forecast in ${city}: Sunny`);
      }

      async function getWeatherInformation(city: string, trace?: NodeData) {
        const [temperature, forecast] = await Promise.all([
          (
            await traceableExecution.run(fetchCurrentTemperature, [city], {
              trace: { parent: trace?.id },
              config: { parallel: true, traceExecution: true }
            })
          )?.outputs,
          (
            await traceableExecution.run(fetchDailyForecast, [city], {
              trace: { parent: trace?.id },
              config: { parallel: true, traceExecution: true }
            })
          )?.outputs
        ]);

        return Promise.resolve(`Weather information: ${temperature}, ${forecast}`);
      }

      // Simulate some parallel execution
      await traceableExecution.run(getWeatherInformation, ['Paris']);
      // Retrieve the trace
      const finalTrace = traceableExecution.getTrace();
      expect(finalTrace?.filter((node) => node.group === 'nodes')?.length).toEqual(3);
      expect(finalTrace?.filter((node) => node.group === 'edges')?.length).toEqual(0);
      // Perform assertions on the finalTrace
      expect(finalTrace).toMatchObject([
        {
          data: {
            id: expect.stringMatching(/^getWeatherInformation_.*$/),
            label: 'getWeatherInformation',
            parallel: false,
            abstract: false,
            createTime: expect.any(Date),
            inputs: ['Paris'],
            outputs: 'Weather information: Current Temperature in Paris: 25°C, Daily Forecast in Paris: Sunny',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            duration: expect.any(Number),
            elapsedTime: expect.any(String),
            updateTime: expect.any(Date)
          },
          group: 'nodes'
        },
        {
          data: {
            inputs: ['Paris'],
            outputs: 'Current Temperature in Paris: 25°C',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            duration: expect.any(Number),
            elapsedTime: expect.any(String),
            id: expect.stringMatching(/^fetchCurrentTemperature_.*$/),
            label: '1 - fetchCurrentTemperature',
            parent: expect.stringMatching(/^getWeatherInformation_.*$/),
            parallel: true,
            abstract: false,
            createTime: expect.any(Date)
          },
          group: 'nodes'
        },
        {
          data: {
            inputs: ['Paris'],
            outputs: 'Daily Forecast in Paris: Sunny',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            duration: expect.any(Number),
            elapsedTime: expect.any(String),
            id: expect.stringMatching(/^fetchDailyForecast_.*$/),
            label: '3 - fetchDailyForecast',
            parent: expect.stringMatching(/^getWeatherInformation_.*$/),
            parallel: true,
            abstract: false,
            createTime: expect.any(Date)
          },
          group: 'nodes'
        }
      ]);
    });

    it('should generate a trace with implicit parent associations and coherent settings based on AsyncLocalStorage', async () => {
      async function fetchCurrentTemperature(city: string) {
        return Promise.resolve(`Current Temperature in ${city}: 25°C`);
      }

      async function fetchDailyForecast(city: string) {
        return Promise.resolve(`Daily Forecast in ${city}: Sunny`);
      }

      async function getWeatherInformation(city: string) {
        const [temperature, forecast] = await Promise.all([
          (await traceableExecution.run(fetchCurrentTemperature, [city], { config: { parallel: true } }))?.outputs,
          (await traceableExecution.run(fetchDailyForecast, [city], { config: { parallel: true } }))?.outputs
        ]);

        // Simulate a complex decision-making process with nested traces
        traceableExecution.run(
          (t, f) => {
            traceableExecution.run(() => 'parents are thinking!', [t], { trace: { label: 'thinking' } });
            traceableExecution.run(
              (f1) => {
                traceableExecution.run(() => 'child1 is thinking!', [f1], { trace: { label: 'thinking' } });
                traceableExecution.run(() => 'child2 is deciding!', ['so?'], { trace: { label: 'deciding' } });
                return 'child1 has decided!';
              },
              [f]
            );
            return 'parent have decided!';
          },
          [temperature, forecast]
        );

        return Promise.resolve(`Weather information: ${temperature}, ${forecast}`);
      }

      await traceableExecution.run(getWeatherInformation, ['Paris']);
      // Retrieve the trace
      const finalTrace = traceableExecution.getTrace();
      expect(finalTrace?.filter((node) => node.group === 'nodes')?.length).toEqual(8);
      expect(finalTrace?.filter((node) => node.group === 'edges')?.length).toEqual(4);
      expect(finalTrace?.find((node) => node.group === 'nodes' && node.data.label === 'deciding')?.data.parent).toEqual(
        expect.stringMatching(/^function_.*$/)
      );
    });

    it('should trace sync and async errors in throwErrorFunction and asyncThrowErrorFunction', async () => {
      function throwErrorFunction(param: string) {
        throw new Error(`Sample Error: ${param}`);
      }

      jest.useFakeTimers({ doNotFake: ['performance'] });

      async function asyncThrowErrorFunction(param: string) {
        jest.advanceTimersByTime(1000);
        throw new Error(`Sample Async Error: ${param}`);
      }

      const nodeId = 'errorTrace_custom_id_1';
      traceableExecution.run(throwErrorFunction, ['InputParam'], {
        trace: { id: nodeId },
        config: { errors: 'catch', traceExecution: { errors: true, startTime: true, endTime: true } }
      });

      const nodeId2 = 'errorTrace_custom_id_2';
      await traceableExecution.run(asyncThrowErrorFunction, ['InputParam2'], {
        trace: { id: nodeId2 },
        config: { errors: 'catch', traceExecution: { errors: true, startTime: true, endTime: true } }
      });

      const trace = traceableExecution.getTrace();
      expect(trace?.length).toEqual(3);

      // Check if the errors are traced for sampleFunction
      const node1 = traceableExecution.getTraceNodes().find((node) => node.data.id === nodeId);
      expect(node1?.data).toEqual({
        abstract: false,
        createTime: expect.any(Date),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: expect.any(Number),
        elapsedTime: expect.any(String),
        errors: [
          {
            message: 'Sample Error: InputParam',
            name: 'Error'
          }
        ],
        id: 'errorTrace_custom_id_1',
        label: expect.stringMatching(/errorTrace_custom_id_1/)
      });

      // Check if the errors are traced for sampleFunction2
      const node2 = traceableExecution.getTraceNodes().find((node) => node.data.id === nodeId2);
      expect(node2?.data).toEqual({
        abstract: false,
        createTime: expect.any(Date),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: expect.any(Number),
        elapsedTime: expect.any(String),
        errors: [
          {
            message: 'Sample Async Error: InputParam2',
            name: 'Error'
          }
        ],
        id: 'errorTrace_custom_id_2',
        label: expect.stringMatching(/errorTrace_custom_id_2/)
      });
    });

    it('should add narratives to a trace node and verify the updated trace and ordered narratives', () => {
      const sampleFunction = (param: string) => `Result: ${param}`;

      const nodeId = 'sampleFunction_custom_id_1';
      traceableExecution.run(sampleFunction, ['InputParam'], {
        trace: { id: nodeId, narratives: ['Narrative 0'] },
        config: { traceExecution: { narratives: (res) => [`Narrative 0 with ${res.outputs}`] } }
      });

      traceableExecution.run(sampleFunction, ['InputParam'], {
        trace: { id: 'sampleFunction_custom_id_2', narratives: ['Narrative 0 for function 2'] },
        config: { traceExecution: { narratives: ['Narrative 1 for function 2', 'Narrative 2 for function 2'] } }
      });

      traceableExecution.pushNarratives(
        'sampleFunction_custom_id_3',
        'Narrative -1 for function 3, anticipated narrative before node creation'
      );
      traceableExecution.run(sampleFunction, ['InputParam'], {
        trace: { id: 'sampleFunction_custom_id_3', narratives: ['Narrative 0 for function 3'] },
        config: { traceExecution: { narratives: true } }
      });

      traceableExecution.run(sampleFunction, ['InputParam'], {
        trace: { id: 'sampleFunction_custom_id_4', narratives: ['Narrative 0 for function 4, non traced!!'] },
        config: { traceExecution: { narratives: false } }
      });

      const trace = traceableExecution.getTrace();
      expect(trace?.length).toEqual(7);

      // Use pushNarrative to add a single narrative to the specified node
      traceableExecution.pushNarratives(nodeId, 'Narrative 1');

      // Check if the narrative was added successfully
      const nodeWithNarrative = traceableExecution.getTraceNodes().find((node) => node.data.id === nodeId);
      expect(nodeWithNarrative?.data.narratives).toEqual(['Narrative 0', 'Narrative 0 with Result: InputParam', 'Narrative 1']);

      // Use pushNarratives to add an array of narratives to the same node
      traceableExecution.pushNarratives(nodeId, ['Narrative 2', 'Narrative 3']);

      // Check if the narratives were appended successfully
      const nodeWithAppendedNarratives = traceableExecution.getTraceNodes().find((node) => node.data.id === nodeId);
      expect(nodeWithAppendedNarratives?.data.narratives).toEqual([
        'Narrative 0',
        'Narrative 0 with Result: InputParam',
        'Narrative 1',
        'Narrative 2',
        'Narrative 3'
      ]);

      // Get the ordered narratives and verify their content
      const orderedNarratives = traceableExecution.getNarratives();
      expect(orderedNarratives).toEqual([
        'Narrative 0',
        'Narrative 0 with Result: InputParam',
        'Narrative 1',
        'Narrative 2',
        'Narrative 3',
        'Narrative 0 for function 2',
        'Narrative 1 for function 2',
        'Narrative 2 for function 2',
        'Narrative -1 for function 3, anticipated narrative before node creation',
        'Narrative 0 for function 3'
      ]);
    });

    it('should enhance trace details for a sample function with various configurations', () => {
      const sampleFunction = (param: unknown) => `Result: ${param}`;
      // Run the sample function using the run method and create nodes in the trace
      const traceExecutionConfig = {
        inputs: (i) => 'better input for trace: ' + i,
        outputs: (o) => 'better output for trace: ' + o,
        narratives: (res) => {
          return [`Narrative 0 with ${res.outputs}`];
        }
      };
      const nodeId = 'sampleFunction_custom_id_1';
      traceableExecution.run(sampleFunction, ['InputParam', 'InputParam2'], {
        trace: { id: nodeId, narratives: ['Narrative 0'], label: 'sampleFunction' },
        config: { traceExecution: traceExecutionConfig }
      });

      const nodeId2 = 'sampleFunction_custom_id_2';
      traceableExecution.run(sampleFunction, ['InputParam', 'InputParam2'], {
        trace: {
          id: nodeId2,
          narratives: ['Narrative 0'],
          label: 'sampleFunction2',
          inputs: ['overwritten InputParam', ' just for logging'],
          outputs: ['overwritten InputParam', ' just for logging output']
        },
        config: { traceExecution: { ...traceExecutionConfig, startTime: true, endTime: true } }
      });

      const nodeId3 = 'sampleFunction_custom_id_3';
      traceableExecution.run(sampleFunction, ['InputParam', 'InputParam2'], {
        trace: {
          id: nodeId3,
          narratives: ['Narrative 0'],
          label: 'sampleFunction with mentioned trace config in array format'
        },
        config: { traceExecution: ['inputs', 'outputs'] }
      });

      const nodeId4 = 'sampleFunction_custom_id_4';
      traceableExecution.run(
        sampleFunction,
        [
          'InputParam',
          {
            name: {
              value1: 'not traced',
              value2: ['this is traced', 'but not this', 'this is traced also']
            },
            name2: { traced: 'yes, this should be traced too..', noTrace: 'no, not this one..' }
          },
          { name3: 'trace of the 3rd input' }
        ],
        {
          trace: {
            id: nodeId4,
            narratives: ['Narrative 0'],
            label: 'sampleFunction with filtered input tracing'
          },
          config: {
            traceExecution: {
              inputs: ['1.name.value2.0', '1.name.value2.2', 'name2.traced', 'name3'],
              outputs: true
            }
          }
        }
      );

      const nodeId5 = 'sampleFunction_custom_id_5';
      traceableExecution.run(sampleFunction, ['InputParam', 'InputParam2'], {
        trace: {
          id: nodeId5,
          narratives: ['Narrative 0'],
          label: 'sampleFunction with disabled tracing',
          inputs: 'custom input not traced'
        },
        config: { traceExecution: false }
      });

      const trace = traceableExecution.getTrace();
      expect(trace?.length).toEqual(9);
      expect(trace?.find((node) => node.group === 'nodes' && node.data.id === nodeId)).toEqual({
        data: {
          id: expect.stringMatching(/^sampleFunction_.*$/),
          label: 'sampleFunction',
          inputs: 'better input for trace: InputParam,InputParam2',
          outputs: 'better output for trace: Result: InputParam',
          errors: undefined,
          narratives: ['Narrative 0', 'Narrative 0 with Result: InputParam'],
          parallel: undefined,
          startTime: undefined,
          endTime: undefined,
          duration: undefined,
          elapsedTime: undefined,
          abstract: false,
          createTime: expect.any(Date)
        },
        group: 'nodes'
      });

      expect(trace?.find((node) => node.group === 'nodes' && node.data.id === nodeId2)).toEqual({
        data: {
          id: expect.stringMatching(/^sampleFunction_.*$/),
          label: 'sampleFunction2',
          inputs: 'better input for trace: overwritten InputParam, just for logging',
          outputs: 'better output for trace: overwritten InputParam, just for logging output',
          errors: undefined,
          narratives: ['Narrative 0', 'Narrative 0 with overwritten InputParam, just for logging output'],
          parallel: undefined,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: expect.any(Number),
          elapsedTime: expect.any(String),
          abstract: false,
          createTime: expect.any(Date)
        },
        group: 'nodes'
      });

      expect(trace?.find((node) => node.group === 'nodes' && node.data.id === nodeId3)).toEqual({
        data: {
          id: expect.stringMatching(/^sampleFunction_.*$/),
          label: 'sampleFunction with mentioned trace config in array format',
          abstract: false,
          parallel: undefined,
          createTime: expect.any(Date),
          inputs: ['InputParam', 'InputParam2'],
          outputs: 'Result: InputParam'
        },
        group: 'nodes'
      });

      expect(trace?.find((node) => node.group === 'nodes' && node.data.id === nodeId4)).toEqual({
        data: {
          id: expect.stringMatching(/^sampleFunction_.*$/),
          label: 'sampleFunction with filtered input tracing',
          narratives: undefined,
          inputs: [
            { '1.name.value2.0': 'this is traced' },
            { '1.name.value2.2': 'this is traced also' },
            { 'name2.traced': 'yes, this should be traced too..' },
            { name3: 'trace of the 3rd input' }
          ],
          outputs: 'Result: InputParam',
          errors: undefined,
          abstract: false,
          parallel: undefined,
          createTime: expect.any(Date)
        },
        group: 'nodes'
      });

      expect(trace?.find((node) => node.group === 'nodes' && node.data.id === nodeId5)).toEqual({
        data: {
          id: expect.stringMatching(/^sampleFunction_.*$/),
          label: 'sampleFunction with disabled tracing',
          abstract: false,
          parallel: undefined,
          createTime: expect.any(Date)
        },
        group: 'nodes'
      });
    });
  });

  describe('TraceableEngine with initialTrace', () => {
    it('should run with initial trace and then get the trace', async () => {
      // Create a sample initial trace
      const initialTrace = [
        {
          group: 'nodes',
          data: {
            id: 'node_1',
            label: 'Node 1'
          }
        } as Node
      ];

      // Create an instance of TraceableEngine with the initial trace
      const traceableExecution = new TraceableEngine(initialTrace);

      // Define a function to be used in the run method
      const sampleFunction = (param: string) => {
        return `Result: ${param}`;
      };

      // Run the function using the run method
      const executionResult = traceableExecution.run(sampleFunction, ['InputParam']);

      // Assert that the execution result is as expected
      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toEqual('Result: InputParam');

      // Now, get the trace and assert that it includes a sampleFunction node
      const finalTrace = traceableExecution.getTrace();
      expect(finalTrace?.length).toEqual(3);
      expect(finalTrace?.filter((n) => n.group === 'nodes')?.length).toEqual(2);
      expect(finalTrace?.filter((n) => n.group === 'edges')?.length).toEqual(1);

      const nodes = traceableExecution.getTraceNodes();
      expect(nodes?.length).toEqual(finalTrace?.filter((n) => n.group === 'nodes')?.length);

      // Perform assertions on the finalTrace
      expect(finalTrace).toMatchObject([
        ...initialTrace,
        {
          data: {
            id: expect.stringMatching(/^sampleFunction_.*$/),
            label: 'sampleFunction',
            inputs: ['InputParam'],
            outputs: 'Result: InputParam',
            parallel: false,
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            duration: expect.any(Number),
            elapsedTime: expect.any(String),
            abstract: false,
            createTime: expect.any(Date)
          },
          group: 'nodes'
        },
        {
          data: {
            id: expect.stringMatching(/^node_1->sampleFunction_.*$/),
            source: 'node_1',
            target: expect.stringMatching(/^sampleFunction_.*$/)
          },
          group: 'edges'
        }
      ]);
    });
  });
});
