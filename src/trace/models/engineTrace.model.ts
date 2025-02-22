import { NodeData } from './engineNodeTrace.model';

export interface Node {
  data: NodeData;
  group: 'nodes';
}

export interface EdgeData {
  id: string;
  source: string | number;
  target: string | number;
  parent?: string;
  parallel?: boolean | string;
}

export interface Edge {
  data: EdgeData;
  group: 'edges';
}

export type Trace = Array<Node | Edge>;
