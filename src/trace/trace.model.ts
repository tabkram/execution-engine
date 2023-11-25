export interface TraceOptions<I, O> {
  trace?: Partial<NodeData>;
  config?: {
    traceExecution?: boolean | Array<keyof NodeExecutionTrace<I, O>> | NodeExecutionTraceExtractor<I, O>;
    parallel?: boolean | string;
    errors?: 'catch' | 'throw';
  };
}

export const DEFAULT_TRACE_CONFIG: TraceOptions<Array<unknown>, unknown>['config'] = {
  traceExecution: true,
  parallel: false,
  errors: 'throw'
};

export interface NodeExecutionTraceExtractor<I, O> {
  inputs?: boolean | Array<string> | ((i: I) => unknown);
  outputs?: boolean | Array<string> | ((o: O) => unknown);
  errors?: boolean | Array<string> | ((e: Array<unknown>) => unknown);
  narratives?: string | ((execTrace: NodeExecutionTrace<I, O>) => Array<string>);
  startTime?: boolean;
  endTime?: boolean;
}

export interface NodeTrace {
  id: string;
  label: string;
  parent?: string;
  parallel?: boolean | string;
  abstract?: boolean;
  createTime?: Date;
  updateTime?: Date;
}

export interface NodeExecutionTrace<I, O> {
  inputs?: I;
  outputs?: O;
  errors?: unknown;
  narratives?: Array<string>;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  elapsedTime?: string;
}

export function isNodeTrace(config: NodeTrace | NodeData | unknown): config is Partial<NodeTrace> {
  return typeof config === 'object' && ('id' in config || 'label' in config || 'parent' in config);
}

export function isNodeExecutionTrace<I, O>(config: NodeExecutionTraceExtractor<I, O>): config is NodeExecutionTraceExtractor<I, O> {
  return 'inputs' in config || 'outputs' in config || 'errors' in config || 'startTime' in config || 'endTime' in config;
}

export interface NodeData<I = unknown, O = unknown> extends NodeTrace, NodeExecutionTrace<I, O> {}

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
