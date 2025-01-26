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
  - [Creating apps](#creating-apps)
  - [Contracts](#contracts)
  - [Request handlers](#request-handlers)
  - [Routers](#routers)
  - [Headers](#headers)
  - [Path params](#path-params)
  - [Query params](#query-params)
  - [Request body](#request-body)
  - [Responses](#responses)
  - [Empty responses](#empty-responses)
  - [Validation errors](#validation-errors)
- [OpenAPI](#openapi)
  - [Generating documents](#generating-documents)
  - [Descriptions](#descriptions)
  - [Tags](#tags)
  - [Content types](#content-types)
  - [Nested routers](#nested-routers)
  - [Custom schema fields](#custom-schema-fields)
  - [Custom route fields](#custom-route-fields)
  - [Custom components](#custom-components)
  - [Usage in frontend](#usage-in-frontend)
- [Recipes](#recipes)
  - [Zod coercions](#zod-coercions)
  - [Non-JSON bodies](#non-json-bodies)
  - [Shared contracts](#shared-contracts)
- [Roadmap](#roadmap)
- [API reference](#api-reference)
  - [`zodpress`](#zodpress)
  - [Contract interface](#contract-interface)
  - [`z` property](#z-property)
  - [`ValidationError`](#validationerror)
  - [Utilities](#utilities)
  - [Types](#types)
- [Changelog](#changelog)
- [License](#license)

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

Zodpress is fully compatible with regular Express, because it is just regular Express with an extra `z` property. So regular `use`, `get`, `post`, `http.createServer(app)`, and everything you can imagine will work as expected. Zodpress-specific features live under the `z` property of apps and routers. Converting a regular Express app just means swapping `express()` for `zodpress(contract)` and gradually migrating your routes under `z` or keeping a coexistence of both.

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

### Creating apps

To create an app, call the `zodpress` function where you would normally call `express()`, and pass it a contract:

```ts
import { zodpress } from "zodpress";

const app = zodpress({
  /* contract */
});
```

All Zodpress does here is create an actual Express app, attach a `z` property to it and return the app. All features that are specific to this package live under `app.z`. Since `app` is just a regular Express app, you can use all the methods you already know:

```ts
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
```

### Contracts

Contracts are plain objects that define everything about your API, including routes, methods, request and response schemas, as well as other metadata like tags, summary, etc. They are the central piece of Zodpress. A contract is bound to an app or router instance. For modular servers with multiple routers, each router will have its own contract. Type-wise or runtime-wise, a contract does not affect anything outside of the app or router it is attached to.

Out of the box, contracts enable:

- Strongly typed request handlers
- Request validation
- Support for OpenAPI documents generation

TypeScript needs to understand your contracts as deep object literals for type inference to work. It is therefore recommended to either pass them directly to `zodpress` / `zodpress.Router` or use the `zodpress.contract` helper function if you want to define them separately. This also ensures that they conform to the contract interface.

```ts
const contract = zodpress.contract({
  /* contract */
});

const app = zodpress(contract);
```

A contract is composed of a **common config** and **route configs**. Here is an example:

```ts
import { zodpress } from "zodpress";
import { z } from "zod";

const contract = zodpress.contract({
  // Common config
  tags: "todos",
  commonResponses: {
    500: z.literal("Internal error")
  },
  get: {
    "/todos/:id": {
      // Route config
      summary: "Get a todo",
      responses: {
        404: z.literal("Not found"),
        200: z.object({ id: z.string(), title: z.string() })
      }
    },
    "/todos": {
      // Route config
      summary: "Get all todos",
      query: z.object({
        offset: z.number().optional(),
        limit: z.number().optional()
      }),
      responses: {
        200: z.array(z.object({ id: z.string(), title: z.string() }))
      }
    }
  },
  post: {
    "/todos": {
      // Route config
      summary: "Create a todo",
      headers: z.object({
        authorization: z.string().regex(/^Bearer /)
      }),
      body: z.object({
        title: z.string()
      }),
      responses: {
        401: z.literal("Unauthorized"),
        201: z.object({ id: z.string() })
      }
    }
  }
});
```

See the [API reference](#contract) for more information.

### Request handlers

Type-safe request handlers are added to your apps and routers by calling `app.z.get`, `app.z.post`, `app.z.put`, `app.z.patch`, or `app.z.delete` instead of the regular `app.get`, `app.post`, etc. (which still work as expected).

```ts
app.z.get("/todos/:id", (req, res) => {
  res.status(200).json({
    id: req.params.id,
    title: "Todo"
  });
});
```

TypeScript will correctly infer the types of headers, path params, query params, request body, response codes and response bodies from your contract. At runtime, Zod will validate headers, path params, query params, and request body as long as they are defined in the contract.

For modularity, you can define a request handler as a standalone function outside of an `app.z[method]` call. To infer the handler type from the app or router, use the `inferHandler` type helper. To infer it from the contract itself, use the `RequestHandler` type.

```ts
import type { inferHandler, RequestHandler } from "zodpress";

const auth: inferHandler<typeof app, "post", "/todos"> = (req, res) => {
  /* ... */
};

const createTodo: RequestHandler<typeof contract, "post", "/todos"> = () => {
  /* ... */
};

app.z.post("/todos", auth, createTodo);
```

### Routers

In Express, routers are used to create modular route handlers. Think of it as sub-apps. Similar to how you create apps, call the `zodpress.Router` function where you would normally call `express.Router()`, and pass it a contract:

```ts
const router = zodpress.Router({
  /* contract */
});
```

Like apps, routers have a `z` property for defining type-safe handlers. This allows you to split your API into multiple routers, each in its own file with its own contract. Each router's contract only needs to define its own routes - you don't need to include those routes in the main app's contract or any parent router's contract.

```ts
// user.api.ts
const userRouter = zodpress.Router({
  /* user contract */
});

// todo.api.ts
const todoRouter = zodpress.Router({
  /* todo contract */
});

// app.ts
const app = zodpress({});
app.use(express.json());
app.use(userRouter);
app.use(todoRouter);
```

### Headers

To validate request headers, use the `headers` property of route configs in your contract. The schema has to be a Zod object. Since headers often contain many fields, most of which of lesser importance, validated headers are shallowly merged with existing ones to preserve runtime access to undeclared headers. This also means that it wouldn't make sense to use [`strict` object schemas](https://zod.dev/?id=strict) here unless you have a good reason.

```ts
const app = zodpress({
  post: {
    "/todos": {
      headers: z.object({
        authorization: z.string().regex(/^Bearer /)
      })
    }
  }
});

app.z.post("/todos", (req, res) => {
  const token = req.headers.authorization; // string
  const other = req.headers.other; // string | string[] | undefined
  // ...
});
```

### Path params

TypeScript will automatically infer path param types from the path itself:

```ts
app.z.get("/todos/:id", (req, res) => {
  const id = req.params.id; // string
  const other = req.params.other; // Error: Property 'other' does not exist [...]
  // ...
});
```

If you need to validate path params against a schema, you can use the `params` property. The schema has to be a Zod object.

```ts
const app = zodpress({
  get: {
    "/todos/:id": {
      params: z.object({ id: z.string().uuid() })
    }
  }
});
```

### Query params

Query params can be validated against a schema using the `query` property of route configs in your contract. The schema has to be a Zod object.

```ts
const app = zodpress({
  get: {
    "/todos": {
      query: z.object({
        offset: z.string().optional(),
        limit: z.string().optional()
      })
    }
  }
});

app.z.get("/todos", (req, res) => {
  const offset = req.query.offset; // string | undefined
  const limit = req.query.limit; // string | undefined
  const other = req.query.other; // Error: Property 'other' does not exist [...]
  // ...
});
```

### Request body

To validate request bodies, use the `body` property in your route configs. The schema can be of any Zod type. When generating OpenAPI documents, please refer to [zod-to-openapi's list of supported Zod types](https://github.com/asteasolutions/zod-to-openapi?tab=readme-ov-file#supported-types).

```ts
const app = zodpress({
  post: {
    "/todos": {
      body: z.object({ title: z.string().min(1) })
    }
  }
});

app.use(express.json()); // Don't forget this when dealing with JSON bodies

app.z.post("/todos", (req, res) => {
  const title = req.body.title; // string
  const other = req.body.other; // Error: Property 'other' does not exist [...]
  // ...
});
```

### Responses

Response schemas are not used for runtime validation (yet at least). Their current purpose is twofold:

- Strong typing of status codes and response bodies in request handlers
- Generating OpenAPI documents with response documentation

Use the `responses` property in your route configs and map status codes to response schemas:

```ts
const app = zodpress({
  get: {
    "/todos/:id": {
      responses: {
        404: z.literal("Not found"),
        200: z.object({ id: z.string(), title: z.string() })
      }
    }
  }
});

app.z.get("/todos/:id", (req, res) => {
  res.status(404).send("Not found"); // Ok

  // Error: Argument of type 'Other' is not assignable to parameter of type 'Not found'
  res.status(404).send("Other");

  res.status(200).send({ id: "1", title: "Todo" }); // Ok

  // Error: Argument of type string is not assignable to parameter of type { id: string; title: string; }
  res.status(200).send("Not found");

  // Argument of type { id: string; } is not assignable to parameter of type { id: string; title: string; }
  res.status(200).json({ id: "1" });

  // Error: Argument of type 201 is not assignable to parameter of type 200 | 404
  res.status(201);
});
```

If all the routes in your contract share common responses, you can define them in the common config under the `commonResponses` property. If a route response overrides a common response, the route response takes precedence for that route.

```ts
const app = zodpress({
  commonResponses: {
    404: z.literal("Not found")
  },
  get: {
    "/todos/:id": {
      responses: {
        200: z.object({ id: z.string(), title: z.string() })
      }
    }
  }
});

app.z.get("/todos/:id", (req, res) => {
  res.status(404).send("Not found"); // Ok
  res.status(200).send({ id: "1", title: "Todo" }); // Ok
});
```

### Empty responses

To signal an empty response, use the `z.void()` schema. This will automatically infer the response body type as `void` and document it as empty when generating OpenAPI documents.

```ts
const app = zodpress({
  delete: {
    "/todos/:id": {
      responses: {
        204: z.void()
      }
    }
  }
});
```

### Validation errors

When defining either headers, path params, query params, or request body schemas, Zodpress will validate the content of the request against these schemas before calling your route handlers. If validation fails, a [`ValidationError`](#validationerror) is created containing all the errors. What happens next depends on the `validationErrorPolicy` option. This option can be set as a common config or a route config. Keep in mind that route configs take precedence over the common config. Here are the possible values:

- `"send"`: The error is sent back to the client as a JSON response with a 400 status code. This is the default behavior.
- `"forward"`: The error is forwarded to the next error handler Express finds (internally it does `next(error)`). Useful when you have a custom error handler somewhere else in your app.
- `"ignore"`: The error is ignored. Useful when debugging.
- `ErrorRequestHandler`: A custom error handler is called. The function will receive the following arguments: error, request, response, next function.

Example:

```ts
const app = zodpress({
  validationErrorPolicy: "forward",
  get: {
    "/todos/:id": {
      params: z.object({
        id: z.string().uuid()
      })
    }
  }
});

app.z.get("/todos/:id", (req, res) => {
  // ...
});

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    res.status(400).json(err);
  } else {
    next(err);
  }
});
```

## OpenAPI

(Coming soon)

## Recipes

(Coming soon)

## Roadmap

- Support for OpenAPI 3.1
- Support for common headers (similar to `commonResponses`)
- Support for content-type header validation using `zodSchema.contentType()` metadata [maybe]
- Automatically document response code 400 in OpenAPI documents for validated routes

## API reference

### `zodpress`

| Function                                                       | Returns       | Description                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zodpress(contract: Contract)`                                 | `Application` | Creates an Express application with Zodpress features. The `contract` parameter defines the API contract for type-safety and OpenAPI generation.                                   |
| `zodpress.Router(contract: Contract, options?: RouterOptions)` | `Router`      | Creates an Express router with Zodpress features. The `contract` parameter defines the API contract for type-safety and OpenAPI generation. Takes standard Express router options. |
| `zodpress.contract(contract: Contract)`                        | `Contract`    | Helper function to define a contract with proper type inference. Returns the contract as-is.                                                                                       |

### Contract interface

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

Each route config accepts:

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

### `z` property

The `z` property is available on Zodpress applications and routers.

| Property/Method                                                         | Returns          | Description                                                                                                     |
| ----------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `contract`                                                              | `Contract`       | The contract bound to this router/app                                                                           |
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

### `ValidationError`

The `ValidationError` class extends the standard `Error` class and is used to represent validation errors.

| Method           | Returns      | Description                                    |
| ---------------- | ------------ | ---------------------------------------------- |
| `isEmpty()`      | `boolean`    | Returns true if it doesn't contain any errors. |
| `headersErrors?` | `ZodIssue[]` | Array of validation errors for headers         |
| `paramsErrors?`  | `ZodIssue[]` | Array of validation errors for path params     |
| `queryErrors?`   | `ZodIssue[]` | Array of validation errors for query params    |
| `bodyErrors?`    | `ZodIssue[]` | Array of validation errors for request body    |

### Utilities

| Function                               | Returns | Description                                                                                                                                                                                                                           |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extendZodWithZodpress(zod: typeof z)` | `void`  | Extends Zod with the `contentType()` method to specify custom content types for request/response schemas. Only needs to be called once. The `contentType()` method accepts a string like `"text/plain"` and returns a new Zod schema. |

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

## License

[MIT](https://github.com/strblr/zodpress/blob/master/LICENSE)
