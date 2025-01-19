import { describe, it, expect } from "vitest";
import express from "express";
import type { ResponseConfig } from "@asteasolutions/zod-to-openapi";
import { zodpress } from "../zodpress";
import { z } from "../zod";
import {
  getOpenApiPath,
  addToSet,
  isEmpty,
  castArray,
  getParamsSchema,
  getContentType,
  isZodpress,
  getBodySchema,
  getResponsesSchema
} from "../zodpress/utils";

describe("utils", () => {
  describe("isZodpress", () => {
    it("should recognize zodpress instances", () => {
      expect(isZodpress(zodpress({}))).toBe(true);
      expect(isZodpress(zodpress.Router({}))).toBe(true);
    });

    it("should not recognize non-zodpress instances", () => {
      expect(isZodpress({})).toBe(false);
      expect(isZodpress(express())).toBe(false);
      expect(isZodpress(express.Router())).toBe(false);
      expect(isZodpress(zodpress.contract({}))).toBe(false);
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
      expect(castArray([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("getContentType", () => {
    it("should return the content type of a schema", () => {
      expect(getContentType(z.any())).toBe("application/json");
      expect(getContentType(z.string())).toBe("application/json");
      expect(
        getContentType(z.any().contentType("application/octet-stream"))
      ).toBe("application/octet-stream");
      expect(getContentType(z.string().contentType("text/plain"))).toBe(
        "text/plain"
      );
    });
  });

  describe("getOpenApiPath", () => {
    it("should convert express paths to OpenAPI format", () => {
      expect(getOpenApiPath("")).toBe("/");
      expect(getOpenApiPath("/")).toBe("/");
      expect(getOpenApiPath("////")).toBe("/");
      expect(getOpenApiPath(undefined)).toBe("/");
      expect(getOpenApiPath("users")).toBe("/users");
      expect(getOpenApiPath("/users")).toBe("/users");
      expect(getOpenApiPath("users/")).toBe("/users");
      expect(getOpenApiPath("/users/")).toBe("/users");
      expect(getOpenApiPath("/users/:id")).toBe("/users/{id}");
      expect(getOpenApiPath("/users/:id?")).toBe("/users/{id}");
      expect(getOpenApiPath("/users{/id}")).toBe("/users/id");
      expect(getOpenApiPath("/users{/:id}")).toBe("/users/{id}");
      expect(getOpenApiPath("/users{/:id?}")).toBe("/users/{id}");
      expect(getOpenApiPath("/users/id/posts")).toBe("/users/id/posts");
      expect(getOpenApiPath("users/id/posts/")).toBe("/users/id/posts");
      expect(getOpenApiPath("/users//id///posts")).toBe("/users/id/posts");
      expect(getOpenApiPath("users", "posts/:id")).toBe("/users/posts/{id}");
      expect(getOpenApiPath("/users/", "/posts/:id")).toBe("/users/posts/{id}");
      expect(getOpenApiPath("/posts{/category}{/id}")).toBe(
        "/posts/category/id"
      );
      expect(getOpenApiPath("/users", "/posts", "/:id")).toBe(
        "/users/posts/{id}"
      );
      expect(getOpenApiPath("/", undefined, "/v1/:version")).toBe(
        "/v1/{version}"
      );
      expect(getOpenApiPath("/", "/api/", "/v1/:version")).toBe(
        "/api/v1/{version}"
      );
      expect(getOpenApiPath("/orders/:orderId/items/:itemId")).toBe(
        "/orders/{orderId}/items/{itemId}"
      );
      expect(getOpenApiPath("/orders{/:orderId}/items{/:itemId}")).toBe(
        "/orders/{orderId}/items/{itemId}"
      );
    });
  });

  describe("getParamsSchema", () => {
    it("should build zod schema from path parameters", () => {
      const schema = getParamsSchema("/users/{id}/posts/{postId}");
      expect(schema).toBeDefined();
      expect(schema).toBeInstanceOf(z.ZodObject);
      expect(schema?.shape.id).toBeDefined();
      expect(schema?.shape.id).toBeInstanceOf(z.ZodString);
      expect(schema?.shape.postId).toBeDefined();
      expect(schema?.shape.postId).toBeInstanceOf(z.ZodString);
      expect(getParamsSchema("/users")).toBeUndefined();
    });
  });

  describe("getBodySchema", () => {
    it("should build schema from request body", () => {
      const schema = getBodySchema(z.object({ name: z.string() }));
      expect(schema?.content["application/json"]).toBeDefined();
      expect(schema?.content["application/json"]?.schema).toBeInstanceOf(
        z.ZodObject
      );
      expect(
        (schema?.content["application/json"]?.schema as z.ZodObject<any>).shape
          .name
      ).toBeDefined();
      expect(
        (schema?.content["application/json"]?.schema as z.ZodObject<any>).shape
          .name
      ).toBeInstanceOf(z.ZodString);
    });

    it("should build schema from request body with custom contentType", () => {
      const schema = getBodySchema(
        z.string().contentType("application/octet-stream")
      );
      expect(
        schema?.content["application/octet-stream"]?.schema
      ).toBeInstanceOf(z.ZodString);
    });

    it("should build schema from request body with description", () => {
      const schema = getBodySchema(z.string().describe("This is a string"));
      expect(schema?.description).toBe("This is a string");
    });
  });

  describe("getResponsesSchema", () => {
    it("should build schema from response", () => {
      const schema = getResponsesSchema({ 200: z.string() });
      const res200 = schema[200] as ResponseConfig;
      expect(res200).toBeDefined();
      expect(res200.content?.["application/json"]).toBeDefined();
      expect(res200.content?.["application/json"]?.schema).toBeInstanceOf(
        z.ZodString
      );
    });

    it("should build schema from void response", () => {
      const schema = getResponsesSchema({ 204: z.void() });
      const res204 = schema[204] as ResponseConfig;
      expect(res204).toBeDefined();
      expect(res204.content).toBeUndefined();
    });

    it("should build schema from response with custom content type", () => {
      const schema = getResponsesSchema({
        200: z.string().contentType("text/plain")
      });
      const res200 = schema[200] as ResponseConfig;
      expect(res200.content?.["text/plain"]).toBeDefined();
      expect(res200.content?.["text/plain"]?.schema).toBeInstanceOf(
        z.ZodString
      );
    });

    it("should build schema from response with description", () => {
      const schema = getResponsesSchema({
        200: z.string().describe("This is a string")
      });
      const res200 = schema[200] as ResponseConfig;
      expect(res200.description).toBe("This is a string");
    });
  });
});
