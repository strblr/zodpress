<p align="center">
  <h1 align="center">☃️<br/>Zodpress</h1>
  <p align="center">
    <a href="https://strblr.github.io/zodpress">https://strblr.github.io/zodpress</a>
    <br/>
    Tiny superset of Express for strongly typed, contract-first API development. Supports OpenAPI, request validation, nested routers, and regular Express for incremental adoption.
  </p>
</p>
<br/>
<p align="center">
  <a href="https://www.npmjs.com/package/zodpress">
    <img alt="Version" src="https://img.shields.io/npm/v/zodpress"/>
  </a>
  <a href="https://github.com/strblr/zodpress/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/strblr/zodpress"/>
  </a>
  <a href="https://bundlephobia.com/package/zodpress">
    <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/zodpress?label=npm"/>
  </a>
</p>

## Table of contents

- [Installation](#installation)
- [Motivation](#motivation)
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
  - [Type helpers](#type-helpers)
- [OpenAPI](#openapi)
  - [Documents generation](#documents-generation)
  - [Augmenting Zod](#augmenting-zod)
  - [Tags](#tags)
  - [Custom route fields](#custom-route-fields)
  - [Custom components](#custom-components)
  - [Usage in frontend](#usage-in-frontend)
- [API reference](#api-reference)
  - [Contract](#contract)
  - [Functions](#functions)
  - [`z` property](#z-property)
  - [Types](#types)
- [Changelog](#changelog)

## Installation

Install Zodpress along with its peer dependencies:

```bash
npm install zodpress express zod @asteasolutions/zod-to-openapi
```

## Motivation

Zodpress ([zod](https://zod.dev/) + [express](https://expressjs.com/)) brings four key features to the table:

1. **Strongly typed Express** - Define an API contract and get strongly typed request handlers. If typescript is happy, your API will be happy.
2. **Request validation** - Zodpress validates requests against your contract using Zod. Support for headers, path params, query params, and body validation.
3. **OpenAPI support** - Generate an OpenAPI document directly from your contracts, without duplicating your source of truth.
4. **Incremental adoption** - Zodpress is fully compatible with regular Express. Zodpress apps and routers are just Express apps and routers with a `z` property.

Let's also add that it's extremely tiny (2kb gzipped) and has 100% test coverage.

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
  // Strongly typed zodpress 💪
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

## API reference

### Contract

| Property                 | Type                                                     | Description                                             |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| `deprecated?`            | `boolean`                                                | Mark all routes in the contract as deprecated           |
| `tags?`                  | `string \| string[]`                                     | OpenAPI tags for all routes in the contract             |
| `validationErrorPolicy?` | `"send" \| "forward" \| "ignore" \| ErrorRequestHandler` | Default validation error handling policy for all routes |
| `commonResponses?`       | `{ [status: number]: ZodType }`                          | Common response schemas shared by all routes            |
| `get?`                   | `{ [path: string]: RouteConfig }`                        | GET route configurations                                |
| `post?`                  | `{ [path: string]: RouteConfig }`                        | POST route configurations                               |
| `put?`                   | `{ [path: string]: RouteConfig }`                        | PUT route configurations                                |
| `patch?`                 | `{ [path: string]: RouteConfig }`                        | PATCH route configurations                              |
| `delete?`                | `{ [path: string]: RouteConfig }`                        | DELETE route configurations                             |

Each route configuration accepts:

| Property                 | Type                                                     | Description                              |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| `summary?`               | `string`                                                 | Short summary of what the route does     |
| `description?`           | `string`                                                 | Detailed description of the route        |
| `deprecated?`            | `boolean`                                                | Mark this route as deprecated            |
| `tags?`                  | `string \| string[]`                                     | OpenAPI tags for this route              |
| `validationErrorPolicy?` | `"send" \| "forward" \| "ignore" \| ErrorRequestHandler` | Validation error handling for this route |
| `openapi?`               | `Partial<OpenAPIRouteConfig>`                            | Additional OpenAPI configuration         |
| `headers?`               | `ZodObject`                                              | Schema for validating request headers    |
| `params?`                | `ZodObject`                                              | Schema for validating path parameters    |
| `query?`                 | `ZodObject`                                              | Schema for validating query parameters   |
| `body?`                  | `ZodType`                                                | Schema for validating request body       |
| `responses?`             | `{ [status: number]: ZodType }`                          | Response schemas by status code          |

### Functions

| Function                                                       | Returns       | Description                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zodpress(contract: Contract)`                                 | `Application` | Creates an Express application with Zodpress features. The `contract` parameter defines the API contract for type-safety and OpenAPI generation.                                                                                      |
| `zodpress.Router(contract: Contract, options?: RouterOptions)` | `Router`      | Creates an Express router with Zodpress features. The `contract` parameter defines the API contract for type-safety and OpenAPI generation. Takes standard Express router options.                                                    |
| `zodpress.contract(contract: Contract)`                        | `Contract`    | Helper function to define a contract with proper type inference. Returns the contract as-is.                                                                                                                                          |
| `extendZodWithZodpress(zod: typeof z)`                         | `void`        | Extends Zod with the `contentType()` method to specify custom content types for request/response schemas. Only needs to be called once. The `contentType()` method accepts a string like `"text/plain"` and returns a new Zod schema. |

### `z` property

The `z` property is available on Zodpress applications and routers, providing strongly typed routing (both at compile-time and runtime) and OpenAPI functionality:

| Property/Method                                                         | Returns          | Description                                                                                                     |
| ----------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `contract`                                                              | `Contract`       | The contract used to create this router/app                                                                     |
| `openapi(options?: OpenAPIRegisterOptions)`                             | `OpenAPIFactory` | Creates an OpenAPI factory for generating documentation. Options can include a `pathPrefix` string.             |
| `register(registry: OpenAPIRegistry, options?: OpenAPIRegisterOptions)` | `void`           | Registers this router/app's routes with a provided OpenAPI registry. Options can include a `pathPrefix` string. |
| `get(path, ...handlers)`                                                | `this`           | Adds GET route handlers with full type safety based on contract                                                 |
| `post(path, ...handlers)`                                               | `this`           | Adds POST route handlers with full type safety based on contract                                                |
| `put(path, ...handlers)`                                                | `this`           | Adds PUT route handlers with full type safety based on contract                                                 |
| `patch(path, ...handlers)`                                              | `this`           | Adds PATCH route handlers with full type safety based on contract                                               |
| `delete(path, ...handlers)`                                             | `this`           | Adds DELETE route handlers with full type safety based on contract                                              |

The `OpenAPIFactory` provides methods for customizing and generating OpenAPI documents:

| Method                                                | Returns           | Description                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `with(callback: (registry: OpenAPIRegistry) => void)` | `this`            | Allows modifying the OpenAPI registry directly through a callback function. See [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi?tab=readme-ov-file#the-registry).                                                                             |
| `generate(config: OpenAPIDocumentConfig)`             | `OpenAPIDocument` | Generates the final OpenAPI JSON document. The config parameter accepts standard OpenAPI 3.0 document fields (`info`, `servers`, etc.). See [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi?tab=readme-ov-file#generating-the-full-document). |

### Types

| Type                                     | Description                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `RequestHandler<Contract, Method, Path>` | Type for request handlers, inferred from the contract                                     |
| `RequestHeaders<Contract, Method, Path>` | Type for request headers, inferred from the contract                                      |
| `RequestParams<Contract, Method, Path>`  | Type for request path parameters, inferred from the contract                              |
| `RequestQuery<Contract, Method, Path>`   | Type for request query parameters, inferred from the contract                             |
| `RequestBody<Contract, Method, Path>`    | Type for request body, inferred from the contract                                         |
| `ResponseMap<Contract, Method, Path>`    | Type for response map, mapping status codes to response types, inferred from the contract |
| `ResponseCode<ResponseMap>`              | Type for response status codes, inferred from the response map                            |
| `ResponseBody<ResponseMap>`              | Type for response body, inferred from the response map                                    |
| `inferContract<Router>`                  | Utility type to infer the contract from a Zodpress router or app                          |
| `inferHandler<Router, Method, Path>`     | Utility type to infer the request handler type from a Zodpress router or app              |

## Changelog

See [CHANGELOG.md](https://github.com/strblr/zodpress/blob/master/CHANGELOG.md) for more information.
