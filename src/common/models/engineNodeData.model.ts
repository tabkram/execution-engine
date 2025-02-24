import { ExecutionTrace } from './executionTrace.model';

export interface EngineNodeTrace {
  id: string;
  label: string;
  parent?: string;
  parallel?: boolean | string;
  abstract?: boolean;
  createTime?: Date;
  updateTime?: Date;
}

export interface EngineNodeData<I = unknown, O = unknown> extends EngineNodeTrace, ExecutionTrace<I, O> {}

export function isEngineNodeTrace(config: EngineNodeTrace | EngineNodeData | unknown): config is Partial<EngineNodeTrace> {
  return typeof config === 'object' && ('id' in config || 'label' in config || 'parent' in config);
}

/**
 * @deprecated Use `isEngineNodeTrace` instead.
 *
 * ⚠️ `isNodeTrace` is deprecated and will be removed in a future release.
 * Migrate to `isEngineNodeTrace` to ensure compatibility with future updates.
 */
export const isNodeTrace = isEngineNodeTrace;

/**
 * @deprecated Use `EngineNodeTrace` instead.
 *
 * ⚠️ `NodeTrace` is deprecated and will be removed in a future release.
 * Migrate to `EngineNodeTrace` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NodeTrace extends EngineNodeTrace {}


/**
 * @deprecated Use `EngineNodeData` instead.
 *
 * ⚠️ `NodeData` is deprecated and will be removed in a future release.
 * Migrate to `EngineNodeData` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NodeData extends EngineNodeData {}
