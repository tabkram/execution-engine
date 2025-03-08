/* eslint-disable @typescript-eslint/no-explicit-any */
import { AsyncLocalStorage } from 'async_hooks';

import { EngineNodeData, EngineNodeTrace, isEngineNodeTrace } from '../common/models/engineNodeData.model';
import { EngineEdge, EngineNode, EngineTrace } from '../common/models/engineTrace.model';
import { DEFAULT_TRACE_CONFIG, TraceOptions } from '../common/models/engineTraceOptions.model';
import { ExecutionTrace, ExecutionTraceExtractor, isExecutionTrace } from '../common/models/executionTrace.model';
import { Awaited } from '../common/utils/awaited';
import { extract } from '../common/utils/jsonQuery';
import { ExecutionTimer } from '../timer/executionTimer';
import { executionTrace } from '../trace/trace';

/**
 * Represents a class for traceable execution of functions.
 */
export class TraceableEngine {
  private nodes: Array<EngineNode>;
  private edges: Array<EngineEdge>;
  private asyncLocalStorage = new AsyncLocalStorage<string>();

  /**
   * A temporary storage for narratives associated with non-found nodes.
   * Narratives are stored in memory until the corresponding node is created.
   * @private
   */
  private narrativesForNonFoundNodes: {
    [key: string]: Array<string>;
  };

  /**
   * Initializes a new instance of the TraceableExecution class.
   * @param initialTrace - The initial trace to be used.
   */
  constructor(initialTrace?: EngineTrace) {
    this.initTrace(initialTrace);
  }

  private static extractIOExecutionTraceWithConfig<I, O>(
    ioeExecTrace: ExecutionTrace<I, O>['inputs'] | ExecutionTrace<I, O>['outputs'] | ExecutionTrace<I, O>['errors'],
    extractionConfig: boolean | Array<string> | ((i: unknown) => unknown)
  ) {
    try {
      if (typeof extractionConfig === 'function') {
        return extractionConfig(ioeExecTrace);
      } else if (Array.isArray(extractionConfig)) {
        return extract(ioeExecTrace, extractionConfig);
      } else if (extractionConfig === true) {
        return ioeExecTrace;
      }
    } catch (e) {
      throw new Error(`error when mapping/extracting ExecutionTrace with config: "${extractionConfig}", ${e?.message}`);
    }
  }

  private extractNarrativeWithConfig<I, O>(
    nodeData: EngineNodeData<I, O>,
    narrativeConfig: ExecutionTraceExtractor<I, O>['narratives']
  ): Array<string> {
    try {
      const narratives = (this.narrativesForNonFoundNodes[nodeData.id] ?? [])?.concat(nodeData.narratives ?? []);
      delete this.narrativesForNonFoundNodes[nodeData.id];
      if (typeof narrativeConfig === 'function') {
        return narratives.concat(narrativeConfig(nodeData));
      } else if (Array.isArray(narrativeConfig)) {
        return narratives.concat(narrativeConfig);
      } else if (narrativeConfig === true) {
        return narratives;
      }
    } catch (e) {
      throw new Error(`error when mapping/extracting Narrative with config: "${narrativeConfig}", ${e?.message}`);
    }
  }

  /**
   * Initializes the trace with given initialTrace.
   *
   * @param {EngineTrace} initialTrace - The initial trace to initialize: the nodes and edges.
   * @return {TraceableExecution} - The traceable execution object after initialization.
   */
  initTrace(initialTrace: EngineTrace): TraceableEngine {
    this.nodes = (initialTrace?.filter((b) => b.group === 'nodes') as Array<EngineNode>) ?? [];
    this.edges = (initialTrace?.filter((b) => b.group === 'edges') as Array<EngineEdge>) ?? [];
    this.narrativesForNonFoundNodes = {};
    return this;
  }

