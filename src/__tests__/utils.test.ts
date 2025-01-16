import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  openApiPath,
  addToSet,
  isEmpty,
  castArray,
  buildParamsSchema
} from "../zodpress/utils";

describe("utils", () => {
  describe("openApiPath", () => {
    it("should convert express paths to OpenAPI format", () => {
      expect(openApiPath("")).toBe("/");
      expect(openApiPath("/")).toBe("/");
      expect(openApiPath("////")).toBe("/");
      expect(openApiPath(undefined)).toBe("/");
      expect(openApiPath("users")).toBe("/users");
      expect(openApiPath("/users")).toBe("/users");
      expect(openApiPath("users/")).toBe("/users");
      expect(openApiPath("/users/")).toBe("/users");
      expect(openApiPath("/users/:id")).toBe("/users/{id}");
      expect(openApiPath("/users/:id?")).toBe("/users/{id}");
      expect(openApiPath("/users{/id}")).toBe("/users/id");
      expect(openApiPath("/users{/:id}")).toBe("/users/{id}");
      expect(openApiPath("/users{/:id?}")).toBe("/users/{id}");
      expect(openApiPath("/users/id/posts")).toBe("/users/id/posts");
      expect(openApiPath("users/id/posts/")).toBe("/users/id/posts");
      expect(openApiPath("/users//id///posts")).toBe("/users/id/posts");
      expect(openApiPath("users", "posts/:id")).toBe("/users/posts/{id}");
      expect(openApiPath("/users/", "/posts/:id")).toBe("/users/posts/{id}");
      expect(openApiPath("/posts{/category}{/id}")).toBe("/posts/category/id");
      expect(openApiPath("/users", "/posts", "/:id")).toBe("/users/posts/{id}");
      expect(openApiPath("/", undefined, "/v1/:version")).toBe("/v1/{version}");
      expect(openApiPath("/", "/api/", "/v1/:version")).toBe(
        "/api/v1/{version}"
      );
      expect(openApiPath("/orders/:orderId/items/:itemId")).toBe(
        "/orders/{orderId}/items/{itemId}"
      );
      expect(openApiPath("/orders{/:orderId}/items{/:itemId}")).toBe(
        "/orders/{orderId}/items/{itemId}"
      );
    });
  });

  describe("addToSet", () => {
    it("should add values to set", () => {
      const set = new Set<number>();
      const returnedSet = addToSet(set, [1, 2]);
      expect(returnedSet).toBe(set);
      expect(set.size).toBe(2);
      expect(set.has(1)).toBe(true);
      expect(set.has(2)).toBe(true);
    });

    it("should create a new set if none is provided", () => {
      const set = addToSet(undefined, [1, 2]);
      expect(set).toBeInstanceOf(Set);
      expect(set.size).toBe(2);
      expect(set.has(1)).toBe(true);
      expect(set.has(2)).toBe(true);
    });
  });

  describe("isEmpty", () => {
    it("should check if a value is empty", () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({ key: "value" })).toBe(false);
      expect(isEmpty(["item"])).toBe(false);
      expect(isEmpty(undefined)).toBe(true);
    });
  });

  describe("castArray", () => {
    it("should cast values to array", () => {
      expect(castArray(undefined)).toEqual([]);
      expect(castArray(null)).toEqual([null]);
      expect(castArray("single")).toEqual(["single"]);
      expect(castArray(["multiple"])).toEqual(["multiple"]);
    });
  });

  describe("buildParamsSchema", () => {
    it("should build zod schema from path parameters", () => {
      const schema = buildParamsSchema("/users/{id}/posts/{postId}");
      expect(schema).toBeDefined();
      expect(schema).toBeInstanceOf(z.ZodObject);
      expect(schema?.shape.id).toBeDefined();
      expect(schema?.shape.id).toBeInstanceOf(z.ZodString);
      expect(schema?.shape.postId).toBeDefined();
      expect(schema?.shape.postId).toBeInstanceOf(z.ZodString);
      expect(buildParamsSchema("/users")).toBeUndefined();
    });
  });
});
