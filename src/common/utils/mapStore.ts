export class MapCacheStore<T> {
  private store: Map<string, Promise<T> | T>;

  constructor(public fullStorage: Map<string, Map<string, unknown>>, private readonly functionId: string) {}

  /**
   * Retrieves the value associated with the specified key.
   *
   * @param key - The key used to retrieve the value.
   * @returns The value corresponding to the key.
   */
  public get(key: string): T {
    this.fullStorage ??= new Map<string, Map<string, unknown>>();

    if (!this.fullStorage.has(this.functionId)) {
      this.fullStorage.set(this.functionId, new Map<string, unknown>());
    }

    this.store = this.fullStorage.get(this.functionId) as Map<string, Promise<T> | T>;

    return this.store.get(key) as T;
  }

  /**
   * Sets a value for the specified key.
   *
   * @param key - The key for the value.
   * @param value - The value to store.
   * @param ttl - Time to live in milliseconds (optional).
   * @returns The value that was set.
   */
  public set(key: string, value: T, ttl?: number): T {
    setTimeout(() => {
      this.store.delete(key);
      this.fullStorage.set(this.functionId, this.store);
    }, ttl);
    this.store.set(key, value);
    this.fullStorage.set(this.functionId, this.store);
    return value;
  }
}
