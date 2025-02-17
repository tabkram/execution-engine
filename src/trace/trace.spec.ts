import { trace } from './trace';

describe('ExecutionTrace', () => {
  describe('ExecutionTrace on function', () => {
    it('should trace of consecutive user-related actions', async () => {
      function registerUser(username: string, password: string) {
        if (username && password) {
          return Promise.resolve(`User ${username} successfully registered`);
        } else {
          return Promise.reject('Invalid registration information');
        }
      }

      const newUserCredentials = {
        username: 'john_doe',
        password: 'secure_password'
      };
      const response = await trace(registerUser, [newUserCredentials.username, newUserCredentials.password]);
      console.log(response);

      expect(response.inputs).toEqual([newUserCredentials.username, newUserCredentials.password]);
      expect(response.outputs).toEqual('User john_doe successfully registered');
      expect(response.startTime).toEqual(expect.any(Date));
      expect(response.endTime).toEqual(expect.any(Date));
      expect(response.duration).toBeGreaterThanOrEqual(0);
    });
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
    const responseSync = trace(
      throwErrorFunction,
      ['InputParam'],
      {
        trace: { id: 'custom_id_1', label: 'labelqqqq', createTime: new Date() },
        config: { errors: 'catch', traceExecution: { errors: true, startTime: true, endTime: true } }
      },
      console.error
    );

    const nodeId2 = 'errorTrace_custom_id_2';
    const responseAsync = await trace(
      asyncThrowErrorFunction,
      ['InputParam2'],
      {
        // trace: { id: nodeId2 },
        config: { errors: 'catch', traceExecution: { errors: true, startTime: true, endTime: true } }
      },
      console.error
    );

    console.log(responseSync);
    console.log(responseAsync);
  });
});
