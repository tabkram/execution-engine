
export interface TimerDetailsModel{
  executionId: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  duration: number | undefined;
  elapsedTime: string | undefined;
}
