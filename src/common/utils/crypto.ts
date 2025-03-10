import { createHash } from 'crypto';

/**
 * Generates a SHA-256 hash ID from the given inputs.
 *
 * @param inputs - Values to hash.
 * @returns A 64-character hex string.
 */
export function generateHashId(...inputs: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}
