import type * as core from "express-serve-static-core";
import type { z, ZodIssue } from "zod";
import type {
  OpenApiGeneratorV3,
  OpenAPIRegistry
} from "@asteasolutions/zod-to-openapi";

// Contract

export type AnyPath = `/${string}`;

export type AnyMethod = "get" | "post" | "put" | "patch" | "delete";

export type AnyContract = {
  [path: AnyPath]: {
    [method in AnyMethod]?: AnyConfig;
  };
};

export type AnyConfig = {
  summary?: string;
  tags?: string[];
  query?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  contentType?: string;
  responses: {
    [status: number]: z.ZodTypeAny;
  };
};

// Express & Router

export type TypedExpress<Contract extends AnyContract> = core.Express &
  TypedExtensionExpress<Contract>;

export type TypedRouter<Contract extends AnyContract> = core.Router &
  TypedExtensionRouter<Contract>;

type TypedExtensionCommon<Contract extends AnyContract> = {
  _contract: Contract;
  _tree: Map<string, Set<TypedRouter<AnyContract>>>;
  register(registry: OpenAPIRegistry, options?: RegistryOptions): void;
  openapi(config: OpenAPIObjectConfig): OpenAPIObject;
};

type TypedExtensionExpress<Contract extends AnyContract> =
  TypedExtensionCommon<Contract> & {
    t: {
      get<Path extends PathForMethod<Contract, "get"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "get", Path>[]
      ): TypedExpress<Contract>;
      post<Path extends PathForMethod<Contract, "post"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "post", Path>[]
      ): TypedExpress<Contract>;
      put<Path extends PathForMethod<Contract, "put"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "put", Path>[]
      ): TypedExpress<Contract>;
      patch<Path extends PathForMethod<Contract, "patch"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "patch", Path>[]
      ): TypedExpress<Contract>;
      delete<Path extends PathForMethod<Contract, "delete"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "delete", Path>[]
      ): TypedExpress<Contract>;
    };
  };

type TypedExtensionRouter<Contract extends AnyContract> =
  TypedExtensionCommon<Contract> & {
    t: {
      get<Path extends PathForMethod<Contract, "get"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "get", Path>[]
      ): TypedRouter<Contract>;
      post<Path extends PathForMethod<Contract, "post"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "post", Path>[]
      ): TypedRouter<Contract>;
      put<Path extends PathForMethod<Contract, "put"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "put", Path>[]
      ): TypedRouter<Contract>;
      patch<Path extends PathForMethod<Contract, "patch"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "patch", Path>[]
      ): TypedRouter<Contract>;
      delete<Path extends PathForMethod<Contract, "delete"> & AnyPath>(
        path: Path,
        ...handlers: RequestHandler<Contract, "delete", Path>[]
      ): TypedRouter<Contract>;
    };
  };

// OpenAPI

export type OpenAPIObject = ReturnType<OpenApiGeneratorV3["generateDocument"]>;

export type RegistryOptions = { prefix?: string };

export type OpenAPIObjectConfig = Parameters<
  OpenApiGeneratorV3["generateDocument"]
>[0] &
  RegistryOptions;

// Request handler

export type RequestHandler<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & AnyPath
> = BaseRequestHandler<
  PathParameters<Path>,
  RequestQuery<Contract, Method, Path>,
  RequestBody<Contract, Method, Path>,
  ResponseStatusCode<Contract, Method, Path>,
  ResponseBody<Contract, Method, Path>
>;

type BaseRequestHandler<
  Params,
  ReqQuery,
  ReqBody,
  StatusCode extends number,
  ResBody,
  LocalsObj extends Record<string, any> = Record<string, any>
> = (
  req: core.Request<Params, ResBody, ReqBody, ReqQuery, LocalsObj>,
  // core.RequestHandler doesn't have a generic for status code, hence BaseRequestHandler
  res: core.Response<ResBody, LocalsObj, StatusCode>,
  next: core.NextFunction
) => void | Promise<void>;

// Path parameters

export type PathParameters<Path extends string> =
  Path extends `${infer Required}{${infer Optional}}${infer Next}`
    ? ParsePathParameters<Required> &
        Partial<ParsePathParameters<Optional>> &
        PathParameters<Next>
    : ParsePathParameters<Path>;

type ParsePathParameters<Path extends string> = string extends Path
  ? ParamsDictionary
  : Path extends `${string}(${string}`
  ? ParamsDictionary
  : Path extends `${string}:${infer Rest}`
  ? (GetPathParameter<Rest> extends never
      ? ParamsDictionary
      : GetPathParameter<Rest> extends `${infer ParamName}?`
      ? { [P in ParamName]?: string }
      : { [P in GetPathParameter<Rest>]: string }) &
      (Rest extends `${GetPathParameter<Rest>}${infer Next}`
        ? PathParameters<Next>
        : unknown)
  : {};

type RemoveTail<
  Str extends string,
  Tail extends string
> = Str extends `${infer P}${Tail}` ? P : Str;

type GetPathParameter<Str extends string> = RemoveTail<
  RemoveTail<RemoveTail<Str, `/${string}`>, `-${string}`>,
  `.${string}`
>;

type ParamsDictionary = { [param: string]: string };

// Request query

export type RequestQuery<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & AnyPath
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["query"] extends z.AnyZodObject
    ? z.infer<Contract[Path][Method]["query"]>
    : never
  : never;

// Request body

export type RequestBody<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & AnyPath
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["body"] extends z.ZodTypeAny
    ? z.infer<Contract[Path][Method]["body"]>
    : never
  : never;

// Status codes

export type ResponseStatusCode<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & AnyPath
> = Contract[Path][Method] extends AnyConfig
  ? keyof Contract[Path][Method]["responses"] & number
  : never;

// Response body

export type ResponseBody<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & AnyPath
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["responses"] extends { [status: number]: infer R }
    ? R extends z.ZodTypeAny
      ? z.infer<R>
      : never
    : never
  : never;

// Inference

export type inferContract<Router extends TypedRouter<AnyContract>> =
  Router["_contract"];

export type inferHandler<
  Router extends TypedRouter<AnyContract>,
  Method extends AnyMethod,
  Path extends keyof inferContract<Router> & AnyPath
> = RequestHandler<inferContract<Router>, Method, Path>;

// Other

export type ValidationErrorBody = {
  queryErrors?: ZodIssue[];
  bodyErrors?: ZodIssue[];
};

export type PathForMethod<
  Contract extends AnyContract,
  Method extends AnyMethod
> = {
  [Path in keyof Contract]: Contract[Path & AnyPath][Method] extends AnyConfig
    ? Path
    : never;
}[keyof Contract];
