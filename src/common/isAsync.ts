// eslint-disable-next-line @typescript-eslint/ban-types
export function isAsync(func: Function): boolean {
  return func.constructor.name === 'AsyncFunction';
}
