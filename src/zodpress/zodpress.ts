import express, { type RouterOptions } from "express";
import type * as core from "express-serve-static-core";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry
} from "@asteasolutions/zod-to-openapi";
import { ValidationError } from "./error";
import {
  addToSet,
  isZodpress,
  getOpenApiPath,
  castArray,
  getParamsSchema,
  getContentType,
  getResponsesSchema,
  getBodySchema
} from "./utils";
import type {
  AnyContract,
  AnyMethod,
  ZodpressApp,
  ZodpressRouter,
  Zodpress,
  OpenAPIRegisterOptions
} from "./types";

export function zodpress<const Contract extends AnyContract>(
  contract: Contract = {} as Contract
) {
  const app = express() as ZodpressApp<Contract>;
  extend(app, contract);
  return app;
}

zodpress.Router = <const Contract extends AnyContract>(
  contract: Contract = {} as Contract,
  options?: RouterOptions
) => {
  const router = express.Router(options) as ZodpressRouter<Contract>;
  extend(router, contract);
  return router;
};

zodpress.contract = <const Contract extends AnyContract>(
  contract: Contract
) => {
  return contract;
};

function extend<Contract extends AnyContract>(
  router: ZodpressRouter<Contract>,
  contract: Contract
) {
  const node = new Map<string, Set<Zodpress<AnyContract>>>();
  const baseUse = router.use.bind(router);

  const registerNodes = (path: string, handlers: any[]) => {
    const nodes = handlers.filter(isZodpress);
    node.set(path, addToSet(node.get(path), nodes));
    return handlers;
  };

  router.use = (path: any, ...handlers: any[]) => {
    if (typeof path === "string") {
      registerNodes(path, handlers);
    } else {
      registerNodes("/", [path, ...handlers]);
    }
    return baseUse(path, ...handlers);
  };

  router.z = {
    contract,
    openapi(options) {
      const registry = new OpenAPIRegistry();
      router.z.register(registry, options);
      return {
        with(callback) {
          callback(registry);
          return this;
        },
        generate(config) {
          return new OpenApiGeneratorV3(registry.definitions).generateDocument(
            config
          );
        }
      };
    },
    register(registry, options) {
      for (const method of ["get", "post", "put", "patch", "delete"] as const) {
        for (const path of Object.keys(contract[method] ?? {})) {
          register(contract, method, path, registry, options);
        }
      }
      for (const [path, nodes] of node) {
        for (const node of nodes) {
          node.z.register(registry, {
            pathPrefix: `${options?.pathPrefix ?? ""}/${path}`
          });
        }
      }
    },
    get(path, ...handlers) {
      return router.get(
        path,
        validate(contract, "get", path),
        ...registerNodes(path, handlers)
      );
    },
    post(path, ...handlers) {
      return router.post(
        path,
        validate(contract, "post", path),
        ...registerNodes(path, handlers)
      );
    },
    put(path, ...handlers) {
      return router.put(
        path,
        validate(contract, "put", path),
        ...registerNodes(path, handlers)
      );
    },
    patch(path, ...handlers) {
      return router.patch(
        path,
        validate(contract, "patch", path),
        ...registerNodes(path, handlers)
      );
    },
    delete(path, ...handlers) {
      return router.delete(
        path,
        validate(contract, "delete", path),
        ...registerNodes(path, handlers)
      );
    }
  };
}

function validate(
  contract: AnyContract,
  method: AnyMethod,
  path: string
): core.RequestHandler {
  const config = contract[method]?.[path];
  if (!config) {
    throw new Error(`Zodpress: No config found for <${method} ${path}>`);
  }
  const {
    validationErrorPolicy = contract.validationErrorPolicy ?? "send",
    headers,
    params,
    query,
    body
  } = config;

  return (req, res, next) => {
    const error = new ValidationError();
    if (headers) {
      const result = headers.safeParse(req.headers);
      if (result.success) {
        req.headers = { ...req.headers, ...result.data };
      } else {
        error.headersErrors = result.error.issues;
      }
    }
    if (params) {
      const result = params.safeParse(req.params);
      if (result.success) {
        req.params = result.data;
      } else {
        error.paramsErrors = result.error.issues;
      }
    }
    if (query) {
      const result = query.safeParse(req.query);
      if (result.success) {
        req.query = result.data;
      } else {
        error.queryErrors = result.error.issues;
      }
    }
    if (body && getContentType(body) === "application/json") {
      const result = body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        error.bodyErrors = result.error.issues;
      }
    }
    if (error.isEmpty() || validationErrorPolicy === "ignore") {
      next();
    } else if (validationErrorPolicy === "send") {
      res.status(400).json(error);
    } else if (validationErrorPolicy === "forward") {
      next(error);
    } else {
      validationErrorPolicy(error, req, res, next);
    }
  };
}

function register(
  contract: AnyContract,
  method: AnyMethod,
  path: string,
  registry: OpenAPIRegistry,
  options?: OpenAPIRegisterOptions
) {
  const config = contract[method]?.[path];
  if (!config) {
    throw new Error(`Zodpress: No config found for <${method} ${path}>`);
  }
  const fullPath = getOpenApiPath(options?.pathPrefix, path);

  registry.registerPath({
    method,
    path: fullPath,
    summary: config.summary,
    description: config.description,
    deprecated: config.deprecated ?? contract.deprecated,
    tags: [...castArray(contract.tags), ...castArray(config.tags)],
    ...config.openapi,
    request: {
      headers: config.headers,
      params: config.params ?? getParamsSchema(fullPath),
      query: config.query,
      body: config.body && getBodySchema(config.body),
      ...config.openapi?.request
    },
    responses: {
      ...getResponsesSchema({
        ...contract.commonResponses,
        ...config.responses
      }),
      ...config.openapi?.responses
    }
  });
}
