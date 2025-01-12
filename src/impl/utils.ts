import { z } from "./z";
import type { AnyContract, TypedRouter } from "./types";

export function isTypedRouter(
  handler: Function
): handler is TypedRouter<AnyContract> {
  return "_contract" in handler && "_tree" in handler;
}

export function concatPaths(...paths: (string | undefined)[]) {
  return paths
    .filter(p => p)
    .join("")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

export function addToSet<T>(set: Set<T> | undefined, values: T[]) {
  set ??= new Set<T>();
  for (const value of values) {
    set.add(value);
  }
  return set;
}

export function isEmpty(obj?: object): obj is object {
  return !obj || Object.keys(obj).length === 0;
}

export function getParamsSchema(path: string) {
  // TODO: handle {/id} notation
  const params = path.split("/").filter(p => p.startsWith(":"));
  return params.length === 0
    ? undefined
    : z.object(Object.fromEntries(params.map(p => [p.slice(1), z.string()])));
}
