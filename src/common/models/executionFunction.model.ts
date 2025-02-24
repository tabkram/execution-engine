/**
 * Metadata extracted from a function or a method.
 *
 * - If the function is a method of a class, `class` represents the class name, and `method` represents the method name.
 * - Otherwise, these properties are undefined.
 */
export interface FunctionMetadata {
  /** If the function is a class method, this represents the class name. */
  class?: string;

  /** If the function is a class method, this represents the method name. */
  method?: string | symbol;

  /** The function name, or "anonymous" if unnamed. */
  name: string;

  /** List of parameter names extracted from the function definition. */
  parameters: string[];

  /** Indicates if the function is asynchronous. */
  isAsync: boolean;

  /** Whether the function is bound to a specific context. */
  isBound: boolean;
}
