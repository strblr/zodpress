# Zodpress

<p align="center">Tiny superset of Express for strongly typed, contract-first API development. Supports OpenAPI, request validation, nested routers, and regular Express for incremental adoption.</p>

<p align="center">
  <a href="https://github.com/strblr/zodpress/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/strblr/zodpress"/>
  </a>
  <a href="https://bundlephobia.com/package/zodpress">
    <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/zodpress?label=npm"/>
  </a>
</p>

- [Installation](#installation)
- [Introduction](#introduction)
  - [Strongly typed Express](#strongly-typed-express)
  - [Request validation](#request-validation)
  - [OpenAPI support](#openapi-support)
  - [Incremental adoption](#incremental-adoption)
- [Documentation](#documentation)
- [API reference](#api-reference)

## Installation

Install Zodpress along with its peer dependencies:

```bash
npm install zodpress express zod @asteasolutions/zod-to-openapi
```

## Introduction

Zodpress ([zod](https://zod.dev/) + express) brings four key features to the table:

1. **Strongly typed Express** - By defining an API contract, you get strongly typed request handlers. If typescript is happy, your API will be happy.
2. **Request validation** - Zodpress validates requests against your contract using Zod. Support for headers, path params, query params, and body validation.
3. **OpenAPI support** - Generate an OpenAPI document directly from your contracts, without duplicating your source of truth.
4. **Incremental adoption** - Zodpress is fully compatible with regular Express. Zodpress apps and routers are just Express apps and routers plus a bit more.

Let's also add that it's extremely tiny (<2kb gzipped) and has 100% test coverage.

### 1. Strongly typed Express

The cornerstone of Zodpress is a contract. In in, you define your endpoints, methods, request and response schemas, as well as other metadata like tags, summary, etc.

```ts
import { zodpress } from "zodpress";

const contract = zodpress.contract({
  get: {
    "/todo/:id": {
      summary: "Get a todo",
      responses: {
        404: z.literal("Not found"),
        200: z.object({
          id: z.string(),
          title: z.string()
        })
      }
    }
  }
});
```

You then create apps and routers like you normally would, except that you pass it the contract. All the methods you're used to are still there, but now you have an extra `z` property where you can attach strongly typed handlers:

```ts
const app = zodpress(contract);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.z.get("/todo/:id", (req, res) => {
  res.status(200).json({
    id: req.params.id,
    title: "Todo"
  });
});
```

Here is a sample of what I mean by strongly typed:

![image](https://github.com/user-attachments/assets/ef2f6dcf-b4a6-416a-812e-88f700b00598)

![image](https://github.com/user-attachments/assets/377811b4-a303-40a4-803c-cdbf73b16e4b)

![image](https://github.com/user-attachments/assets/13898fea-46eb-4f2f-bdce-b92c5a0e14b3)

![image](https://github.com/user-attachments/assets/fe8782b0-a609-40c8-a367-1f269ce7e1d8)

### 2. Request validation

Headers, path params, query params, and request body will automatically be validated against Zod schemas defined in your contract. If there is a validation error, the default behavior is to send a 400 response with an error report. This behavior can be customized on a contract or route level. Simple example:

```ts
const contract = zodpress.contract({
  post: {
    "/todo": {
      body: z.object({ title: z.string() })
    }
  }
});
```

Let's make a faulty request:

```bash
curl localhost:3000/todo -H "Content-Type: application/json" -d '{ "title": 42 }'
```

```json
{
  "type": "validation_error",
  "bodyErrors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["title"],
      "message": "Expected string, received number"
    }
  ]
}
```

### 3. OpenAPI support

Zodpress can generate an OpenAPI document from your contract. You're then free to serve it any way you want. It's also fully customizable if you need special OpenAPI fields, custom components, security schemes, etc. More on that in the docs. Below is a simple example featuring [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express):

```ts
const openApiDocument = app.openapi().generate({
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
    description: "This is the API"
  }
});

app.use("/docs", swagger.serve, swagger.setup(openApiDocument));
app.get("/openapi.json", (_, res) => {
  res.json(openApiDocument);
});
```

### 4. Incremental adoption

Zodpress is fully compatible with regular Express, because it is just regular Express with an extra `z` property. So regular `use`, `get`, `post`, `http.createServer(app)`, and everything you can imagine will work as expected and never cause any issues, either type-wise or at runtime. Zodpress solely lives under the `z` property of apps and routers. Converting a regular Express app basically just means swapping `express()` for `zodpress(contract)` and then gradually migrating your routes under `z`.

```ts
const app = zodpress(contract);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/regular-route", (req, res) => {
  // Weakly typed vanilla express
  res.status(200).json({
    message: "Hello, world!"
  });
});

app.z.get("/todo/:id", (req, res) => {
  // Strongly typed zodpress
  res.status(200).json({
    id: req.params.id,
    title: "Todo"
  });
});
```

## Documentation

(Coming soon)

## API reference

(Coming soon)
