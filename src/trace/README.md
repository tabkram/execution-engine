# TraceableExecution

The `TraceableExecution` class is a TypeScript utility that facilitates tracing and logging of function executions. It
captures detailed information about the inputs, outputs, errors, and execution time for each function call, allowing for
the creation of a trace graph.

The class also supports the addition of narratives to describe the execution flow. It provides a flexible and extensible
framework for tracking and visualizing the execution of functions, especially in asynchronous or promise-based
scenarios.

## Usage

1. Import the `TraceableExecution` class:

    ```typescript
    import { TraceableExecution } from 'path-to/TraceableExecution';
    ```

2. Create an instance of `TraceableExecution`:

    ```typescript
    const traceableExecution = new TraceableExecution();
    ```


3. Use the `run` method to execute a function and capture the trace:

    - for **asynchronous** functions:

        ```typescript
        const result = await traceableExecution.run(
          async (param1, param2) => {
            // Your function logic here
            return someResult;
          },
          [param1Value, param2Value]
        );
        ```

    - Use the run method for **synchronous** functions:

        ```typescript
        const result = traceableExecution.run(
          (param1, param2) => {
        // Your synchronous function logic here
            return someResult;
          },
          [param1Value, param2Value]
        );
        ```

    - The `result` object has the following structure:

        ```json lines
        {
          inputs: [
            param1Value,
            param2Value
          ],
          // An array containing the input values passed to the function.
          outputs: someResult,
          // The output value returned by the function.
          startTime: Date,
          // The start time of the function execution.
          endTime: Date,
          // The end time of the function execution.
          duration: number,
          // The duration of the function execution in milliseconds.
          // ...other properties depending on the configuration and trace options.
        }
        ```

4. Access the trace information:

    ```typescript
    const trace = traceableExecution.getTrace();
    console.log('Trace:', trace);
    ```

5. Optionally, add narratives to describe the execution flow:

    ```typescript
    traceableExecution.pushNarrative(nodeId, 'Narrative description');
    ```

## Advanced Configuration

The `TraceableExecution` class provides flexibility for advanced configurations, including custom trace options and
narratives. Explore the class methods and options for a more tailored usage.

## Examples

### 1. Here's a basic example:

```typescript
const traceableExecution = new TraceableExecution();

const result = await traceableExecution.run(
  async (param1, param2) => {
// Your function logic here
    return someResult;
  },
  [param1Value, param2Value]
);

console.log('Result:', result);

const trace = traceableExecution.getTrace();
console.log('Trace:', trace);
```

### 2. How to use `TraceableExecution` consecutive calls

In this example, we showcase the trace functionality by sequentially executing `registerUser`, `loginUser`,
and `getUserInformation` functions within the context of `traceableExecution`.

```typescript
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
console.log(JSON.stringify(finalTrace, null, 2));
``` 

### 3. How to use `TraceableExecution` with asynchronous functions and parallel execution

In this example, `fetchCurrentTemperature` and `fetchDailyForecast` simulate asynchronous operations,
while `getWeatherInformation` showcases running them in parallel with `Promise.all`
within the context of `TraceableExecution`. The resulting trace will capture the parallel execution relationships.

```typescript
import { NodeData, TraceableExecution } from "./TraceableExecution";

const traceableExecution = new TraceableExecution();

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
        config: { parallel: true }
      })
    )?.outputs,
    (
      await traceableExecution.run(fetchDailyForecast, [city], {
        trace: { parent: trace?.id },
        config: { parallel: true }
      })
    )?.outputs
  ]);

  return Promise.resolve(`Weather information: ${temperature}, ${forecast}`);
}

// Simulate some parallel execution
await traceableExecution.run(getWeatherInformation, ["Paris"]);
// Retrieve the trace
const finalTrace = traceableExecution.getTrace();

// Perform assertions on the finalTrace
console.log(JSON.stringify(finalTrace, null, 2));
   ```
