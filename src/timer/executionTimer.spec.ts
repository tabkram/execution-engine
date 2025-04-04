import { ExecutionTimer } from './executionTimer';

describe('ExecutionTimer', () => {
  let timer: ExecutionTimer;

  beforeAll(() => {
    // redefining readonly property of the performance object
    Object.defineProperty(performance, 'now', {
      value: performance.now,
      configurable: true,
      writable: true
    });
  });

  beforeEach(() => {
    timer = new ExecutionTimer();
  });

  it('should start the timer', () => {
    timer.start();
    expect(timer.getStartDate()).toBeDefined();
  });

  it('should stop the timer', () => {
    timer.start();
    timer.stop();
    expect(timer.getEndDate()).toBeDefined();
  });

  it('should get the duration', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(200);
    timer.start();
    // Simulate some code execution time
    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.stop();
    expect(timer.getDuration()).toBe(800);
  });

  it('should get the start date in ISO format', () => {
    timer.start();
    expect(timer.getStartDate() instanceof Date).toBe(true);
  });

  it('should get the end date in ISO format', () => {
    timer.start();
    timer.stop();
    expect(timer.getEndDate() instanceof Date).toBe(true);
  });

  it('should get the duration with a custom execution ID', () => {
    const customId = 'customId';
    jest.spyOn(performance, 'now').mockReturnValueOnce(200);
    timer.start(customId);
    // Simulate some code execution time
    jest.spyOn(performance, 'now').mockReturnValueOnce(2000);
    expect(timer.getDuration(customId)).toBe(1800);
  });

  it('should get the start date with a custom execution ID', () => {
    const customId = 'customId';
    timer.start(customId);
    expect(timer.getStartDate(customId) instanceof Date).toBe(true);
  });

  it('should get the end date with a custom execution ID', () => {
    const customId = 'customId';
    timer.start(customId);
    timer.stop(customId);
    expect(timer.getEndDate(customId) instanceof Date).toBe(true);
  });

  it('should get human-readable elapsed time for a duration', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start();
    // Simulate some code execution time
    jest.spyOn(performance, 'now').mockReturnValueOnce(4000);
    timer.stop();
    const elapsedTime = timer.getElapsedTime();
    expect(elapsedTime).toMatch(/3 seconds/);
  });

  it('should get human-readable elapsed time with hours and minutes', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start();
    // Advance time by 1 hour, 1 minute, and 5 seconds
    jest.spyOn(performance, 'now').mockReturnValueOnce(3666000);
    timer.stop();
    const elapsedTime = timer.getElapsedTime();
    expect(elapsedTime).toMatch(/1 hour 1 minute 5 seconds/);
  });

  it('should get human-readable elapsed time with milliseconds', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start();
    jest.spyOn(performance, 'now').mockReturnValueOnce(1123.123456);
    timer.stop();
    const elapsedTimeExact = timer.getElapsedTime();
    expect(elapsedTimeExact).toMatch(/123.123456(\d+)? ms/);
    const elapsedTimeFraction6 = timer.getElapsedTime(undefined, 6);
    expect(elapsedTimeFraction6).toMatch(/123.123456 ms/);
    const elapsedTimeFraction0 = timer.getElapsedTime(undefined, 0);
    expect(elapsedTimeFraction0).toMatch(/123 ms/);
  });

  it('should return undefined for getElapsedTime when timer is not started', () => {
    const elapsedTime = timer.getElapsedTime();
    expect(elapsedTime).toBeUndefined();
  });

  // it("should return undefined for getElapsedTime when timer is not stopped", () => {
  //   timer.start();
  //   const elapsedTime = timer.getElapsedTime();
  //   expect(elapsedTime).toBeUndefined();
  // });

  it('should get human-readable elapsed time with a custom execution ID', () => {
    const customId = 'customId';
    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start(customId);
    jest.spyOn(performance, 'now').mockReturnValueOnce(6000);
    timer.stop(customId);
    const elapsedTime = timer.getElapsedTime(customId);
    expect(elapsedTime).toMatch(/5 seconds/);
  });

  it('should return correct timer details', () => {
    const customId = 'testExecution';

    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start(customId);

    jest.spyOn(performance, 'now').mockReturnValueOnce(5000);
    timer.stop(customId);

    const timeInfo = timer.getInfo(customId);

    expect(timeInfo).toBeDefined();
    expect(timeInfo.executionId).toBe(customId);
    expect(timeInfo.startTime).toBeInstanceOf(Date);
    expect(timeInfo.endTime).toBeInstanceOf(Date);
    expect(timeInfo.duration).toBe(4000);
    expect(timeInfo.elapsedTime).toMatch(/4 seconds/);
  });

  it('should return default values if timer was not started', () => {
    const timeInfo = timer.getInfo('timerForDetails');

    expect(timeInfo).toBeDefined();
    expect(timeInfo.executionId).toBe('timerForDetails');
    expect(timeInfo.startTime).toBeUndefined();
    expect(timeInfo.endTime).toBeUndefined();
    expect(timeInfo.duration).toBeUndefined();
    expect(timeInfo.elapsedTime).toBeUndefined();
  });

  it('should handle fraction digits for duration', () => {
    const customId = 'fractionTest';

    jest.spyOn(performance, 'now').mockReturnValueOnce(1000);
    timer.start(customId);

    jest.spyOn(performance, 'now').mockReturnValueOnce(3500);
    timer.stop(customId);

    const timeInfo = timer.getInfo(customId, 2);

    expect(timeInfo.duration).toBeCloseTo(2500, 2);
  });
});
