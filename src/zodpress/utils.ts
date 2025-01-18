import { z } from "zod";
import type { AnyContract, Zodpress } from "./types";

export function isZodpress(value: unknown): value is Zodpress<AnyContract> {
  return (
    typeof value === "function" &&
    "z" in value &&
    typeof value.z === "object" &&
    value.z !== null &&
    "contract" in value.z
  );
}

export function getContentType(schema?: z.ZodTypeAny): string {
  return schema?._def._zodpress?.contentType ?? "application/json";
}

export function openApiPath(...paths: (string | undefined)[]) {
  return ["/", ...paths]
    .map(p => p?.trim())
    .filter(p => p)
    .join("/")
    .replace(/{([^}]+)}/g, "$1") // /path{/id}/foo => /path/id/foo
    .replace(/(?<!\\)\?/g, "") // /path/:id? => /path/:id
    .replace(/:(\w+)/g, "{$1}") // /path/:id => /path/{id}
    .replace(/\/+/g, "/") // /path//foo => /path/foo
    .replace(/(?<=.)\/$/, ""); // /path/foo/ => /path/foo
}

export function addToSet<T>(set: Set<T> | undefined, values: T[]) {
  set ??= new Set<T>();
  values.forEach(value => set.add(value));
  return set;
}

export function isEmpty(obj?: object) {
  return (
    (!obj ? 0 : Array.isArray(obj) ? obj.length : Object.keys(obj).length) === 0
  );
}

export function buildParamsSchema(path: string) {
  const params = path.match(/{\w+}/g)?.map(p => p.slice(1, -1)) ?? [];
  return isEmpty(params)
    ? undefined
    : z.object(Object.fromEntries(params.map(p => [p, z.string()])));
}

export function castArray<T>(value: undefined | T | T[]) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
