# Timer

`ExecutionTimer` measures elapsed time without creating a trace. The tracing APIs use the same timer internally.

Timings come from `performance.now()`, so they are monotonic and unaffected by system clock changes.

## Usage

### Basic

```ts
import { ExecutionTimer } from 'execution-engine';

const timer = new ExecutionTimer();

timer.start();
for (let i = 0; i < 1_000_000; i++) {
  // work to measure
}
timer.stop();

console.log(timer.getDuration());    // 4.213829994201660
console.log(timer.getElapsedTime()); // "4.213 ms"
```

### Multiple timers

One instance can hold many independent timers, each identified by a string. Anything without an explicit id uses
`'default'`:

```ts
const timer = new ExecutionTimer();

timer.start('fetch');
await fetchUsers();
timer.stop('fetch');

timer.start('render');
renderUsers();
timer.stop('render');

console.log(timer.getElapsedTime('fetch'));  // "128.442 ms"
console.log(timer.getElapsedTime('render')); // "3.118 ms"
```

### Timer details

`getInfo()` returns all the details for one timer as a single object:

```ts
console.log(timer.getInfo('fetch', 2, 2));
// {
//   executionId: 'fetch',
//   startTime: 2025-08-08T15:14:50.118Z,
//   endTime:   2025-08-08T15:14:50.246Z,
//   duration: 128.44,
//   elapsedTime: '128.44 ms'
// }
```

### Human-readable output

`getElapsedTime()` breaks longer durations into readable units:

| Duration | `getElapsedTime()` |
| --- | --- |
| `4.21382999420166` | `"4.21382999420166 ms"` |
| `999` | `"999 ms"` |
| `1500` | `"1 second and 500 ms"` |
| `65000.25` | `"1 minute 5 seconds and 0.25 ms"` |

Pass `fractionDigits` to control the millisecond precision: `timer.getElapsedTime('default', 3)` → `"4.214 ms"`.

::: warning Display text only
For whole-second durations, the current formatter can leave a trailing `"and"`, such as `"1 minute 5 seconds and"`.
Use [`getDuration()`](#getduration) for calculations and assertions.
:::

## API

### `constructor(executionId?)` {#constructor}

Creates a timer identified by `executionId`, defaulting to `'default'`. Construction does not start it.

### `start(executionId?)`

Starts, or restarts, the named timer. Restarting resets both timestamps.

### `stop(executionId?)`

Stops the named timer. Does nothing if that timer was never started.

### `getDuration(executionId?, fractionDigits?)` {#getduration}

Returns the elapsed milliseconds as a `number`, or `undefined` if the timer was never started.

- `fractionDigits` — decimal places from `0` to `100`. Omit it for full precision.

::: tip Stopping is implicit
Calling `getDuration()` on a running timer stops it before returning the duration. `getElapsedTime()` does the same
because it reads the duration internally.
:::

### `getElapsedTime(executionId?, fractionDigits?)` {#getelapsedtime}

Returns the duration as a human-readable `string`, or `undefined` if the timer was never started.

### `getStartDate(executionId?)`

Returns the wall-clock `Date` at which the timer started, or `undefined`. Derived from `performance.timeOrigin` plus
the recorded offset.

### `getEndDate(executionId?)`

Returns the wall-clock `Date` at which the timer stopped, or `undefined` if it has not been stopped.

### `getInfo(executionId?, durationFractionDigits?, elapsedTimeFractionDigits?)` {#getinfo}

Returns a [`TimerDetailsModel`](../reference/types.md#timerdetailsmodel) for one timer:

```ts
interface TimerDetailsModel {
  executionId: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  duration: number | undefined;
  elapsedTime: string | undefined;
}
```

The two precision arguments round `duration` and the millisecond portion of `elapsedTime` independently.

Stop a running timer before calling `getInfo()` when you need `endTime` in that result. `getInfo()` reads `endTime`
before `getDuration()` performs its implicit stop.

## Remarks

- The individual value getters return `undefined` when the requested timer was never started. `getInfo()` still
  returns an object, with its unavailable fields set to `undefined`.
- `getEndDate()` returns `undefined` while a timer is running. After `stop()` or `getDuration()`, it returns the
  recorded end date.

## See also

- [trace](./trace.md) — automatic timing as part of a full execution trace.
- [Trace](../engine/trace.md) — where `duration` and `elapsedTime` land on a trace node.
