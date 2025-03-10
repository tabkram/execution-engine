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
});
