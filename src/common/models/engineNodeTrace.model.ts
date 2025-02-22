import { ExecutionTrace } from './executionTrace.model';

export interface NodeTrace {
  id: string;
  label: string;
  parent?: string;
  parallel?: boolean | string;
  abstract?: boolean;
  createTime?: Date;
  updateTime?: Date;
}

export interface NodeData<I = unknown, O = unknown> extends NodeTrace, ExecutionTrace<I, O> {}

export function isNodeTrace(config: NodeTrace | NodeData | unknown): config is Partial<NodeTrace> {
  return typeof config === 'object' && ('id' in config || 'label' in config || 'parent' in config);
}
