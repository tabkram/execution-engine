import { EngineEdgeData } from './engineEdgeData.model';
import { EngineNodeData } from './engineNodeData.model';

/**
 * Represents a node in the engine, which is an individual component or entity.
 */
export interface EngineNode {
  data: EngineNodeData;
  group: 'nodes';
}

/**
 * Represents an edge in the engine, which defines a relationship or connection between nodes.
 */
export interface EngineEdge {
  data: EngineEdgeData;
  group: 'edges';
}

/**
 * Represents a **graph structure** as an array of **nodes** and **edges** in the engine.
 *
 * This structure includes:
 * - `EngineNode`: Represents the nodes in the graph, which are individual components or entities with their own properties and characteristics.
 * - `EngineEdge`: Represents the edges in the graph, which define the relationships or dependencies between nodes, showing how entities are connected.
 *
 * The array allows for a complete representation of the system as a graph, where nodes are linked by edges, enabling the modeling of workflows, processes, or complex relationships.
 */
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