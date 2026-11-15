import { createHash } from 'crypto';

import { generateHashId } from './crypto';

describe('generateUniqueId', () => {
  it('generates a unique hash for given inputs', () => {
    const id1 = generateHashId('test', 123, { key: 'value' });
    const id2 = generateHashId('test', 123, { key: 'value' });

    expect(id1).toBe(id2);
  });

  it('generates different hashes for different inputs', () => {
    const id1 = generateHashId('test1');
    const id2 = generateHashId('test2');

    expect(id1).not.toBe(id2);
  });

  it('handles empty input', () => {
    const id1 = generateHashId();
    const id2 = generateHashId();

    expect(id1).toBe(id2);
  });

  it('creates a 64-character hash', () => {
    const id = generateHashId('sample');
    expect(id).toHaveLength(64);
  });

  it('keeps the hash of plain JSON inputs unchanged', () => {
    const inputs = ['a', 1, 0, -1.5, null, true, [1, { b: 2 }], { x: 'y', z: [3], nested: { k: [] } }];
    const legacy = createHash('sha256').update(JSON.stringify(inputs)).digest('hex');

    expect(generateHashId(...inputs)).toBe(legacy);
  });

  it('distinguishes Map, Set and RegExp inputs', () => {
    expect(generateHashId(new Map([['a', 1]]))).not.toBe(generateHashId(new Map([['b', 2]])));
    expect(generateHashId(new Set(['x']))).not.toBe(generateHashId(new Set(['y'])));
    expect(generateHashId(/a/g)).not.toBe(generateHashId(/b/g));
    expect(generateHashId(new Map([['a', 1]]))).toBe(generateHashId(new Map([['a', 1]])));
    expect(generateHashId(new Map(), new Set(), {})).toHaveLength(64);
    expect(generateHashId(new Map())).not.toBe(generateHashId(new Set()));
  });

  it('distinguishes undefined, null and NaN', () => {
    const hashes = [undefined, null, NaN, Infinity, -Infinity].map((value) => generateHashId(value));

    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('hashes BigInt inputs without throwing', () => {
    expect(generateHashId(1n)).toBe(generateHashId(1n));
    expect(generateHashId(1n)).not.toBe(generateHashId(2n));
    expect(generateHashId(1n)).not.toBe(generateHashId(1));
    expect(generateHashId(1n)).not.toBe(generateHashId('1'));
  });

  it('hashes circular references without throwing', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    const b: Record<string, unknown> = { name: 'b' };
    b.self = b;

    expect(generateHashId(a)).toBe(generateHashId(a));
    expect(generateHashId(a)).not.toBe(generateHashId(b));
  });

  it('does not treat repeated non-circular references as circular', () => {
    const shared = { v: 1 };

    expect(generateHashId([shared, shared])).toBe(generateHashId([{ v: 1 }, { v: 1 }]));
  });

  describe('values JSON.stringify would merge', () => {
    class A {
      x = 1;
    }
    class B {
      x = 1;
    }
    const pairs: Array<[string, unknown, unknown]> = [
      ['functions with different source', (): number => 1, (): number => 2],
      ['different symbols by key', Symbol.for('a'), Symbol.for('b')],
      ['local symbols with different descriptions', Symbol('a'), Symbol('b')],
      ['Date and its ISO string', new Date(0), new Date(0).toISOString()],
      ['Date and null', new Date(NaN), null],
      ['URL and its string', new URL('https://a.b/'), 'https://a.b/'],
      ['object with undefined property and empty object', { a: undefined }, {}],
      ['undefined and null in an array', [undefined], [null]],
      ['hole and undefined in an array', [, 1], [undefined, 1]], // eslint-disable-line no-sparse-arrays
      ['-0 and 0', -0, 0],
      ['instances of different classes', new A(), new B()],
      ['class instance and plain object', new A(), { x: 1 }],
      ['different errors', new Error('a'), new Error('b')],
      ['error and subclass', new Error('a'), new TypeError('a')],
      ['typed arrays', new Uint8Array([1]), new Uint8Array([2])],
      ['typed array and array-like object', new Uint8Array([1]), { 0: 1 }],
      ['ArrayBuffers', new Uint8Array([1]).buffer, new Uint8Array([2]).buffer],
      ['Buffer and its JSON shape', Buffer.from('a'), { type: 'Buffer', data: [97] }],
      ['boxed and primitive numbers', new Number(1), 1],
      ['two different promises', Promise.resolve(1), Promise.resolve(1)],
      ['WeakMap and empty object', new WeakMap(), {}],
      ['Map and Set', new Map(), new Set()],
      ['user $type object and marker', { $type: 'undefined' }, undefined],
      ['user $type object and Map', { $type: 'Map', value: [] }, new Map()],
      ['number and string', 1, '1'],
      ['Infinity and null', Infinity, null]
    ];

    it.each(pairs)('distinguishes %s', (_name, first, second) => {
      expect(generateHashId(first)).not.toBe(generateHashId(second));
    });

    it('hashes equal values the same', () => {
      const keyed = (): unknown[] => [
        new Date(5),
        new A(),
        new Error('a'),
        new Uint8Array([1, 2]),
        new Map([['k', new Set([1])]]),
        /x/gi,
        undefined,
        NaN,
        -0,
        1n,
        { a: undefined },
        (): number => 1,
        Symbol.for('s')
      ];

      expect(generateHashId(...keyed())).toBe(generateHashId(...keyed()));
    });

    it('keeps the same promise or instance without state stable', () => {
      const promise = Promise.resolve(1);
      const stateless = new (class Service {})();

      expect(generateHashId(promise)).toBe(generateHashId(promise));
      expect(generateHashId(stateless)).toBe(generateHashId(stateless));
    });
  });
});
