import express from "express";
import * as swaggerUi from "swagger-ui-express";
import { inferHandler, zodpress } from "../zodpress";
import { z } from "../zod";

const todoSchema = z
  .object({
    id: z.string(),
    title: z.string()
  })
  .openapi("Todo");

const createTodoSchema = z
  .object({
    title: z.string()
  })
  .openapi("CreateTodo");

const contract1 = zodpress.contract({
  tags: "Contract 1",
  get: {
    "/todos/:id": {
      summary: "Get a todo",
      params: z.object({
        id: z.coerce.number().describe("The ID of the todo")
      }),
      responses: {
        200: todoSchema,
        404: z.string()
      }
    },
    "/test": {}
  },
  delete: {
    "/todos/:id": {
      summary: "Delete a todo",
      responses: {
        204: z.void() // Empty response body
      }
    }
  }
});

const contract2 = zodpress.contract({
  tags: "Contract 2",
  get: {
    "/todos": {
      summary: "Get all todos",
      query: z.object({
        page: z.string().min(2).describe("Page number"),
        limit: z.coerce.number()
      }),
      responses: {
        200: todoSchema.array()
      }
    }
  },
  post: {
    "/todos": {
      summary: "Create a todo",
      body: createTodoSchema,
      responses: {
        200: todoSchema
      }
    }
  }
});

const app = zodpress({});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const r1 = zodpress.Router(contract1);
const r2 = zodpress.Router(contract2);

app.use(r1).use(r2);

const getTodoHandler: inferHandler<typeof r1, "get", "/todos/:id"> = (
  _req,
  res
) => {
  console.log(typeof _req.params.id);
  res.status(200).json({
    id: "1",
    title: "Todooo"
  });
};

r1.z.get("/todos/:id", getTodoHandler);

r1.z.delete("/todos/:id", (_req, res) => {
  res.status(204).send();
});

r2.z.get("/todos", (_req, res) => {
  console.log(typeof _req.query.limit);
  res.status(200).send([
    {
      id: "1",
      title: "Todo"
    }
  ]);
});

r2.z.post("/todos", (req, res) => {
  const p = req.params;
  const b = req.body;
  const q = req.query;
  console.log("Got params", p);
  console.log("Got body", b);
  console.log("Got query", q);
  res.status(200).send({
    id: "1",
    title: "Todo"
  });
});

r2.get("/bar", (_req, res) => {
  // Regular weakly typed express
  res.send("Hello World");
});

const openApiDocument = app.openapi({ pathPrefix: "/api/v2" }).generate({
  openapi: "3.0.0",
  info: {
    version: "2.0.0",
    title: "My API",
    description: "This is the API"
  },
  servers: [{ url: "http://localhost:3000" }]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.log("In error handler");
  res.status(400).send(err);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