  /**
   * Gets the execution trace.
   * @returns An array containing nodes and edges of the execution trace.
   */
  getTrace(): EngineTrace {
    return [...this.nodes, ...this.edges];
  }

  /**
   * Gets the nodes of the execution trace.
   * @returns An array containing nodes of the execution trace.
   */
  getTraceNodes() {
    return this.nodes;
  }

  /**
   * ATTENTION: TS chooses the first fitting overload in top-down order, so overloads are sorted from most specific to most broad.
   * ATTENTION: arrow function as blockFunction could be caught by this one, even if it doesn't return a promise
   * prefer using real functions with function keyword!!
   * ATTENTION: functions that return a promise will fit here BUT should be mentioned with ASYNC keyword to work correctly!
   * prefer to use functions with the ASYNC keyword even if rechecking is available so that functions with returned promises are executed safely
   */
  run<O>(
    blockFunction: (...params) => Promise<O>,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>
  ): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>>;

  run<O>(
    blockFunction: (...params) => Promise<O>,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>['trace']
  ): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>>;

  /**
   * ATTENTION: arrow function as blockFunction ARE NOT RECOMMENDED it will work correctly at the overload inferring level to get this signature.
   * It will be caught as a Promise in the signature before!!
   * Especially if you do:
   * ```
   *  () => {  throw new Error("error example");}
   * ```
   * prefer using real functions with function keyword!!
   */
  run<O>(blockFunction: (...params) => O, inputs: Array<unknown>, options?: TraceOptions<Array<any>, O>): ExecutionTrace<Array<unknown>, O>;

  run<O>(
    blockFunction: (...params) => O,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>['trace']
  ): ExecutionTrace<Array<unknown>, O>;

