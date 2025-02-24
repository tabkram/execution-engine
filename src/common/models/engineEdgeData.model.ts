export interface EngineEdgeData {
  id: string;
  source: string | number;
  target: string | number;
  parent?: string;
  parallel?: boolean | string;
}

/**
 * @deprecated Use `EngineEdgeData` instead.
 *
 * ⚠️ `EdgeData` is deprecated and will be removed in a future release.
 * Migrate to `EngineEdgeData` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EdgeData extends EngineEdgeData {}
