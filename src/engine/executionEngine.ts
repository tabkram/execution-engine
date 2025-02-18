import { v4 as uuidv4 } from 'uuid';

import { Trace } from '../trace/trace.model';
import { TraceableExecution } from '../trace/traceableExecution';

/**
 * Represents a Contextual Execution with traceability features.
 *
 * @template CXT - Type of the context object.
 */
export class ExecutionEngine<
  CXT extends { [key: string]: unknown } = {
    [key: string]: unknown;
  }
> extends TraceableExecution {
  protected context: CXT;

  protected executionDate: Date;
  protected executionId: string;

  /**
   * Creates an instance of ContextualExecution.
   *
   * @param {Object} [options] - Options for initializing the execution.
   * @param {Date} [options.executionDate] - Date of the execution.
   * @param {string} [options.executionId] - Unique identifier for the execution.
   * @param {string} [options.initialTrace] - The initial trace for the execution.
   */
  constructor(options?: { executionDate?: Date; executionId?: string; initialTrace?: Trace }) {
    super(options?.initialTrace);
    this.executionDate = options?.executionDate ?? new Date();
    this.executionId =
      options?.executionId ??
      [
        'exec',
        this.executionDate
          .toISOString()
          .replace(/[-:.Z]/g, '')
          .replace('T', '_'),
        uuidv4()
      ].join('_');

    return this;
  }

  /**
   * Get the current options of the Execution Engine.
   *
   * @returns {Object} An object containing the execution date and ID.
   * @public
   */
  getOptions(): { executionDate: Date; executionId: string } {
    return { executionDate: this.executionDate, executionId: this.executionId };
  }

  setContext(value: CXT): ExecutionEngine<CXT> {
    this.context = this.deepClone(value);
    return this;
  }

  getContext(): CXT {
    return this.context;
  }

  /**
   * Update the context of the execution with partial information.
   *
   * @param {Partial<CXT>} partialContext - Partial context information to update.
   * @returns {ExecutionEngine} - The updated ContextualExecution instance.
   */
  updateContext(partialContext: Partial<CXT>): ExecutionEngine {
    this.context = {
      ...this.context,
      ...partialContext
    };
    return this;
  }

  /**
   * Update a specific attribute of the context object.
   *
   * @param {K} key - The key of the attribute to update.
   * @param {CXT[K]} partialContextAttribute - Partial information to update for the attribute.
   * @returns {ExecutionEngine} - The updated ContextualExecution instance.
   */
  updateContextAttribute<K extends keyof CXT>(key: K, partialContextAttribute: CXT[K]): ExecutionEngine {
    if (partialContextAttribute === null || typeof partialContextAttribute !== 'object') {
      // If the provided attribute is not an object or is null,
      // directly update the attribute in the context.
      this.context[key] = partialContextAttribute;
    } else {
      // If the provided attribute is an object, merge it with the existing attribute.
      this.context[key] = {
        ...(this.context?.[key] ?? {}),
        ...partialContextAttribute
      };
    }
    return this;
  }

  /**
   * Deep clone function to copy nested objects.
   *
   * @private
   * @template T - Type of the object to clone.
   * @param {T} obj - The object to clone.
   * @returns {T} - The cloned object.
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as T;
    }

    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[key] = this.deepClone(value);
      return acc;
    }, {} as T);
  }
}
