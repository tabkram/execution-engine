import { NodeData } from './trace.model';
import { TraceableExecution } from './traceableExecution';

describe('TraceableExecution', () => {
  let traceableExecution: TraceableExecution;
  beforeEach(() => {
    traceableExecution = new TraceableExecution();
  });

  it('should create a trace of consecutive calls', async () => {
    function registerUser(username: string, password: string) {
      if (username && password) {
        return Promise.resolve(`User ${username} successfully registered`);
      } else {
        Promise.reject('Invalid registration information');
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
    const newUser = {
      username: 'john_doe',
      password: 'secure_password'
    };
    await traceableExecution.run(registerUser, [newUser.username, newUser.password]);
    traceableExecution.run(loginUser, [newUser.username, newUser.password]);
    traceableExecution.run(getUserInformation, [newUser.username]);

    // Retrieve the trace
    const finalTrace = traceableExecution.getTrace();

    // Perform assertions on the finalTrace
    expect(finalTrace?.length).toEqual(5);
    expect(finalTrace?.filter((n) => n.group === 'nodes')?.length).toEqual(3);
    expect(finalTrace?.filter((n) => n.group === 'edges')?.length).toEqual(2);
  });

  it('should create a trace of fetching data simultaneously from two functions using Promise.all', async () => {
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
    expect(finalTrace?.filter((n) => n.group === 'nodes')?.length).toEqual(3);
    expect(finalTrace?.filter((n) => n.group === 'edges')?.length).toEqual(0);
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
});
