/**
 * Deep copy an object, preserving functions by reference.
 * Functions cannot be cloned, so they remain as references.
 */
export function deep_copy<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "function") {
    return obj; // Functions cannot be cloned
  }

  if (typeof obj !== "object") {
    return obj; // Primitives
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deep_copy(item)) as T;
  }

  if (obj instanceof Map) {
    const copy = new Map();
    obj.forEach((value, key) => {
      copy.set(deep_copy(key), deep_copy(value));
    });
    return copy as T;
  }

  if (obj instanceof Set) {
    const copy = new Set();
    obj.forEach((value) => {
      copy.add(deep_copy(value));
    });
    return copy as T;
  }

  // Plain object
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    copy[key] = deep_copy((obj as Record<string, unknown>)[key]);
  }
  return copy as T;
}