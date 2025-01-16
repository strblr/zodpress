import express, { type RouterOptions } from "express";
import type * as core from "express-serve-static-core";
import { z } from "zod";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  type RouteConfig
} from "@asteasolutions/zod-to-openapi";
import {
  addToSet,
  isZodpress,
  isEmpty,
  openApiPath,
  castArray,
  buildParamsSchema
} from "./utils";
import type {
  AnyContract,
  AnyMethod,
  RequestBody,
  RequestQuery,
  RequestHandler,
  ZodpressApp,
  ZodpressRouter,
  ValidationError,
  Zodpress,
  OpenAPIRegisterOptions,
  RequestParams
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

  router._contract = contract;

  router.use = (path: any, ...handlers: any[]) => {
    if (typeof path === "string") {
      registerNodes(path, handlers);
    } else {
      registerNodes("/", [path, ...handlers]);
    }
    return baseUse(path, ...handlers);
  };

  router.openapi = options => {
    const registry = new OpenAPIRegistry();
    router.register(registry, options);
    return {
      registerComponent(type, name, component) {
        registry.registerComponent(type as any, name, component);
        return this;
      },
      generate(config) {
        return new OpenApiGeneratorV3(registry.definitions).generateDocument(
          config
        );
      }
    };
  };

  router.register = (registry, options) => {
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      for (const path of Object.keys(contract[method] ?? {})) {
        register(contract, method, path, registry, options);
      }
    }
    for (const [path, nodes] of node) {
      for (const node of nodes) {
        node.register(registry, {
          pathPrefix: `${options?.pathPrefix ?? ""}/${path}`
        });
      }
    }
  };

  router.z = {
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

function validate<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
>(
  contract: Contract,
  method: Method,
  path: Path
): RequestHandler<Contract, Method, Path> {
  const config = contract[method]?.[path];
  if (!config) {
    throw new Error(`Zodpress: No config found for <${method} ${path}>`);
  }
  const {
    validationErrorPolicy = contract.validationErrorPolicy ?? "send",
    params,
    query,
    body,
    contentType = "application/json"
  } = config;

  return (req, res, next) => {
    const errors: ValidationError = {};
    if (params) {
      const result = params.safeParse(req.params);
      if (result.success) {
        req.params = result.data as RequestParams<Contract, Method, Path>;
      } else {
        errors.paramsErrors = result.error.issues;
      }
    }
    if (query) {
      const result = query.safeParse(req.query);
      if (result.success) {
        req.query = result.data as RequestQuery<Contract, Method, Path>;
      } else {
        errors.queryErrors = result.error.issues;
      }
    }
    if (body && contentType === "application/json") {
      const result = body.safeParse(req.body);
      if (result.success) {
        req.body = result.data as RequestBody<Contract, Method, Path>;
      } else {
        errors.bodyErrors = result.error.issues;
      }
    }
    if (isEmpty(errors)) {
      next();
    } else if (validationErrorPolicy === "forward") {
      next(errors);
    } else {
      (res as core.Response).status(400).send(errors);
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
  const fullPath = openApiPath(options?.pathPrefix, path);

  const body: Exclude<RouteConfig["request"], undefined>["body"] =
    config.body || config.contentType
      ? {
          content: {
            [config.contentType || "application/json"]: {
              schema: config.body || z.any()
            }
          }
        }
      : undefined;

  const responses: RouteConfig["responses"] = Object.fromEntries(
    Object.entries(config.responses ?? {}).map(([status, response]) => [
      status,
      {
        description: response.description ?? "",
        content:
          response instanceof z.ZodVoid
            ? undefined
            : { "application/json": { schema: response } }
      }
    ])
  );

  registry.registerPath({
    ...config.openapi,
    method,
    path: fullPath,
    summary: config.summary,
    tags: [
      ...castArray(contract.tags),
      ...castArray(config.tags),
      ...castArray(config.openapi?.tags)
    ],
    request: {
      ...config.openapi?.request,
      params: config.params ?? buildParamsSchema(fullPath),
      query: config.query,
      body
    },
    responses: {
      ...config.openapi?.responses,
      ...responses
    }
  });
}
