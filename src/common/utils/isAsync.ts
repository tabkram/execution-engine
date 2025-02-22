// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isAsync(func: Function): boolean {
  return func.constructor.name === 'AsyncFunction';
}
