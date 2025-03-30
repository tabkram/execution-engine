import { TimerDetailsModel } from '../common/models/timer.model';

/**
 * A class for measuring the execution time of code blocks.
 */
export class ExecutionTimer {
  private timer: { [key: string]: { startTime: number; endTime: number } } = {};

  /**
   * Creates an instance of ExecutionTimer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   */
  constructor(executionId?: string) {
    this.timer[executionId ?? 'default'] = {
      startTime: 0,
      endTime: 0
    };
  }

  /**
   * Starts the execution timer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   */
  start(executionId?: string): void {
    this.timer[executionId ?? 'default'] = {
      startTime: performance.now(),
      endTime: 0
    };
  }

  /**
   * Stops the execution timer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   */
  stop(executionId?: string): void {
    if (this.timer[executionId ?? 'default']?.startTime) {
      this.timer[executionId ?? 'default'].endTime = performance.now();
    }
  }

  /**
   * Gets the duration of the execution timer in milliseconds.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   * @param fractionDigits – The number of digits to appear after the decimal point; should be a value between 0 and 100, inclusive.
   * @returns The duration of the execution timer in milliseconds.
   */
  getDuration(executionId?: string, fractionDigits?: number): number {
    const timerId = executionId ?? 'default';
    if (this.timer[executionId ?? 'default']?.startTime) {
      if (!this.timer[executionId ?? 'default'].endTime) {
        this.stop(timerId);
      }
      const duration = this.timer[executionId ?? 'default'].endTime - this.timer[executionId ?? 'default'].startTime;

      return Number.isFinite(fractionDigits) ? Number(duration?.toFixed(fractionDigits)) : duration;
    }
  }

  /**
   * Gets the start date of the execution timer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   * @returns The start date of the execution timer.
   */
  getStartDate(executionId?: string): Date | undefined {
    if (this.timer[executionId ?? 'default']?.startTime) {
      const currentTime = performance.timeOrigin + this.timer[executionId ?? 'default']?.startTime;
      return new Date(currentTime);
    }
  }

  /**
   * Gets the end date of the execution timer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   * @returns The end date of the execution timer.
   */
  getEndDate(executionId?: string): Date | undefined {
    if (this.timer[executionId ?? 'default']?.endTime) {
      const currentTime = performance.timeOrigin + this.timer[executionId ?? 'default']?.endTime;
      return new Date(currentTime);
    }
  }

  /**
   * Gets the human-readable elapsed time of the execution timer.
   * @param executionId - An optional identifier for the execution timer. Defaults to 'default'.
   * @param fractionDigits – The number of digits to appear after the decimal point; should be a value between 0 and 100, inclusive.
   * @returns A string representing the human-readable elapsed time.
   */
  getElapsedTime(executionId?: string, fractionDigits?: number): string | undefined {
    const duration = this.getDuration(executionId);
    if (duration === undefined) {
      return undefined;
    }

    const milliseconds = duration % 1000;
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (seconds > 0) {
      parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    }
    if (parts?.length) {
      parts.push('and');
    }
    if (milliseconds > 0) {
      parts.push(`${Number.isFinite(fractionDigits) ? milliseconds.toFixed(fractionDigits) : milliseconds} ms`);
    }

    return parts.join(' ');
  }

  /**
   * Gets details of a specific execution timer.
   * @param executionId - The timer ID. Defaults to 'default'.
   * @param durationFractionDigits - Decimal places for milliseconds.
   * @param elapsedTimeFractionDigits - Decimal places for milliseconds.
   * @returns An object containing timer details.
   */
  getInfo(executionId: string = 'default', durationFractionDigits?: number, elapsedTimeFractionDigits?: number): TimerDetailsModel {
    return {
      executionId,
      startTime: this.getStartDate(executionId),
      endTime: this.getEndDate(executionId),
      duration: this.getDuration(executionId, durationFractionDigits),
      elapsedTime: this.getElapsedTime(executionId, elapsedTimeFractionDigits)
    };
  }
}
