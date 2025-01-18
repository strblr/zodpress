# Zodpress

<p align="center">Tiny wrapper around Express for strongly typed, contract-first API development. Supports OpenAPI, request validation, nested routers, and weakly typed Express for incremental adoption.</p>

<p align="center">
  <a href="https://github.com/strblr/zodpress/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/strblr/zodpress"/>
  </a>
  <a href="https://bundlephobia.com/package/zodpress">
    <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/zodpress?label=npm"/>
  </a>
</p>

## Installation

Install Zodpress along with its peer dependencies:

```bash
npm install zodpress express zod @asteasolutions/zod-to-openapi
```

## Introduction

Zodpress (zod + express) brings four key features to the table:

1. **Strongly typed Express** - By defining an API contract, you get strongly typed request handlers. If typescript is happy, your API will be happy.
2. **OpenAPI support** - Generate an OpenAPI document directly from your contract, without duplicating your source of truth.
3. **Request validation** - Zodpress validates requests against your contract using Zod. Support for headers, path params, query params, and body validation.
4. **Incremental adoption** - Zodpress is fully compatible with regular Express. Zodpress apps and routers are just Express apps and routers with additional properties.

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
    id: "1",
    title: "Todo"
  });
});
```

Here is what I mean by strongly typed:
