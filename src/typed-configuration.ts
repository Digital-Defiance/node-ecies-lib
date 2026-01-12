/**
 * @fileoverview Strong typing system for Node.js ECIES ID providers
 *
 * This module provides strongly-typed alternatives to the standard Node.js ECIES configuration
 * system, enabling compile-time type safety for ID provider operations.
 *
 * The standard approach:
 * ```typescript
 * const Constants = getNodeRuntimeConfiguration();
 * const id = Constants.idProvider.generate(); // Returns Uint8Array (no strong typing)
 * const obj = Constants.idProvider.fromBytes(bytes); // Returns unknown (requires casting)
 * ```
 *
 * The typed approach:
 * ```typescript
 * const provider = getEnhancedNodeIdProvider<ObjectId>();
 * const id = provider.generateTyped(); // Returns ObjectId (strongly typed)
 * const obj = provider.fromBytesTyped(bytes); // Returns ObjectId (no casting needed)
 * ```
 *
 * @version 4.10.7
 * @since 4.10.7
 */

import type { IIdProvider } from '@digitaldefiance/ecies-lib';
import type { ObjectId } from 'bson';

import {
  getNodeRuntimeConfiguration,
  registerNodeRuntimeConfiguration,
  type NodeRuntimeConfiguration,
  type NodeRuntimeOverrides,
} from './constants';

/**
 * Enhanced ID provider that includes both original methods and strongly-typed alternatives.
 * This is a drop-in replacement for the standard ID provider with additional type safety.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 */
export interface IEnhancedNodeIdProvider<TID> extends IIdProvider<TID> {
  /**
   * Generate a new ID with strong typing.
   * @returns A strongly-typed ID of type TID
   */
  generateTyped(): TID;

  /**
   * Convert bytes to strongly-typed ID.
   * @param bytes The bytes to convert
   * @returns A strongly-typed ID of type TID
   */
  fromBytesTyped(bytes: Uint8Array): TID;

  /**
   * Access to the underlying provider for advanced operations.
   */
  readonly underlyingProvider: IIdProvider<TID>;
}

/**
 * Simple typed ID provider with minimal API surface.
 * Only provides the typed methods without the original IIdProvider interface.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 */
export interface ITypedNodeIdProvider<TID> {
  /**
   * Generate a new ID with strong typing.
   * @returns A strongly-typed ID of type TID
   */
  generateTyped(): TID;

  /**
   * Convert bytes to strongly-typed ID.
   * @param bytes The bytes to convert
   * @returns A strongly-typed ID of type TID
   */
  fromBytesTyped(bytes: Uint8Array): TID;

  /**
   * Convert strongly-typed ID to bytes.
   * @param id The ID to convert
   * @returns The ID as bytes
   */
  toBytesTyped(id: TID): Uint8Array;

  /**
   * Serialize strongly-typed ID to string.
   * @param id The ID to serialize
   * @returns The serialized ID
   */
  serializeTyped(id: TID): string;

  /**
   * Deserialize string to strongly-typed ID.
   * @param serialized The serialized ID
   * @returns The deserialized ID
   */
  deserializeTyped(serialized: string): TID;

  /**
   * The byte length of IDs produced by this provider.
   */
  readonly byteLength: number;

  /**
   * The name of this provider.
   */
  readonly name: string;
}

/**
 * Node.js typed configuration wrapper that provides strongly-typed ID operations
 * alongside the complete Node.js runtime configuration.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 */
export interface INodeTypedConfiguration<TID> {
  /**
   * The complete Node.js runtime configuration.
   */
  readonly constants: NodeRuntimeConfiguration;

  /**
   * Enhanced ID provider with both original and typed methods.
   */
  readonly enhancedIdProvider: IEnhancedNodeIdProvider<TID>;

  /**
   * Simple typed ID provider with minimal API surface.
   */
  readonly typedIdProvider: ITypedNodeIdProvider<TID>;

  /**
   * Generate a new strongly-typed ID.
   * @returns A strongly-typed ID of type TID
   */
  generateId(): TID;

  /**
   * Convert bytes to strongly-typed ID.
   * @param bytes The bytes to convert
   * @returns A strongly-typed ID of type TID
   */
  idFromBytes(bytes: Uint8Array): TID;

