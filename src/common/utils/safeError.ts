// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeError(error: unknown): any {
  if (error instanceof Error) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (error as any)?.code,
      name: error.name,
      message: error.message
      // stack: error.stack
    };
  }

  try {
    return JSON.parse(JSON.stringify(error));
  } catch {
    return String(error);
  }
}
