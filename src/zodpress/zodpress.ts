import express, { type RouterOptions } from "express";
import { z } from "zod";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  type RouteConfig
} from "@asteasolutions/zod-to-openapi";
import merge from "lodash.merge";
import {
  addToSet,
  isZodpress,
  isEmpty,
  getParamsSchema,
  openApiPath
} from "./utils";
import type {
  AnyContract,
  AnyMethod,
  AnyConfig,
  RequestBody,
  RequestQuery,
  RequestHandler,
  ZodpressApp,
  ZodpressRouter,
  ValidationError,
  RegistryOptions,
  Zodpress
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
  const tree = new Map<string, Set<Zodpress<{}>>>();
  const previousUse = router.use.bind(router);

  const registerNodes = <F extends Function>(path: string, handlers: F[]) => {
    const routers = handlers.filter(h => isZodpress(h));
    tree.set(path, addToSet(tree.get(path), routers));
    return handlers;
  };

  router._contract = contract;

  router.use = (path: any, ...handlers: any[]) => {
    if (typeof path === "string") {
      registerNodes(path, handlers);
    } else {
      registerNodes("/", [path, ...handlers]);
    }
    return previousUse(path, ...handlers);
  };

  router.openapi = ({ prefix, tags, ...config }) => {
    const registry = new OpenAPIRegistry();
    router.register(registry, { prefix, tags });
    return new OpenApiGeneratorV3(registry.definitions).generateDocument(
      config
    );
  };

  router.register = (registry, options) => {
    for (const [path, configs] of Object.entries(contract)) {
      for (const [method, config] of Object.entries(configs)) {
        if (!config) continue;
        register(method as AnyMethod, path, config, registry, options);
      }
    }
    for (const [path, routers] of tree) {
      for (const router of routers) {
        router.register(registry, {
          prefix: `${options?.prefix ?? ""}/${path}`
        });
      }
    }
  };

  router.z = {
    get: (path, ...handlers) => {
      return router.get(
        path,
        validate(contract, path, "get"),
        ...registerNodes(path, handlers)
      );
    },
    post: (path, ...handlers) => {
      return router.post(
        path,
        validate(contract, path, "post"),
        ...registerNodes(path, handlers)
      );
    },
    put: (path, ...handlers) => {
      return router.put(
        path,
        validate(contract, path, "put"),
        ...registerNodes(path, handlers)
      );
    },
    patch: (path, ...handlers) => {
      return router.patch(
        path,
        validate(contract, path, "patch"),
        ...registerNodes(path, handlers)
      );
    },
    delete: (path, ...handlers) => {
      return router.delete(
        path,
        validate(contract, path, "delete"),
        ...registerNodes(path, handlers)
      );
    }
  };
}

function validate<
  Contract extends AnyContract,
  Path extends keyof Contract & string,
  Method extends AnyMethod
>(
  contract: Contract,
  path: Path,
  method: Method
): RequestHandler<Contract, Method, Path> {
  const config = contract[path]?.[method];
  return (req, _res, next) => {
    if (config) {
      const { query, body, contentType = "application/json" } = config;
      const errors: ValidationError = {};

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
        next(errors);
        return;
      }
    }
    next();
  };
}

function register(
  method: AnyMethod,
  path: string,
  config: AnyConfig,
  registry: OpenAPIRegistry,
  options?: RegistryOptions
) {
  const fullPath = openApiPath(options?.prefix, path);

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
        content:
          response instanceof z.ZodVoid
            ? undefined
            : { "application/json": { schema: response } }
      }
    ])
  );

  const routeConfig: RouteConfig = merge(
    {
      method,
      path: fullPath,
      summary: config.summary,
      request: {
        params: getParamsSchema(fullPath),
        query: config.query,
        body
      },
      responses
    },
    config.openapi
  );

  registry.registerPath(routeConfig);
}