  /**
   * Convert strongly-typed ID to bytes.
   * @param id The ID to convert
   * @returns The ID as bytes
   */
  idToBytes(id: TID): Uint8Array;
}

/**
 * Implementation of enhanced ID provider.
 */
class EnhancedNodeIdProvider<TID> implements IEnhancedNodeIdProvider<TID> {
  constructor(private readonly provider: IIdProvider<TID>) {}

  // Original IIdProvider methods (delegated)
  get byteLength(): number {
    return this.provider.byteLength;
  }

  get name(): string {
    return this.provider.name;
  }

  generate(): Uint8Array {
    return this.provider.generate();
  }

  fromBytes(bytes: Uint8Array): TID {
    return this.provider.fromBytes(bytes) as TID;
  }

  toBytes(id: TID): Uint8Array {
    return this.provider.toBytes(id);
  }

  serialize(bytes: Uint8Array): string {
    return this.provider.serialize(bytes);
  }

  deserialize(serialized: string): Uint8Array {
    return this.provider.deserialize(serialized);
  }

  equals(a: TID, b: TID): boolean {
    return this.provider.equals(a, b);
  }

  clone(id: TID): TID {
    return this.provider.clone(id);
  }

  idToString(id: TID): string {
    return this.provider.idToString(id);
  }

  idFromString(str: string): TID {
    return this.provider.idFromString(str);
  }

  validate(id: Uint8Array): boolean {
    return this.provider.validate(id);
  }

  // Enhanced typed methods
  generateTyped(): TID {
    return this.provider.fromBytes(this.provider.generate()) as TID;
  }

  fromBytesTyped(bytes: Uint8Array): TID {
    return this.provider.fromBytes(bytes) as TID;
  }

  get underlyingProvider(): IIdProvider<TID> {
    return this.provider;
  }
}

/**
 * Implementation of simple typed ID provider.
 */
class TypedNodeIdProvider<TID> implements ITypedNodeIdProvider<TID> {
  constructor(private readonly provider: IIdProvider<TID>) {}

  get byteLength(): number {
    return this.provider.byteLength;
  }

  get name(): string {
    return this.provider.name;
  }

  generateTyped(): TID {
    return this.provider.fromBytes(this.provider.generate()) as TID;
  }

  fromBytesTyped(bytes: Uint8Array): TID {
    return this.provider.fromBytes(bytes) as TID;
  }

  toBytesTyped(id: TID): Uint8Array {
    return this.provider.toBytes(id);
  }

  serializeTyped(id: TID): string {
    return this.provider.serialize(this.provider.toBytes(id));
  }

  deserializeTyped(serialized: string): TID {
    return this.provider.fromBytes(
      this.provider.deserialize(serialized),
    ) as TID;
  }
}

/**
 * Implementation of Node.js typed configuration.
 */
class NodeTypedConfiguration<TID> implements INodeTypedConfiguration<TID> {
  public readonly constants: NodeRuntimeConfiguration;
  public readonly enhancedIdProvider: IEnhancedNodeIdProvider<TID>;
  public readonly typedIdProvider: ITypedNodeIdProvider<TID>;

  constructor(constants: NodeRuntimeConfiguration) {
    this.constants = constants;
    this.enhancedIdProvider = new EnhancedNodeIdProvider<TID>(
      constants.idProvider as IIdProvider<TID>,
    );
    this.typedIdProvider = new TypedNodeIdProvider<TID>(
      constants.idProvider as IIdProvider<TID>,
    );
  }

  generateId(): TID {
    return this.enhancedIdProvider.generateTyped();
  }

  idFromBytes(bytes: Uint8Array): TID {
    return this.enhancedIdProvider.fromBytesTyped(bytes);
  }

  idToBytes(id: TID): Uint8Array {
    return this.enhancedIdProvider.underlyingProvider.toBytes(id);
  }
}

/**
 * Get an enhanced Node.js ID provider with both original and strongly-typed methods.
 * This is a drop-in replacement for `getNodeRuntimeConfiguration().idProvider` with additional type safety.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 * @returns Enhanced ID provider with typed methods
 *
 * @example
 * ```typescript
 * // ObjectId example
 * const provider = getEnhancedNodeIdProvider<ObjectId>();
 * const id = provider.generateTyped(); // Returns ObjectId (strongly typed)
 * const obj = provider.fromBytesTyped(bytes); // Returns ObjectId (no casting needed)
 *
 * // Still supports original methods
 * const rawBytes = provider.generate(); // Returns Uint8Array
 * const unknown = provider.fromBytes(bytes); // Returns unknown (requires casting)
 * ```
 */