  /**
   *
   * @param blockFunction
   * @param inputs array of arguments given as input to the function `blockFunction` parameter
   * @param options execution options it could be simply  a trace for instance:
   *
   * ATTENTION: arrow function as blockFunction ARE NOT RECOMMENDED it will work correctly at the overload inferring level, especially if you do:
   * ```
   *  () => {  throw new Error("error example");}
   * ```
   */
  run<O>(
    blockFunction: (...params) => O | Promise<O>,
    inputs: Array<unknown> = [],
    options: TraceOptions<Array<any>, O> | TraceOptions<Array<any>, O>['trace'] = {
      trace: {
        id: [blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function', new Date()?.getTime(), crypto.randomUUID()]?.join('_'),
        label: blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function'
      },
      config: DEFAULT_TRACE_CONFIG
    }
  ): Promise<ExecutionTrace<Array<unknown>, Awaited<O>>> | ExecutionTrace<Array<unknown>, O> {
    const inputHasCircular = inputs.find((i) => i instanceof TraceableEngine);
    if (inputHasCircular) {
      throw Error(
        `${blockFunction.name} could not have an instance of TraceableExecution as input, this will create circular dependency on trace`
      );
    }
    const nodeTraceConfigFromOptions = isEngineNodeTrace(options) ? undefined : (options.config ?? DEFAULT_TRACE_CONFIG);
    const nodeTraceFromOptions = (isEngineNodeTrace(options) ? options : options.trace) ?? {};
    nodeTraceFromOptions.parent = nodeTraceFromOptions?.parent ?? this.asyncLocalStorage.getStore();

    const executionTimer = new ExecutionTimer();
    executionTimer?.start();
    const nodeTrace: EngineNodeData = {
      id: [
        blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function',
        executionTimer?.getStartDate()?.getTime(),
        crypto.randomUUID()
      ]?.join('_'),
      label: [
        (this.nodes?.length ?? 0) + 1,
        nodeTraceFromOptions?.id ?? (blockFunction.name ? blockFunction.name.replace('bound ', '') : 'function')
      ]?.join(' - '),
      ...nodeTraceFromOptions
    };

    return executionTrace<O>(
      () => this.asyncLocalStorage.run(nodeTrace.id, () => blockFunction.bind(this)(...inputs, nodeTrace)),
      inputs,
      (traceContext) => {
        // TODO: metadata are not handled in the engine ExecutionTrace for now, to add it later.
        delete traceContext.metadata;
        delete traceContext.isPromise;
        return this.buildTrace.bind(this)(nodeTrace, traceContext, nodeTraceConfigFromOptions);
      },
      { errorStrategy: nodeTraceConfigFromOptions.errors }
    );
  }

  /**
   * Pushes or appends narratives to a trace node.
   * @param nodeId - The ID of the node.
   * @param narratives - The narrative or array of narratives to be processed.
   * @returns The updated instance of TraceableExecution.
   */
  pushNarratives(nodeId: EngineNodeTrace['id'], narratives: string | string[]) {
    const existingNodeIndex = this.nodes?.findIndex((n) => n.data.id === nodeId);

    if (existingNodeIndex >= 0) {
      // Node already exists, update its narratives
      this.nodes[existingNodeIndex].data = {
        ...this.nodes[existingNodeIndex]?.data,
        narratives: [...(this.nodes[existingNodeIndex]?.data?.narratives ?? []), ...(Array.isArray(narratives) ? narratives : [narratives])]
      };
    } else {
      // Node doesn't exist, store narratives for later use
      this.narrativesForNonFoundNodes[nodeId] = [
        ...(this.narrativesForNonFoundNodes[nodeId] ?? []),
        ...(Array.isArray(narratives) ? narratives : [narratives])
      ];
    }

    return this;
  }

  /**
   * Retrieves an ordered array of narratives.
   *
   * @returns {Array<string>} An array that contains the ordered narratives. If no narratives are found, an empty array is returned.
   */
  getNarratives(): Array<string> {
    return this.nodes?.flatMap?.((n) => n.data?.narratives)?.filter((n) => !!n);
  }

  private buildTrace<O>(
    nodeTrace: EngineNodeData,
    executionTrace?: ExecutionTrace<Array<unknown>, O>,
    options: TraceOptions<Array<unknown>, O>['config'] = DEFAULT_TRACE_CONFIG,
    isAutoCreated = false
  ) {
    if (nodeTrace.parent && !this.nodes?.find((n) => n.data.id === nodeTrace.parent)) {
      this.buildTrace<O>(
        {
          id: nodeTrace.parent,
          label: nodeTrace.parent
        },
        { id: nodeTrace.id, errors: executionTrace.errors },
        DEFAULT_TRACE_CONFIG,
        true
      );
    }

    if (!isAutoCreated) {
      let parallelEdge = undefined;
      if (options.parallel === true) {
        parallelEdge = this.edges?.find((edge) => edge.data.parallel && edge.data.parent === nodeTrace.parent);
      } else if (typeof options.parallel === 'string') {
        parallelEdge = this.edges?.find((edge) => edge.data.parallel === options.parallel);
      }

      const previousNodes = !parallelEdge
        ? this.nodes?.filter(
          (node) =>
            !node.data.abstract &&
              node.data.parent === nodeTrace.parent &&
              (!options?.parallel || !node.data.parallel || !node.data.parent || !nodeTrace.parent) &&
              node.data.id !== nodeTrace.id &&
              node.data.parent !== nodeTrace.id &&
              node.data.id !== nodeTrace.parent &&
              !this.edges.find((e) => e.data.source === node.data.id)
        )
        : [];
      this.edges = [
        ...(this.edges ?? []),
        ...(previousNodes?.map((previousNode) => ({
          data: {
            id: `${previousNode.data.id}->${nodeTrace.id}`,
            source: previousNode.data.id,
            target: nodeTrace.id,
            parent: nodeTrace.parent,
            parallel: options?.parallel
          },
          group: 'edges' as const
        })) ?? []),
        ...(parallelEdge
          ? [
            {
              data: {
                id: `${parallelEdge.data.source}->${nodeTrace.id}`,
                source: parallelEdge.data.source,
                target: nodeTrace.id,
                parent: nodeTrace.parent,
                parallel: options?.parallel
              },
              group: 'edges' as const
            }
          ]
          : [])
      ];
    }

    const filteredNodeData: EngineNodeData = {
      ...this.filterNodeTrace(nodeTrace),
      ...this.filterNodeExecutionTrace({ ...executionTrace, ...nodeTrace }, options?.traceExecution)
    };
    if (filteredNodeData?.narratives?.length) {
      this.pushNarratives(nodeTrace.id, filteredNodeData?.narratives);
    }
    // si ne node existe déjà (un parent auto-créé):
    const existingNodeIndex = this.nodes?.findIndex((n) => n.data.id === nodeTrace?.id);
    if (existingNodeIndex >= 0) {
      this.nodes[existingNodeIndex] = {
        data: {
          ...this.nodes[existingNodeIndex]?.data,
          ...filteredNodeData,
          parallel: options?.parallel,
          abstract: isAutoCreated,
          updateTime: new Date()
        },
        group: 'nodes'
      };
    } else {
      this.nodes?.push({
        data: {
          ...filteredNodeData,
          parallel: options?.parallel,
          abstract: isAutoCreated,
          createTime: new Date()
        },
        group: 'nodes'
      });
    }
  }

  private filterNodeTrace(nodeData?: EngineNodeData): EngineNodeTrace {
    return {
      id: nodeData?.id,
      label: nodeData?.label,
      ...(nodeData?.parent ? { parent: nodeData?.parent } : {}),
      ...(nodeData?.parallel ? { parallel: nodeData?.parallel } : {}),
      ...(nodeData?.abstract ? { abstract: nodeData?.abstract } : {}),
      ...(nodeData?.createTime ? { createTime: nodeData?.createTime } : {}),
      ...(nodeData?.updateTime ? { updateTime: nodeData?.updateTime } : {})
    };
  }

  private filterNodeExecutionTrace<I, O>(
    nodeData?: EngineNodeData<I, O>,
    doTraceExecution?: TraceOptions<I, O>['config']['traceExecution']
  ) {
    if (!doTraceExecution) {
      return {};
    }
    if (doTraceExecution === true) {
      nodeData.narratives = this.extractNarrativeWithConfig<I, O>(nodeData, true);
      return nodeData;
    }
    if (Array.isArray(doTraceExecution)) {
      const execTrace: ExecutionTrace<unknown, unknown> = { id: nodeData.id };
      Object.keys(nodeData).forEach((k) => {
        if (doTraceExecution.includes(k as keyof ExecutionTrace<I, O>)) {
          execTrace[k] = nodeData[k];
        }
      });
      return execTrace;
    }
    if (isExecutionTrace(doTraceExecution)) {
      const execTrace: ExecutionTrace<unknown, unknown> = { id: nodeData.id };
      execTrace.inputs = TraceableEngine.extractIOExecutionTraceWithConfig<I, O>(nodeData.inputs, doTraceExecution.inputs);
      execTrace.outputs = TraceableEngine.extractIOExecutionTraceWithConfig<I, O>(nodeData.outputs, doTraceExecution.outputs);
      execTrace.errors = TraceableEngine.extractIOExecutionTraceWithConfig<I, O>(nodeData.errors, doTraceExecution.errors);

      execTrace.narratives = this.extractNarrativeWithConfig<I, O>(nodeData, doTraceExecution.narratives);

      if (doTraceExecution.startTime === true) {
        execTrace.startTime = nodeData.startTime;
      }
      if (doTraceExecution.endTime === true) {
        execTrace.endTime = nodeData.endTime;
      }
      if (doTraceExecution.startTime === true && doTraceExecution.endTime === true) {
        execTrace.duration = nodeData.duration;
        execTrace.elapsedTime = nodeData.elapsedTime;
      }
      return execTrace;
    }
  }
}
