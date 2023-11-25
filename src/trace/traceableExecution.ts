/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';

import { extract } from '../common/jsonQuery';
import { ExecutionTimer } from '../timer/executionTimer';
import {
  DEFAULT_TRACE_CONFIG,
  EdgeData,
  isNodeExecutionTrace,
  isNodeTrace,
  NodeData,
  NodeExecutionTrace,
  NodeExecutionTraceExtractor,
  NodeTrace,
  TraceOptions
} from './trace.model';

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

// eslint-disable-next-line @typescript-eslint/ban-types
function isAsync(func: Function): boolean {
  return func.constructor.name === 'AsyncFunction';
}

export type TraceableRunnerOptions = TraceOptions<Array<any>, unknown> | TraceOptions<Array<any>, unknown>['trace'];

/**
 * Represents a class for traceable execution of functions.
 */
export class TraceableExecution {
  private nodes: Array<{
    data: NodeData;
    group: 'nodes';
  }>;
  private edges: Array<{
    data: EdgeData;
    group: 'edges';
  }>;
  private narratives: {
    [key: string]: Array<string>;
  };

  constructor() {
    this.initTrace();
  }

  private static getUniqueString() {
    const uniqueId: string = uuidv4();
    return uniqueId;
  }

  private static extractIOExecutionTraceWithConfig<I, O>(
    ioeExecTrace: NodeExecutionTrace<I, O>['inputs'] | NodeExecutionTrace<I, O>['outputs'] | NodeExecutionTrace<I, O>['errors'],
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

  private static extractNarrativeWithConfig<I, O>(
    executionTrace: NodeExecutionTrace<I, O>,
    narrativeConfig: NodeExecutionTraceExtractor<I, O>['narratives']
  ): Array<string> {
    try {
      if (typeof narrativeConfig === 'string') {
        return [narrativeConfig];
      } else if (typeof narrativeConfig === 'function') {
        return narrativeConfig(executionTrace);
      }
    } catch (e) {
      throw new Error(`error when mapping/extracting Narrative with config: "${narrativeConfig}", ${e?.message}`);
    }
  }

  initTrace() {
    this.nodes = [];
    this.edges = [];
    this.narratives = {};
  }

  /**
   * Gets the execution trace.
   * @returns An array containing nodes and edges of the execution trace.
   */
  getTrace() {
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
  ): Promise<NodeExecutionTrace<Array<unknown>, Awaited<O>>>;

  run<O>(
    blockFunction: (...params) => Promise<O>,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>['trace']
  ): Promise<NodeExecutionTrace<Array<unknown>, Awaited<O>>>;

  /**
   * ATTENTION: arrow function as blockFunction ARE NOT RECOMMENDED it will work correctly at the overload inferring level to get this signature.
   * It will be caught as a Promise in the signature before!!
   * Especially if you do:
   * ```
   *  () => {  throw new Error("error example");}
   * ```
   * prefer using real functions with function keyword!!
   */
  run<O>(
    blockFunction: (...params) => O,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>
  ): NodeExecutionTrace<Array<unknown>, O>;

  run<O>(
    blockFunction: (...params) => O,
    inputs: Array<unknown>,
    options?: TraceOptions<Array<any>, O>['trace']
  ): NodeExecutionTrace<Array<unknown>, O>;

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
        id: [blockFunction.name ? blockFunction.name : 'function', new Date()?.getTime(), TraceableExecution.getUniqueString()]?.join('_'),
        label: blockFunction.name ? blockFunction.name : 'function'
      },
      config: DEFAULT_TRACE_CONFIG
    }
  ): Promise<NodeExecutionTrace<Array<unknown>, Awaited<O>>> | NodeExecutionTrace<Array<unknown>, O> {
    const inputHasCircular = inputs.find((i) => i instanceof TraceableExecution);
    if (inputHasCircular) {
      throw Error(
        `${blockFunction.name} could not have an instance of TraceableExecution as input, this will create circular dependency on trace`
      );
    }
    const nodeTraceConfigFromOptions = isNodeTrace(options) ? undefined : options.config ?? DEFAULT_TRACE_CONFIG;
    const nodeTraceFromOptions = isNodeTrace(options) ? options : options.trace;
    const executionTimer = new ExecutionTimer();
    executionTimer?.start();
    const nodeTrace: NodeData = {
      id: [
        blockFunction.name ? blockFunction.name : 'function',
        executionTimer?.getStartDate()?.getTime(),
        TraceableExecution.getUniqueString()
      ]?.join('_'),
      label: [(this.nodes?.length ?? 0) + 1, nodeTraceFromOptions?.id ?? (blockFunction.name ? blockFunction.name : 'function')]?.join(
        ' - '
      ),
      ...nodeTraceFromOptions
    };

    if (isAsync(blockFunction)) {
      return blockFunction
        .bind(this)(...inputs, nodeTrace)
        .then((outputs: O) => {
          const executionTrace = {
            inputs,
            outputs,
            ...this.calculateTimeAndDuration(executionTimer)
          };
          this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
          return executionTrace;
        })
        .catch((e) => {
          const executionTrace = {
            inputs,
            errors: [{ name: e?.name, code: e?.code, message: e?.message }],
            ...this.calculateTimeAndDuration(executionTimer)
          };
          this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
          if (nodeTraceConfigFromOptions.errors === 'catch') {
            return executionTrace;
          } else {
            throw e;
          }
        });
    } else {
      try {
        const outputsOrPromise = blockFunction.bind(this)(...inputs, nodeTrace);
        // recheck if blockFunction is not async but returns a promise too:
        if (outputsOrPromise instanceof Promise) {
          return outputsOrPromise
            .then((outputs) => {
              const executionTrace = {
                inputs,
                outputs,
                ...this.calculateTimeAndDuration(executionTimer)
              };
              this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
              return executionTrace;
            })
            .catch((e) => {
              const executionTrace = {
                inputs,
                errors: [{ name: e?.name, code: e?.code, message: e?.message }],
                ...this.calculateTimeAndDuration(executionTimer)
              };
              this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
              if (nodeTraceConfigFromOptions.errors === 'catch') {
                return executionTrace;
              } else {
                throw e;
              }
            });
        }
        //logger.info({ outputs });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executionTrace: NodeExecutionTrace<Array<unknown>, O> = {
          inputs,
          outputs: outputsOrPromise,
          ...this.calculateTimeAndDuration(executionTimer)
        };
        this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
        return executionTrace;
      } catch (e) {
        const executionTrace = {
          inputs,
          errors: [{ name: e?.name, code: e?.code, message: e?.message }],
          ...this.calculateTimeAndDuration(executionTimer)
        };
        this.buildTrace<O>(nodeTrace, executionTrace, nodeTraceConfigFromOptions);
        if (nodeTraceConfigFromOptions.errors === 'catch') {
          return executionTrace;
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * Push a string narrative to a trace node
   * @param nodeId - The ID of the node.
   * @param narrative - The narrative to be pushed.
   * @returns The updated instance of TraceableExecution.
   */
  pushNarrative(nodeId: NodeTrace['id'], narrative: string) {
    const existingNodeIndex = this.nodes?.findIndex((n) => n.data.id === nodeId);
    if (existingNodeIndex >= 0) {
      // it means that we are too late and node has already been created with narratives:
      this.nodes[existingNodeIndex].data = {
        ...this.nodes[existingNodeIndex]?.data,
        narratives: [...(this.nodes[existingNodeIndex]?.data?.narratives ?? []), narrative]
      };
    }
    this.narratives[nodeId] = this.narratives[nodeId] ?? [];
    this.narratives[nodeId]?.push(narrative);
    return this;
  }

  /**
   * Appends an array of narratives to a trace node.
   * @param nodeId - The ID of the node.
   * @param narratives - An array of narratives to be appended.
   * @returns The updated instance of TraceableExecution.
   */
  appendNarratives(nodeId: NodeTrace['id'], narratives: Array<string>) {
    const existingNodeIndex = this.nodes?.findIndex((n) => n.data.id === nodeId);
    if (existingNodeIndex >= 0) {
      // it means that we are too late and node has already been created with narratives:
      this.nodes[existingNodeIndex].data = {
        ...this.nodes[existingNodeIndex]?.data,
        narratives: (this.nodes[existingNodeIndex]?.data?.narratives ?? [])?.concat(narratives)
      };
    }
    this.narratives[nodeId] = (this.narratives[nodeId] ?? [])?.concat(narratives);
    return this;
  }

  /**
   * Gets an ordered array of narratives.
   * @returns An array containing ordered narratives.
   */
  getOrderedNarratives(): Array<string> {
    return this.nodes?.flatMap?.((n) => n.data?.narratives)?.filter((n) => !!n);
  }

  private buildTrace<O>(
    nodeTrace: NodeData,
    executionTrace?: NodeExecutionTrace<Array<unknown>, O>,
    options: TraceOptions<Array<unknown>, O>['config'] = DEFAULT_TRACE_CONFIG,
    isAutoCreated = false
  ) {
    if (nodeTrace.parent && !this.nodes?.find((n) => n.data.id === nodeTrace.parent)) {
      this.buildTrace<O>(
        {
          id: nodeTrace.parent,
          label: nodeTrace.parent
        },
        { errors: executionTrace.errors },
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

      this.edges?.find((edge) => edge.data.parallel && edge.data.parent === nodeTrace.parent);
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

    const filterExecutionTrace = this.filterExecutionTrace(executionTrace, options?.traceExecution);
    if (filterExecutionTrace?.narratives?.length) {
      this.appendNarratives(nodeTrace.id, filterExecutionTrace?.narratives);
    }
    // si ne node existe déjà (un parent auto-créé):
    const existingNodeIndex = this.nodes?.findIndex((n) => n.data.id === nodeTrace?.id);
    if (existingNodeIndex >= 0) {
      this.nodes[existingNodeIndex] = {
        data: {
          ...this.nodes[existingNodeIndex]?.data,
          ...filterExecutionTrace,
          narratives: this.narratives?.[nodeTrace?.id],
          ...nodeTrace,
          parallel: options?.parallel,
          abstract: isAutoCreated,
          updateTime: new Date()
        },
        group: 'nodes'
      };
    } else {
      this.nodes?.push({
        data: {
          ...filterExecutionTrace,
          narratives: this.narratives?.[nodeTrace?.id],
          ...nodeTrace,
          parallel: options?.parallel,
          abstract: isAutoCreated,
          createTime: new Date()
        },
        group: 'nodes'
      });
    }
  }

  private calculateTimeAndDuration(executionTimer: ExecutionTimer) {
    executionTimer.stop();
    return {
      startTime: executionTimer.getStartDate(),
      endTime: executionTimer.getEndDate(),
      duration: executionTimer.getDuration(),
      elapsedTime: executionTimer.getElapsedTime(undefined, 3)
    };
  }

  private filterExecutionTrace<I, O>(
    executionTrace?: NodeExecutionTrace<I, O>,
    doTraceExecution?: TraceOptions<I, O>['config']['traceExecution']
  ) {
    if (!doTraceExecution) {
      return {};
    }
    if (doTraceExecution === true) {
      return executionTrace;
    }
    if (Array.isArray(doTraceExecution)) {
      const execTrace: NodeExecutionTrace<unknown, unknown> = {};
      Object.keys(executionTrace).forEach((k) => {
        if (doTraceExecution.includes(k as keyof NodeExecutionTrace<I, O>)) {
          execTrace[k] = executionTrace[k];
        }
      });
      return execTrace;
    }
    if (isNodeExecutionTrace(doTraceExecution)) {
      const execTrace: NodeExecutionTrace<unknown, unknown> = {};
      execTrace.inputs = TraceableExecution.extractIOExecutionTraceWithConfig<I, O>(executionTrace.inputs, doTraceExecution.inputs);
      execTrace.outputs = TraceableExecution.extractIOExecutionTraceWithConfig<I, O>(executionTrace.outputs, doTraceExecution.outputs);
      execTrace.errors = TraceableExecution.extractIOExecutionTraceWithConfig<I, O>(executionTrace.errors, doTraceExecution.errors);

      execTrace.narratives = TraceableExecution.extractNarrativeWithConfig<I, O>(executionTrace, doTraceExecution.narratives);

      if (doTraceExecution.startTime === true) {
        execTrace.startTime = executionTrace.startTime;
      }
      if (doTraceExecution.endTime === true) {
        execTrace.endTime = executionTrace.endTime;
      }
      if (doTraceExecution.startTime === true && doTraceExecution.endTime === true) {
        execTrace.duration = executionTrace.duration;
      }
      return execTrace;
    }
  }
}
