import express from "express";
import type * as core from "express-serve-static-core";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry
} from "@asteasolutions/zod-to-openapi";
import { z } from "./z";
import {
  addToSet,
  concatPaths,
  isTypedRouter,
  isEmpty,
  getParamsSchema
} from "./utils";
import type {
  AnyPath,
  AnyContract,
  AnyMethod,
  RequestBody,
  RequestQuery,
  RequestHandler,
  TypedExpress,
  TypedRouter,
  ValidationErrorBody,
  AnyConfig,
  RegistryOptions
} from "./types";

export function texpress<const Contract extends AnyContract>(
  contract: Contract = {} as Contract
) {
  const app = express() as TypedExpress<Contract>;
  decorate(contract, app);
  return app;
}

texpress.Router = <const Contract extends AnyContract>(
  contract: Contract = {} as Contract
) => {
  const router = express.Router() as TypedRouter<Contract>;
  decorate(contract, router);
  return router;
};

texpress.contract = <const Contract extends AnyContract>(
  contract: Contract
) => {
  return contract;
};

function decorate<Contract extends AnyContract>(
  contract: Contract,
  router: TypedRouter<Contract>
) {
  const tree = new Map<string, Set<TypedRouter<AnyContract>>>();
  const previousUse = router.use.bind(router);

  const registerChildren = <F extends Function>(
    path: string,
    handlers: F[]
  ) => {
    const routers = handlers.filter(h => isTypedRouter(h));
    tree.set(path, addToSet(tree.get(path), routers));
    return handlers;
  };

  router._contract = contract;
  router._tree = tree;

  router.use = (...[path, ...handlers]: any[]) => {
    if (typeof path === "string") {
      registerChildren(path, handlers);
    } else {
      registerChildren("", [path, ...handlers]);
    }
    return previousUse(path, ...handlers);
  };

  router.openapi = ({ prefix, ...config }) => {
    const registry = new OpenAPIRegistry();
    router.register(registry, { prefix });
    return new OpenApiGeneratorV3(registry.definitions).generateDocument(
      config
    );
  };

  router.register = (registry, options) => {
    for (const [path, configs] of Object.entries(contract)) {
      for (const [method, config] of Object.entries(configs)) {
        if (!config) continue;
        register(
          method as AnyMethod,
          path as AnyPath,
          config,
          registry,
          options
        );
      }
    }
    for (const [path, routers] of [...tree]) {
      for (const router of routers) {
        router.register(registry, {
          prefix: concatPaths(options?.prefix, path)
        });
      }
    }
  };

  router.t = {
    get: (path, ...handlers) => {
      return router.get(
        path,
        validate(contract, path, "get"),
        ...registerChildren(path, handlers)
      );
    },
    post: (path, ...handlers) => {
      return router.post(
        path,
        validate(contract, path, "post"),
        ...registerChildren(path, handlers)
      );
    },
    put: (path, ...handlers) => {
      return router.put(
        path,
        validate(contract, path, "put"),
        ...registerChildren(path, handlers)
      );
    },
    patch: (path, ...handlers) => {
      return router.patch(
        path,
        validate(contract, path, "patch"),
        ...registerChildren(path, handlers)
      );
    },
    delete: (path, ...handlers) => {
      return router.delete(
        path,
        validate(contract, path, "delete"),
        ...registerChildren(path, handlers)
      );
    }
  };
}

function validate<
  Contract extends AnyContract,
  Path extends keyof Contract & AnyPath,
  Method extends AnyMethod
>(
  contract: Contract,
  path: Path,
  method: Method
): RequestHandler<Contract, Method, Path> {
  const config = contract[path]?.[method];
  return (req, res, next) => {
    if (config) {
      const { query, body, contentType = "application/json" } = config;
      const errors: ValidationErrorBody = {};

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
      if (!isEmpty(errors)) {
        (res as core.Response).status(400).json(errors);
        return;
      }
    }
    next();
  };
}

function register(
  method: AnyMethod,
  path: AnyPath,
  config: AnyConfig,
  registry: OpenAPIRegistry,
  options?: RegistryOptions
) {
  const fullPath = concatPaths(options?.prefix, path);
  const body =
    config.body || config.contentType
      ? {
          content: {
            [config.contentType || "application/json"]: {
              schema: config.body || z.any()
            }
          }
        }
      : undefined;

  const responses = Object.fromEntries(
    Object.entries(config.responses).map(([status, response]) => [
      status,
      {
        description: response.description ?? "",
        content: {
          "application/json": { schema: response }
        }
      }
    ])
  );

  registry.registerPath({
    method: method,
    path: fullPath,
    summary: config.summary,
    tags: config.tags,
    request: {
      params: getParamsSchema(fullPath),
      query: config.query,
      body
    },
    responses
  });
}
