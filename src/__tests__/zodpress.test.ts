import { describe, it, expect, beforeEach, vi } from "vitest";
import supertest from "supertest";
import express from "express";
import { zodpress, type ZodpressApp, type ZodpressRouter } from "../zodpress";
import { z } from "../zod";

describe("zodpress", () => {
  const contract = zodpress.contract({
    tags: "Test API",
    get: {
      "/items/:id": {
        summary: "Get item by ID",
        description: "Get an item by its ID",
        responses: {
          200: z
            .object({
              id: z.string(),
              name: z.string()
            })
            .openapi("Item"),
          404: z.string()
        }
      }
    },
    post: {
      "/items": {
        summary: "Create item",
        body: z
          .object({
            name: z.string().min(3)
          })
          .openapi("CreateItem"),
        responses: {
          201: z
            .object({
              id: z.string(),
              name: z.string()
            })
            .openapi("Item")
        }
      }
    }
  });

  let app: ZodpressApp<{}>;
  let router: ZodpressRouter<typeof contract>;

  beforeEach(() => {
    app = zodpress({});
    router = zodpress.Router(contract);
    app.use(express.json());
    app.use("/api", router);
  });

  describe("Contract creation", () => {
    it("should create a valid contract", () => {
      expect(contract).toBeDefined();
      expect(contract.tags).toBe("Test API");
      expect(contract.get["/items/:id"]).toBeDefined();
      expect(contract).to.not.haveOwnProperty("delete");
    });
  });

  describe("Router integration", () => {
    it("should handle requests correctly", async () => {
      router.z.get("/items/:id", (req, res) => {
        expect(req.params.id).toBe("123");
        res.status(200).json({ id: req.params.id, name: "Test Item" });
      });
      const response = await supertest(app).get("/api/items/123");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: "123",
        name: "Test Item"
      });
    });

    it("should handle all request methods", async () => {
      const commonRoute = {
        "/items": {
          responses: { 200: z.any() }
        }
      };
      const router = zodpress.Router({
        get: commonRoute,
        post: commonRoute,
        put: commonRoute,
        patch: commonRoute,
        delete: commonRoute
      });
      app.use("/v1", router);
      router.z.get("/items", (_, res) => {
        res.status(200).json({});
      });
      router.z.post("/items", (_, res) => {
        res.status(200).json({});
      });
      router.z.put("/items", (_, res) => {
        res.status(200).json({});
      });
      router.z.patch("/items", (_, res) => {
        res.status(200).json({});
      });
      router.z.delete("/items", (_, res) => {
        res.status(200).json({});
      });
      for (const method of ["get", "post", "put", "patch", "delete"] as const) {
        const response = await supertest(app)[method]("/v1/items");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      }
    });

    it("should throw error if route is not defined in contract", () => {
      expect(() => {
        // @ts-expect-error
        router.z.get("/items/123", () => {});
      }).toThrow();
    });

    it("should let non-contract headers pass through", async () => {
      const router = zodpress.Router({
        get: { "/items": { headers: z.object({ "x-api-key": z.string() }) } }
      });
      router.z.get("/items", (req, res) => {
        expect(req.headers["x-api-key"]).toBe("123");
        expect(req.headers["x-api-key2"]).toBe("123");
        res.end();
      });
      app.use("/v1", router);
      await supertest(app)
        .get("/v1/items")
        .set("x-api-key", "123")
        .set("x-api-key2", "123")
        .expect(200);
    });
  });

  describe("OpenAPI integration", () => {
    it("should generate valid open api documentation", () => {
      const openApiDoc = app.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths).to.have.keys("/api/items", "/api/items/{id}");
      expect(openApiDoc.components?.schemas).to.have.keys("Item", "CreateItem");
      expect(openApiDoc.paths["/api/items/{id}"].get).toEqual(
        expect.objectContaining({
          summary: "Get item by ID",
          description: "Get an item by its ID",
          tags: ["Test API"],
          parameters: [
            expect.objectContaining({
              in: "path",
              name: "id",
              schema: { type: "string" }
            })
          ],
          responses: expect.objectContaining({
            200: expect.objectContaining({
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Item" }
                }
              }
            }),
            404: expect.objectContaining({
              content: {
                "application/json": {
                  schema: { type: "string" }
                }
              }
            })
          })
        })
      );
    });

    it("should generate correct headers schema", () => {
      const router = zodpress.Router({
        get: { "/items": { headers: z.object({ "x-api-key": z.string() }) } }
      });
      app.use("/v1", router);
      const openApiDoc = app.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });
      expect(openApiDoc.paths["/v1/items"].get?.parameters).toEqual([
        expect.objectContaining({
          in: "header",
          name: "x-api-key",
          schema: { type: "string" }
        })
      ]);
    });

    it("should generate empty response when z.void() is used", () => {
      const router = zodpress.Router({
        get: { "/items": { responses: { 200: z.void() } } }
      });
      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });
      expect(openApiDoc.paths["/items"].get).toBeDefined();
      expect(
        openApiDoc.paths["/items"].get?.responses[200].content
      ).toBeUndefined();
    });

    it("should register custom components", () => {
      const openApiDoc = app.z
        .openapi()
        .with(reg => {
          reg.registerComponent("securitySchemes", "apiKey", {
            type: "apiKey",
            in: "header",
            name: "apiKey"
          });
        })
        .generate({
          openapi: "3.0.0",
          info: {
            title: "Test API",
            version: "1.0.0"
          }
        });

      expect(openApiDoc.components?.securitySchemes?.apiKey).toEqual({
        type: "apiKey",
        in: "header",
        name: "apiKey"
      });
    });

    it("should extract named schemas to components", () => {
      const router = zodpress.Router({
        get: {
          "/users": {
            responses: {
              200: z.array(
                z
                  .object({
                    id: z.string(),
                    name: z.string(),
                    profile: z
                      .object({
                        age: z.number(),
                        bio: z.string()
                      })
                      .openapi("UserProfile"),
                    posts: z.array(
                      z
                        .object({
                          id: z.string(),
                          title: z.string()
                        })
                        .openapi("Post")
                    )
                  })
                  .openapi("User")
              )
            }
          }
        }
      });

      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/users"].get?.responses[200]).toEqual(
        expect.objectContaining({
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/User"
                }
              }
            }
          }
        })
      );

      // Verify all schema structures in a single assertion
      expect(openApiDoc.components?.schemas).toEqual(
        expect.objectContaining({
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              profile: { $ref: "#/components/schemas/UserProfile" },
              posts: {
                type: "array",
                items: { $ref: "#/components/schemas/Post" }
              }
            },
            required: ["id", "name", "profile", "posts"]
          },
          UserProfile: {
            type: "object",
            properties: {
              age: { type: "number" },
              bio: { type: "string" }
            },
            required: ["age", "bio"]
          },
          Post: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" }
            },
            required: ["id", "title"]
          }
        })
      );
    });

    it("should throw error if route config is undefined", () => {
      const router = zodpress.Router({
        get: { "/items": undefined }
      } as {});
      expect(() =>
        router.z.openapi().generate({
          openapi: "3.0.0",
          info: {
            title: "Test API",
            version: "1.0.0"
          }
        })
      ).toThrow();
    });

    it("should correctly apply path prefix", () => {
      const router = zodpress.Router({
        get: { "/items": { responses: { 200: z.void() } } }
      });
      const openApiDoc = router.z.openapi({ pathPrefix: "/v1" }).generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });
      expect(openApiDoc.paths["/v1/items"].get).toBeDefined();
    });

    it("should combine tags from multiple sources", () => {
      const router = zodpress.Router({
        tags: ["Global"],
        get: {
          "/test": {
            tags: ["Route"],
            responses: { 200: z.void() }
          }
        }
      });

      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/test"].get?.tags).toEqual(["Global", "Route"]);
    });

    it("should handle custom request content types", async () => {
      const router = zodpress.Router({
        post: {
          "/text": {
            contentType: "text/plain",
            body: z.string(),
            responses: { 200: z.string() }
          }
        }
      });

      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/text"].post?.requestBody).toEqual(
        expect.objectContaining({
          content: { "text/plain": { schema: { type: "string" } } }
        })
      );
    });

    it("should handle custom response content types", async () => {
      const router = zodpress.Router({
        get: {
          "/text": { responses: { 200: z.string().contentType("text/plain") } }
        }
      });

      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/text"].get?.responses[200]).toEqual(
        expect.objectContaining({
          content: { "text/plain": { schema: { type: "string" } } }
        })
      );
    });

    it("should merge custom openapi route configuration", () => {
      const router = zodpress.Router({
        get: {
          "/test": {
            responses: { 200: z.void() },
            query: z.object({ id: z.string() }),
            openapi: {
              security: [{ apiKey: [] }],
              request: {
                cookies: z.object({
                  "my-cookie": z.string()
                })
              }
            }
          }
        }
      });

      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/test"].get).toEqual(
        expect.objectContaining({
          security: [{ apiKey: [] }],
          parameters: [
            expect.objectContaining({
              in: "query",
              name: "id",
              schema: { type: "string" }
            }),
            expect.objectContaining({
              in: "cookie",
              name: "my-cookie",
              schema: { type: "string" }
            })
          ]
        })
      );
    });

    it("should override route configuration with openapi configuration", () => {
      const router = zodpress.Router({
        get: {
          "/test": {
            tags: ["Route"],
            responses: {
              200: z.string().describe("Description 1")
            },
            openapi: {
              tags: ["OpenAPI"],
              responses: {
                200: {
                  description: "Description 2"
                }
              }
            }
          }
        }
      });
      const openApiDoc = router.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      expect(openApiDoc.paths["/test"].get?.tags).toEqual(["OpenAPI"]);
      expect(openApiDoc.paths["/test"].get?.responses[200]).toEqual({
        description: "Description 2"
      });
    });
  });

  describe("Validation", () => {
    it("should validate request headers", async () => {
      const router = zodpress.Router({
        get: {
          "/items": { headers: z.object({ "x-api-key": z.string() }) }
        }
      });
      router.z.get("/items", (_req, res) => {
        res.end();
      });
      app.use("/v1", router);
      await supertest(app).get("/v1/items").expect(400);
      await supertest(app).get("/v1/items").set("X-Other", "123").expect(400);
      await supertest(app).get("/v1/items").set("x-api-key", "123").expect(200);
      await supertest(app).get("/v1/items").set("X-Api-Key", "123").expect(200);
      await supertest(app)
        .get("/v1/items")
        .set("X-Api-Key", "123")
        .set("X-Other", "123")
        .expect(200);
    });

    it("should validate request params", async () => {
      const router = zodpress.Router({
        get: {
          "/items/:id": {
            params: z.object({ id: z.string().min(3) }),
            responses: { 200: z.void() }
          }
        }
      });
      router.z.get("/items/:id", (_req, res) => {
        res.sendStatus(200);
      });
      app.use("/v1", router);
      await supertest(app).get("/v1/items/123").expect(200);
      await supertest(app).get("/v1/items/12").expect(400);
    });

    it("should validate request query", async () => {
      const router = zodpress.Router({
        get: {
          "/items": {
            query: z.object({ id: z.string().min(3) }),
            responses: { 200: z.void() }
          }
        }
      });
      router.z.get("/items", (_req, res) => {
        res.sendStatus(200);
      });
      app.use("/v1", router);
      await supertest(app).get("/v1/items?id=123").expect(200);
      await supertest(app).get("/v1/items?id=12").expect(400);
    });

    it("should validate request body", async () => {
      router.z.post("/items", (req, res) => {
        res.status(201).json({ id: "1", name: req.body.name });
      });
      await supertest(app)
        .post("/api/items")
        .send({ name: "Test Item" })
        .expect(201);
      await supertest(app).post("/api/items").send({ name: "ab" }).expect(400);
    });

    it("should send validation errors by default", async () => {
      router.z.post("/items", (req, res) => {
        res.status(201).json({
          id: "1",
          name: req.body.name
        });
      });

      await supertest(app)
        .post("/api/items")
        .send({ name: "ab" }) // Too short, should fail validation
        .expect(400);
    });

    it("should use custom error handler", async () => {
      const errorBeacon = vi.fn();
      const router = zodpress.Router({
        validationErrorPolicy: (err, _req, res) => {
          errorBeacon(err);
          res.status(500).json(err);
        },
        post: {
          "/test": {
            body: z.object({
              value: z.number()
            }),
            responses: {
              200: z.string()
            }
          }
        }
      });
      app.use("/v1", router);
      router.z.post("/test", (_req, res) => {
        res.status(200).send("OK");
      });
      await supertest(app)
        .post("/v1/test")
        .send({ value: "not a number" })
        .expect(500);
      expect(errorBeacon).toHaveBeenCalled();
    });

    it("should forward validation errors", async () => {
      const errorBeacon = vi.fn();
      const router = zodpress.Router({
        validationErrorPolicy: "forward",
        post: {
          "/test": {
            body: z.object({
              value: z.number()
            }),
            responses: {
              200: z.string()
            }
          }
        }
      });

      app.use("/v1", router);

      app.use((err: any, _req: any, res: any, _next: any) => {
        errorBeacon(err);
        res.status(400).json(err);
      });

      router.z.post("/test", (_req, res) => {
        res.status(200).send("OK");
      });

      await supertest(app)
        .post("/v1/test")
        .send({ value: "not a number" })
        .expect(400);

      expect(errorBeacon).toHaveBeenCalled();
    });

    it("should ignore validation errors", async () => {
      const router = zodpress.Router({
        validationErrorPolicy: "ignore",
        post: { "/test": { body: z.object({ value: z.number() }) } }
      });
      router.z.post("/test", (_req, res) => {
        res.end();
      });
      app.use("/v1", router);
      await supertest(app)
        .post("/v1/test")
        .send({ value: "not a number" })
        .expect(200);
    });
  });

  describe("Nested routers", () => {
    it("should handle nested routers and concatenate paths correctly", async () => {
      const userRouter = zodpress.Router({
        get: {
          "/:id": {
            summary: "Get user",
            responses: {
              200: z
                .object({
                  id: z.string(),
                  name: z.string()
                })
                .openapi("User")
            }
          },
          "/:id/posts": {
            summary: "Get user posts",
            responses: {
              200: z
                .array(
                  z.object({
                    id: z.string(),
                    title: z.string()
                  })
                )
                .openapi("UserPosts")
            }
          }
        }
      });

      const apiRouter = zodpress.Router({
        get: {
          "/health": {
            summary: "Health check",
            responses: {
              200: z.literal("OK")
            }
          }
        }
      });

      // Set up route handlers
      userRouter.z.get("/:id", (_req, res) => {
        res.json({ id: "1", name: "Test User" });
      });
      userRouter.z.get("/:id/posts", (_req, res) => {
        res.json([{ id: "1", title: "Test Post" }]);
      });
      apiRouter.z.get("/health", (_req, res) => {
        res.send("OK");
      });

      // Set up nested routing structure
      apiRouter.use("/users", userRouter);
      const app = zodpress({});
      app.use("/api/v1", apiRouter);

      // Generate OpenAPI documentation
      const openApiDoc = app.z.openapi().generate({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        }
      });

      // Verify paths are correctly concatenated
      expect(openApiDoc.paths).to.have.keys(
        "/api/v1/health",
        "/api/v1/users/{id}",
        "/api/v1/users/{id}/posts"
      );

      // Verify individual route configurations are preserved
      expect(openApiDoc.paths["/api/v1/users/{id}"].get).toEqual(
        expect.objectContaining({
          summary: "Get user",
          responses: expect.objectContaining({
            200: expect.objectContaining({
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" }
                }
              }
            })
          })
        })
      );

      await supertest(app).get("/api/v1/health").expect(200).expect("OK");

      await supertest(app).get("/api/v1/users/1").expect(200).expect({
        id: "1",
        name: "Test User"
      });

      await supertest(app)
        .get("/api/v1/users/1/posts")
        .expect(200)
        .expect([
          {
            id: "1",
            title: "Test Post"
          }
        ]);
    });
  });
});