export function getEnhancedNodeIdProvider<TID>(): IEnhancedNodeIdProvider<TID> {
  const constants = getNodeRuntimeConfiguration();
  if (!constants || !constants.idProvider) {
    throw new Error(
      'Node runtime configuration not initialized. Ensure @digitaldefiance/node-ecies-lib is properly imported before calling getEnhancedNodeIdProvider().',
    );
  }
  return new EnhancedNodeIdProvider<TID>(
    constants.idProvider as IIdProvider<TID>,
  );
}

/**
 * Get a simple typed Node.js ID provider with minimal API surface.
 * Only provides strongly-typed methods without the original IIdProvider interface.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 * @returns Simple typed ID provider
 *
 * @example
 * ```typescript
 * // GUID example
 * const provider = getTypedNodeIdProvider<string>();
 * const id = provider.generateTyped(); // Returns string (strongly typed)
 * const obj = provider.fromBytesTyped(bytes); // Returns string (no casting needed)
 * ```
 */
export function getTypedNodeIdProvider<TID>(): ITypedNodeIdProvider<TID> {
  const constants = getNodeRuntimeConfiguration();
  if (!constants || !constants.idProvider) {
    throw new Error(
      'Node runtime configuration not initialized. Ensure @digitaldefiance/node-ecies-lib is properly imported before calling getTypedNodeIdProvider().',
    );
  }
  return new TypedNodeIdProvider<TID>(constants.idProvider as IIdProvider<TID>);
}

/**
 * Create a complete Node.js typed configuration with strongly-typed ID operations.
 * Provides access to the full Node.js runtime configuration plus typed ID helpers.
 *
 * @template TID The native ID type (ObjectId, string, etc.)
 * @param overrides Optional configuration overrides
 * @returns Complete typed configuration
 *
 * @example
 * ```typescript
 * // ObjectId configuration
 * const config = createNodeObjectIdConfiguration();
 * const id = config.generateId(); // Returns ObjectId (strongly typed)
 * const constants = config.constants; // Full Node.js runtime configuration
 *
 * // Custom provider configuration
 * const customConfig = createNodeTypedConfiguration<string>({
 *   idProvider: new UuidProvider()
 * });
 * const uuid = customConfig.generateId(); // Returns string (strongly typed)
 * ```
 */
export function createNodeTypedConfiguration<TID>(
  overrides?: NodeRuntimeOverrides,
): INodeTypedConfiguration<TID> {
  const constants = overrides
    ? registerNodeRuntimeConfiguration(overrides)
    : getNodeRuntimeConfiguration();
  return new NodeTypedConfiguration<TID>(constants);
}

/**
 * Create a Node.js ObjectId configuration with strongly-typed operations.
 * Pre-configured for MongoDB ObjectId usage with the ObjectIdProvider.
 *
 * @returns ObjectId typed configuration
 *
 * @example
 * ```typescript
 * const config = createNodeObjectIdConfiguration();
 * const objectId = config.generateId(); // Returns ObjectId (strongly typed)
 * const bytes = config.idToBytes(objectId); // Convert to bytes
 * const restored = config.idFromBytes(bytes); // Convert back to ObjectId
 * ```
 */
export function createNodeObjectIdConfiguration(): INodeTypedConfiguration<ObjectId> {
  // Use the default configuration which already uses ObjectIdProvider
  const constants = getNodeRuntimeConfiguration();
  if (!constants || !constants.idProvider) {
    throw new Error(
      'Node runtime configuration not initialized. Ensure @digitaldefiance/node-ecies-lib is properly imported before calling createNodeObjectIdConfiguration().',
    );
  }
  return new NodeTypedConfiguration<ObjectId>(constants);
}

// Re-export the getNodeRuntimeConfiguration function for convenience
export { getNodeRuntimeConfiguration as getTypedNodeConfiguration };

// Re-export common provider types for convenience
export type {
  ObjectIdProvider as _ObjectIdProvider,
  GuidV4Provider as _GuidV4Provider,
  UuidProvider as _UuidProvider,
  CustomIdProvider as _CustomIdProvider,
} from '@digitaldefiance/ecies-lib';
