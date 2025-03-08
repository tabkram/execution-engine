/**
 * Represents details of a timed execution.
 */
export interface TimerDetailsModel {
  /** Unique identifier for the execution. */
  executionId: string;

  /** The timestamp when execution started. */
  startTime: Date | undefined;

  /** The timestamp when execution ended. */
  endTime: Date | undefined;

  /** Total execution time in milliseconds. */
  duration: number | undefined;

  /** Human-readable duration of the execution. */
  elapsedTime: string | undefined;
}
