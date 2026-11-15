import { createHash } from 'crypto';

type Normalized = unknown;

const identities = new WeakMap<WeakKey, number>();
let nextIdentity = 0;

/** Stable per-process identity for values that have no hashable content (promises, weak collections...). */
function identityOf(value: WeakKey): number {
  let identity = identities.get(value);
  if (identity === undefined) {
    identity = nextIdentity++;
    identities.set(value, identity);
  }
  return identity;
}

function constructorName(value: object): string {
  return (Object.getPrototypeOf(value) as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'Object';
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function normalizePrimitive(value: unknown): Normalized {
  switch (typeof value) {
    case 'undefined':
      return { $type: 'undefined' };
    case 'bigint':
      return { $type: 'bigint', value: value.toString() };
    case 'number':
      return Number.isFinite(value) && !Object.is(value, -0)
        ? value
        : { $type: 'number', value: Object.is(value, -0) ? '-0' : String(value) };
    case 'symbol': {
      const registered = Symbol.keyFor(value);
      return registered === undefined ? { $type: 'symbol', description: value.description } : { $type: 'symbol', key: registered };
    }
    case 'function':
      // Content cannot be compared, so the source text separates different functions.
      return { $type: 'function', name: value.name, source: Function.prototype.toString.call(value) };
    default:
      return value;
  }
}

/**
 * Converts a value to a JSON-safe structure while keeping every type that
 * `JSON.stringify` would otherwise erase, merge or reject distinguishable.
 * Plain JSON values (strings, finite numbers, booleans, null, arrays, plain objects) keep their exact JSON form.
 */
function normalize(value: unknown, ancestors: object[], key = ''): Normalized {
  if (typeof value !== 'object' || value === null) {
    return normalizePrimitive(value);
  }

  const depth = ancestors.indexOf(value);
  if (depth !== -1) {
    return { $type: 'circular', depth };
  }

  ancestors.push(value);
  try {
    const child = (item: unknown, childKey = ''): Normalized => normalize(item, ancestors, childKey);
    const own = (source: object): Record<string, Normalized> => {
      const result: Record<string, Normalized> = {};
      for (const objectKey of Object.keys(source)) {
        result[objectKey] = child((source as Record<string, unknown>)[objectKey], objectKey);
      }
      return result;
    };

    if (Array.isArray(value)) {
      const items: Normalized[] = [];
      for (let index = 0; index < value.length; index++) {
        items.push(index in value ? child(value[index], String(index)) : { $type: 'hole' });
      }
      return items;
    }
    if (ArrayBuffer.isView(value)) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      return { $type: constructorName(value), value: Array.from(bytes) };
    }
    if (value instanceof ArrayBuffer) {
      return { $type: 'ArrayBuffer', value: Array.from(new Uint8Array(value)) };
    }
    if (value instanceof Map) {
      return { $type: 'Map', value: Array.from(value, ([k, v]) => [child(k), child(v)]) };
    }
    if (value instanceof Set) {
      return { $type: 'Set', value: Array.from(value, (item) => child(item)) };
    }
    if (value instanceof RegExp) {
      return { $type: 'RegExp', value: value.toString() };
    }
    if (value instanceof Number || value instanceof String || value instanceof Boolean || value instanceof BigInt) {
      return { $type: 'Boxed', name: constructorName(value), value: child(value.valueOf()) };
    }
    if (value instanceof Error) {
      return {
        $type: 'Error',
        name: constructorName(value),
        message: value.message,
        cause: child((value as { cause?: unknown }).cause),
        value: own(value)
      };
    }
    if (value instanceof WeakMap || value instanceof WeakSet || value instanceof WeakRef || value instanceof Promise) {
      return { $type: constructorName(value), id: identityOf(value) };
    }
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      // Date, URL, Buffer... keep their type so they do not collide with the plain value they serialize to.
      return { $type: 'toJSON', name: constructorName(value), value: child((value as { toJSON: (key: string) => unknown }).toJSON(key)) };
    }

    const result = own(value);
    const keys = Object.keys(result);
    if (isPlainObject(value)) {
      // A user key named $type must not be mistaken for one of the markers above.
      return keys.includes('$type') ? { $type: 'Object', value: result } : result;
    }
    // Class instance: hash its enumerable state, or its identity when it exposes none.
    return keys.length > 0
      ? { $type: 'Class', name: constructorName(value), value: result }
      : { $type: 'Instance', name: constructorName(value), id: identityOf(value) };
  } finally {
    ancestors.pop();
  }
}

/**
 * Generates a SHA-256 hash ID from the given inputs.
 *
 * Unlike a bare `JSON.stringify`, values it would merge or reject get distinct hashes:
 * `Map`, `Set`, `RegExp`, `Date`, class instances, `Error`, typed arrays, `undefined`, `NaN`,
 * `Infinity`, `-0`, `BigInt`, symbols, functions (by source text) and circular references.
 * Plain JSON values keep the exact hash they always had.
 *
 * Limits: closures with the same source but different captured variables hash the same, and
 * state that is not enumerable (private fields, symbol keys) is not seen.
 *
 * @param inputs - Values to hash.
 * @returns A 64-character hex string.
 */
export function generateHashId(...inputs: unknown[]): string {
  return createHash('sha256')
    .update(JSON.stringify(normalize(inputs, [])))
    .digest('hex');
}
