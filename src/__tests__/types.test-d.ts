import { expectTypeOf, describe, it, assertType } from "vitest";
import type * as core from "express-serve-static-core";
import { z } from "zod";
import { zodpress } from "../zodpress/zodpress";
import type {
  AnyContract,
  AnyConfig,
  ZodpressApp,
  ZodpressRouter,
  RequestParams,
  RequestQuery,
  RequestBody,
  ResponseMap,
  ResponseCode,
  ResponseBody,
  RequestHeaders
} from "../zodpress/types";

describe("type tests", () => {
  const contract = zodpress.contract({
    tags: ["api"],
    validationErrorPolicy: "send",
    get: {
      "/users": {
        headers: z.object({
          "x-api-key": z.string()
        }),
        query: z.object({
          page: z.number().optional(),
          limit: z.number().optional()
        }),
        responses: {
          200: z.object({ id: z.string(), name: z.string() }).array()
        }
      },
      "/users/:id": {
        responses: {
          200: z.object({ id: z.string(), name: z.string() }),
          404: z.object({ error: z.string() })
        }
      }
    },
    post: {
      "/users": {
        body: z.object({ name: z.string() }),
        responses: {
          200: z.object({ id: z.string(), name: z.string() })
        }
      }
    }
  });

  const emptyRouteContract = zodpress.contract({ get: { "/users": {} } });

  const contractWithCommonResponses = zodpress.contract({
    commonResponses: {
      401: z.literal("Unauthorized")
    },
    get: {
      "/users": {
        responses: {
          200: z.object({ id: z.string(), name: z.string() }).array()
        }
      },
      "/users/:id": {
        responses: {
          200: z.object({ id: z.string(), name: z.string() }),
          404: z.object({ error: z.string() })
        }
      },
      "/users/:id/posts": {
        responses: {
          200: z.object({ id: z.string(), title: z.string() }).array(),
          401: z.literal("Unauthorized for this resource")
        }
      }
    }
  });

  it("should properly infer contract properties", () => {
    expectTypeOf(contract).toMatchTypeOf<AnyContract>();
    expectTypeOf(contract.validationErrorPolicy).toEqualTypeOf<"send">();
    expectTypeOf(contract.tags).toEqualTypeOf<["api"]>();
    expectTypeOf(contract.get).toMatchTypeOf<AnyContract["get"]>();
    expectTypeOf(contract.get["/users"]).toMatchTypeOf<AnyConfig>();
    // @ts-expect-error
    assertType(contract.delete);
    // @ts-expect-error
    assertType(contract.get["/user"]);
  });

  it("should properly apply method and path constraints", () => {
    // @ts-expect-error
    assertType<RequestParams<typeof contract, "get", "/todos">>;
    // @ts-expect-error
    assertType<RequestParams<typeof contract, "put", "/users">>;
  });

  it("should properly infer zodpress router types", () => {
    const app = zodpress(contract);
    const router = zodpress.Router(contract);
    assertType<ZodpressApp<typeof contract>>(app);
    assertType<ZodpressRouter<typeof contract>>(router);
    expectTypeOf(app).toMatchTypeOf<typeof router>();
  });

  it("should properly infer request headers", () => {
    expectTypeOf<
      RequestHeaders<typeof contract, "get", "/users">
    >().toEqualTypeOf<{ "x-api-key": string } & core.Request["headers"]>();

    expectTypeOf<
      RequestHeaders<typeof contract, "get", "/users/:id">
    >().toEqualTypeOf<core.Request["headers"]>();
  });

  it("should properly infer path parameters", () => {
    const contract2 = zodpress.contract({
      get: {
        "/users/:id": {
          params: z.object({ id: z.coerce.number() })
        }
      }
    });

    expectTypeOf<
      RequestParams<typeof contract, "get", "/users">
    >().toEqualTypeOf<{}>();

    expectTypeOf<
      RequestParams<typeof contract, "get", "/users/:id">
    >().toEqualTypeOf<{ id: string }>();

    expectTypeOf<
      RequestParams<typeof contract2, "get", "/users/:id">
    >().toEqualTypeOf<{ id: number }>();
  });

  it("should properly infer query parameters", () => {
    expectTypeOf<
      RequestQuery<typeof contract, "get", "/users">
    >().toEqualTypeOf<{ page?: number; limit?: number }>();

    expectTypeOf<
      RequestQuery<typeof contract, "get", "/users/:id">
    >().toEqualTypeOf<never>();
  });

  it("should properly infer request body", () => {
    expectTypeOf<
      RequestBody<typeof contract, "post", "/users">
    >().toEqualTypeOf<{ name: string }>();

    expectTypeOf<
      RequestBody<typeof contract, "get", "/users">
    >().toEqualTypeOf<never>();
  });

  it("should properly infer response map", () => {
    expectTypeOf<
      ResponseMap<typeof contract, "get", "/users">
    >().toEqualTypeOf<{ 200: { id: string; name: string }[] }>();

    expectTypeOf<
      ResponseMap<typeof contract, "get", "/users/:id">
    >().toEqualTypeOf<{
      200: { id: string; name: string };
      404: { error: string };
    }>();

    expectTypeOf<
      ResponseMap<typeof emptyRouteContract, "get", "/users">
    >().toEqualTypeOf<{}>();

    expectTypeOf<
      ResponseMap<typeof contractWithCommonResponses, "get", "/users">
    >().toEqualTypeOf<{
      401: "Unauthorized";
      200: { id: string; name: string }[];
    }>();

    expectTypeOf<
      ResponseMap<typeof contractWithCommonResponses, "get", "/users/:id">
    >().toEqualTypeOf<{
      404: { error: string };
      401: "Unauthorized";
      200: { id: string; name: string };
    }>();

    expectTypeOf<
      ResponseMap<typeof contractWithCommonResponses, "get", "/users/:id/posts">
    >().toEqualTypeOf<{
      401: "Unauthorized for this resource";
      200: { id: string; title: string }[];
    }>();
  });

  it("should properly infer response code", () => {
    expectTypeOf<
      ResponseCode<ResponseMap<typeof contract, "get", "/users">>
    >().toEqualTypeOf<200>();

    expectTypeOf<
      ResponseCode<ResponseMap<typeof contract, "get", "/users/:id">>
    >().toEqualTypeOf<200 | 404>();

    expectTypeOf<
      ResponseCode<ResponseMap<typeof emptyRouteContract, "get", "/users">>
    >().toEqualTypeOf<never>();

    expectTypeOf<
      ResponseCode<
        ResponseMap<typeof contractWithCommonResponses, "get", "/users">
      >
    >().toEqualTypeOf<200 | 401>();

    expectTypeOf<
      ResponseCode<
        ResponseMap<typeof contractWithCommonResponses, "get", "/users/:id">
      >
    >().toEqualTypeOf<200 | 401 | 404>();

    expectTypeOf<
      ResponseCode<
        ResponseMap<
          typeof contractWithCommonResponses,
          "get",
          "/users/:id/posts"
        >
      >
    >().toEqualTypeOf<200 | 401>();
  });

  it("should properly infer response body", () => {
    expectTypeOf<
      ResponseBody<ResponseMap<typeof contract, "get", "/users">>
    >().toEqualTypeOf<{ id: string; name: string }[]>();

    expectTypeOf<
      ResponseBody<ResponseMap<typeof contract, "get", "/users/:id">>
    >().toEqualTypeOf<{ id: string; name: string } | { error: string }>();

    expectTypeOf<
      ResponseBody<ResponseMap<typeof emptyRouteContract, "get", "/users">>
    >().toEqualTypeOf<never>();

    expectTypeOf<
      ResponseBody<
        ResponseMap<typeof contractWithCommonResponses, "get", "/users">
      >
    >().toEqualTypeOf<{ id: string; name: string }[] | "Unauthorized">();

    expectTypeOf<
      ResponseBody<
        ResponseMap<typeof contractWithCommonResponses, "get", "/users/:id">
      >
    >().toEqualTypeOf<
      { id: string; name: string } | { error: string } | "Unauthorized"
    >();

    expectTypeOf<
      ResponseBody<
        ResponseMap<
          typeof contractWithCommonResponses,
          "get",
          "/users/:id/posts"
        >
      >
    >().toEqualTypeOf<
      { id: string; title: string }[] | "Unauthorized for this resource"
    >();
  });
});
