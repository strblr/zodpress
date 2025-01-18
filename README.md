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
- [Apps and routers](#apps-and-routers)
  - [Contracts](#contracts)
  - [Nested routers](#nested-routers)
  - [Headers](#headers)
  - [Path params](#path-params)
  - [Query params](#query-params)
  - [Request body](#request-body)
  - [Responses](#responses)
  - [Content types](#content-types)
- [OpenAPI](#openapi)
  - [Documents generation](#documents-generation)
  - [Augmenting Zod](#augmenting-zod)
  - [Tags](#tags)
  - [Custom route fields](#custom-route-fields)
  - [Custom components](#custom-components)
- [Type helpers](#type-helpers)
- [API reference](#api-reference)

## Installation

Install Zodpress along with its peer dependencies:

```bash
npm install zodpress express zod @asteasolutions/zod-to-openapi
```

## Introduction

Zodpress ([zod](https://zod.dev/) + [express](https://expressjs.com/)) brings four key features to the table:

1. **Strongly typed Express** - Define an API contract and get strongly typed request handlers. If typescript is happy, your API will be happy.
2. **Request validation** - Zodpress validates requests against your contract using Zod. Support for headers, path params, query params, and body validation.
3. **OpenAPI support** - Generate an OpenAPI document directly from your contracts, without duplicating your source of truth.
4. **Incremental adoption** - Zodpress is fully compatible with regular Express. Zodpress apps and routers are just Express apps and routers plus a bit more.

Let's also add that it's extremely tiny (<2kb gzipped) and has 100% test coverage.

### Strongly typed Express

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

![image](https://github.com/user-attachments/assets/74429229-a2d4-4d24-a179-e101afd946cb)

### Request validation

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

### OpenAPI support

Zodpress can generate an OpenAPI document from your contract. You're then free to serve it any way you want. It's also fully customizable if you need special OpenAPI fields, custom components, security schemes, etc. More on that in the docs. Below is a simple example featuring [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express):

```ts
const openApiDocument = app.z.openapi().generate({
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

### Incremental adoption

Zodpress is fully compatible with regular Express, because it is just regular Express with an extra `z` property. So regular `use`, `get`, `post`, `http.createServer(app)`, and everything you can imagine will work as expected and never cause any issues, either type-wise or at runtime. Zodpress solely lives under the `z` property of apps and routers. Converting a regular Express app basically just means swapping `express()` for `zodpress(contract)` and then gradually migrating your routes under `z` or keeping a coexistence of both.

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

## Apps and routers

(Coming soon)

## OpenAPI

(Coming soon)

## Type helpers

(Coming soon)

## API reference

(Coming soon)
