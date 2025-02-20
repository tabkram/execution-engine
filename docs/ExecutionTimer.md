# ExecutionTimer

`ExecutionTimer` is a simple TypeScript class for measuring the execution time of code blocks.
It provides methods to start, stop, and retrieve the duration of the timer.
Additionally, it includes a function to get human-readable elapsed time.

## Usage

### Importing the Class

```typescript
import { ExecutionTimer } from "execution-engine";
```

### Creating and using instance

```typescript
const timer = new ExecutionTimer();

// Start the timer
timer.start();

// Code execution you want to measure
for (let i = 0; i < 1000000; i++) {
  // Some computation
}

// Stop the timer
timer.stop();

// Get and log the duration
const duration = timer.getDuration();
console.log(`Execution time: ${duration} milliseconds`);

// Get and log the human-readable elapsed time
const elapsedTime = timer.getElapsedTime();
console.log(`Elapsed time: ${elapsedTime}`);

```

You can use a custom execution ID to track multiple timers independently:

```typescript
const customTimer = new ExecutionTimer('customId');

// Start and stop the timer with the custom ID
customTimer.start();
// Code execution
customTimer.stop();

// Get the duration and human-readable elapsed time
const customDuration = customTimer.getDuration();
const customElapsedTime = customTimer.getElapsedTime();

console.log(`Custom Timer Duration: ${customDuration} milliseconds`);
console.log(`Custom Timer Elapsed Time: ${customElapsedTime}`);
```

# API

### `constructor(executionId?: string)`

Creates an instance of ExecutionTimer.

- executionId (optional): An identifier for the execution timer. Defaults to 'default'.

### `start(executionId?: string): void`

Starts the execution timer.

- `executionId (optional)`: An identifier for the execution timer. Defaults to 'default'.

### `stop(executionId?: string): void`

Stops the execution timer.

- `executionId (optional)`: An identifier for the execution timer. Defaults to 'default'.

### `getDuration(executionId?: string): number | undefined`

Gets the duration of the execution timer in milliseconds.

- `executionId (optional)`: An identifier for the execution timer. Defaults to 'default'.

### `getElapsedTime(executionId?: string): string | undefined`

Gets the human-readable elapsed time of the execution timer.

- `executionId (optional)`: An identifier for the execution timer. Defaults to 'default'.

### `getInfo: (executionId?: string, fractionDigits?: number) => TimerDetailsModel`

Gets details of a specific execution timer.

- `executionId (optional)`: An identifier for the execution timer. Defaults to 'default'.
- `fractionDigits (optional)`: Decimal places for milliseconds.