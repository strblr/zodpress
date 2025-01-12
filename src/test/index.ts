import express from "express";
import * as swaggerUi from "swagger-ui-express";
import { texpress, z } from "@/index";

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

const contract = texpress.contract({
  "/todos/:id": {
    get: {
      summary: "Get a todo",
      tags: ["todos"],
      responses: {
        200: todoSchema,
        404: z.string()
      }
    },
    delete: {
      summary: "Delete a todo",
      tags: ["todos"],
      responses: {
        200: z.string()
      }
    }
  },
  "/todos": {
    get: {
      summary: "Get all todos",
      tags: ["todos2"],
      query: z.object({
        page: z.string().nonempty().optional().describe("Page number"),
        limit: z.coerce.number()
      }),
      responses: {
        200: todoSchema.array()
      }
    },
    post: {
      summary: "Create a todo",
      tags: ["todos2"],
      body: createTodoSchema,
      responses: {
        200: todoSchema
      }
    }
  }
});

const router = texpress.Router(contract);

router.t.get("/todos/:id", (req, res) => {
  res.status(200).send({
    id: "1",
    title: "Todo"
  });
});

router.t.get("/todos", (req, res) => {
  res.status(200).send([
    {
      id: "1",
      title: "Todo"
    }
  ]);
});

router.t.post("/todos", (req, res) => {
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

router.get("/bar", (req, res, next) => {
  res.send("Hello World");
});

const router2 = texpress.Router({});
router2.use("/v2", router);

const router3 = texpress.Router({});
router3.use("/", router2);

const app = texpress({});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router3);

const openApiDocument = app.openapi({
  openapi: "3.0.0",
  info: {
    version: "2.0.0",
    title: "My API",
    description: "This is the API"
  },
  servers: [{ url: "http://localhost:3000" }]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
