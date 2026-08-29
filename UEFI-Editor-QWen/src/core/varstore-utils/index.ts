/**
 * VarStore Utilities Module
 * Helper functions for working with UEFI variable stores
 * @module core/varstore-utils
 */

import type { VarStores, VarStore, Data } from "../types";

/**
 * Finds a variable store by ID
 * @param varStores - Collection of variable stores
 * @param varStoreId - ID to search for
 * @returns VarStore if found, undefined otherwise
 */
export function findVarStoreById(
  varStores: VarStores,
  varStoreId: string,
): VarStore | undefined {
  return varStores.find((store) => store.varStoreId === varStoreId);
}

/**
 * Finds a variable store by name
 * @param varStores - Collection of variable stores
 * @param name - Name to search for
 * @returns VarStore if found, undefined otherwise
 */
export function findVarStoreByName(
  varStores: VarStores,
  name: string,
): VarStore | undefined {
  return varStores.find((store) => store.name === name);
}

/**
 * Finds a variable store by GUID and name
 * @param varStores - Collection of variable stores
 * @param formSetGuid - FormSet GUID to match
 * @param name - Name to search for
 * @returns VarStore if found, undefined otherwise
 */
export function findVarStoreByGuidAndName(
  varStores: VarStores,
  formSetGuid: string | undefined,
  name: string,
): VarStore | undefined {
  if (formSetGuid === undefined) {
    return undefined;
  }

  return varStores.find(
    (store) =>
      store.formSetGuid !== undefined &&
      store.formSetGuid.toLowerCase() === formSetGuid.toLowerCase() &&
      store.name === name,
  );
}

/**
 * Groups variable stores by FormSet GUID
 * @param varStores - Collection of variable stores
 * @returns Map of GUID to array of VarStores
 */
export function groupVarStoresByGuid(
  varStores: VarStores,
): Map<string, readonly VarStore[]> {
  const grouped: Map<string, VarStore[]> = new Map();

  for (const store of varStores) {
    const guid: string = store.formSetGuid ?? "unknown";
    const existing: VarStore[] | undefined = grouped.get(guid);

    if (existing !== undefined) {
      existing.push(store);
    } else {
      grouped.set(guid, [store]);
    }
  }

  return grouped;
}

/**
 * Calculates total size of all variable stores
 * @param varStores - Collection of variable stores
 * @returns Total size in bytes
 */
export function calculateTotalVarStoreSize(varStores: VarStores): number {
  return varStores.reduce((total, store) => {
    const size: number = parseInt(store.size, 16);
    return Number.isNaN(size) ? total : total + size;
  }, 0);
}

/**
 * Validates variable store references in data
 * @param data - Complete firmware data structure
 * @returns Array of validation error messages
 */
export function validateVarStoreReferences(data: Data): readonly string[] {
  const errors: string[] = [];

  for (const form of data.forms) {
    for (const child of form.children) {
      const referencedStore: VarStore | undefined = findVarStoreById(
        data.varStores,
        child.varStoreId,
      );

      if (referencedStore === undefined) {
        errors.push(
          `Form "${form.name}" child "${child.name}" references non-existent VarStore "${child.varStoreId}"`,
        );
      }
    }
  }

  return errors;
}

/**
 * Gets unique variable store names
 * @param varStores - Collection of variable stores
 * @returns Array of unique names
 */
export function getUniqueVarStoreNames(varStores: VarStores): readonly string[] {
  const names: Set<string> = new Set();

  for (const store of varStores) {
    names.add(store.name);
  }

  return Array.from(names).sort();
}

/**
 * Filters variable stores by size range
 * @param varStores - Collection of variable stores
 * @param minSize - Minimum size in bytes (inclusive)
 * @param maxSize - Maximum size in bytes (inclusive)
 * @returns Filtered array of VarStores
 */
export function filterVarStoresBySize(
  varStores: VarStores,
  minSize: number,
  maxSize: number,
): readonly VarStore[] {
  return varStores.filter((store) => {
    const size: number = parseInt(store.size, 16);
    return !Number.isNaN(size) && size >= minSize && size <= maxSize;
  });
}

/**
 * Creates a map of VarStore IDs to VarStore objects for fast lookup
 * @param varStores - Collection of variable stores
 * @returns Map of ID to VarStore
 */
export function createVarStoreMap(
  varStores: VarStores,
): ReadonlyMap<string, VarStore> {
  const map: Map<string, VarStore> = new Map();

  for (const store of varStores) {
    map.set(store.varStoreId, store);
  }

  return Object.freeze(map);
}
