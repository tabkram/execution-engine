import { EngineEdgeData } from './engineEdgeData.model';
import { EngineNodeData } from './engineNodeData.model';

export interface EngineNode {
  data: EngineNodeData;
  group: 'nodes';
}

export interface EngineEdge {
  data: EngineEdgeData;
  group: 'edges';
}

export type EngineTrace = Array<EngineNode | EngineEdge>;


/**
 * @deprecated Use `EngineNode` instead.
 *
 * ⚠️ `Node` is deprecated and will be removed in a future release.
 * Migrate to `EngineNode` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Node extends EngineNode {}

/**
 * @deprecated Use `EngineEdge` instead.
 *
 * ⚠️ `Edge` is deprecated and will be removed in a future release.
 * Migrate to `EngineEdge` to ensure compatibility with future updates.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Edge extends EngineEdge {}

/**
 * @deprecated Use `EngineTrace` instead.
 *
 * ⚠️ `Trace` is deprecated and will be removed in a future release.
 * Migrate to `EngineTrace` to ensure compatibility with future updates.
 */
export type Trace = EngineTrace;