import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { extendZodWithZodpress } from "../zodpress/extension";

describe("Zod Extension", () => {
  beforeEach(() => {
    // Reset the prototype to ensure clean tests
    delete (z.ZodType.prototype as any).contentType;
  });

  it("should add contentType method to ZodType", () => {
    extendZodWithZodpress(z);
    expect(typeof z.string().contentType).toBe("function");
  });

  it("should not add contentType method multiple times", () => {
    extendZodWithZodpress(z);
    const firstInstance = z.ZodType.prototype.contentType;
    extendZodWithZodpress(z);
    expect(z.ZodType.prototype.contentType).toBe(firstInstance);
  });

  it("should store contentType in _zodpress definition", () => {
    extendZodWithZodpress(z);
    const schema = z.string().contentType("text/plain");
    expect(schema._def._zodpress?.contentType).toBe("text/plain");
  });

  it("should create a new schema", () => {
    extendZodWithZodpress(z);
    const baseSchema = z.string().min(3).cuid();
    const schema = baseSchema.contentType("text/plain");
    expect(baseSchema).not.toEqual(schema);
    expect(baseSchema._def).not.toEqual(schema._def);
  });

  it("should preserve original schema properties", () => {
    extendZodWithZodpress(z);
    const baseSchema = z.string().min(3).cuid();
    const schema = baseSchema.contentType("text/plain");
    expect(schema._def).toEqual(expect.objectContaining(baseSchema._def));
  });

  it("should work with different schema types", () => {
    extendZodWithZodpress(z);
    const stringSchema = z.string().contentType("text/plain");
    const numberSchema = z.number().contentType("application/x-number");
    const objectSchema = z
      .object({ foo: z.string() })
      .contentType("application/json");

    expect(stringSchema._def._zodpress?.contentType).toBe("text/plain");
    expect(numberSchema._def._zodpress?.contentType).toBe(
      "application/x-number"
    );
    expect(objectSchema._def._zodpress?.contentType).toBe("application/json");
  });
});
