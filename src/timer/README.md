# ExecutionTimer

`ExecutionTimer` is a simple TypeScript class for measuring the execution time of code blocks. It provides methods to start, stop, and retrieve the duration of the timer. Additionally, it includes a function to get human-readable elapsed time.

## Usage

```typescript
import { ExecutionTimer } from 'execution-timer';

// Create an instance of ExecutionTimer
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
