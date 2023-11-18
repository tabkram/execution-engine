import { TraceableExecution } from "./trace/traceableExecution";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents a Contextual Execution with traceability features.
 *
 * @template CXT - Type of the context object.
 * @template TAG - Type of the tags associated with the execution.
 */
export class ExecutionEngine<
  CXT extends { [key: string]: unknown } = { [key: string]: unknown },
  TAG extends string = string
> extends TraceableExecution {
  protected tags: Array<TAG> = [];
  protected context: CXT;

  protected executionDate: Date;
  protected executionId: string;
  protected additionalAttributes: { [key: string]: string | number | boolean };

  /**
   * Creates an instance of ContextualExecution.
   *
   * @param {Object} [options] - Options for initializing the execution.
   * @param {Date} [options.executionDate] - Date of the execution.
   * @param {string} [options.executionId] - Unique identifier for the execution.
   * @param {Object} [options.additionalAttributes] - Additional attributes for the execution.
   */
  constructor(options?: {
    executionDate?: Date;
    executionId?: string;
    additionalAttributes?: { [key: string]: string | number | boolean };
  }) {
    super();
    this.executionDate = options?.executionDate ?? new Date();
    this.executionId =
      options?.executionId ??
      [
        "exec",
        this.executionDate
          .toISOString()
          .replace(/[-:.Z]/g, "")
          .replace("T", "_"),
        uuidv4(),
      ].join("_");

    this.additionalAttributes = options?.additionalAttributes;

    return this;
  }

  setContext(value: CXT) {
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
      ...partialContext,
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
  updateContextAttribute<K extends keyof CXT>(
    key: K,
    partialContextAttribute: CXT[K]
  ): ExecutionEngine {
    if (
      partialContextAttribute === null ||
      typeof partialContextAttribute !== "object"
    ) {
      // If the provided attribute is not an object or is null,
      // directly update the attribute in the context.
      this.context[key] = partialContextAttribute;
    } else {
      // If the provided attribute is an object, merge it with the existing attribute.
      this.context[key] = {
        ...(this.context?.[key] ?? {}),
        ...partialContextAttribute,
      };
    }
    return this;
  }

  tag(tag: TAG) {
    this.tags.push(tag);
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
    if (obj === null || typeof obj !== "object") {
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
