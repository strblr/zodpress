import type * as core from "express-serve-static-core";
import type { z, ZodIssue } from "zod";
import type {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  RouteConfig
} from "@asteasolutions/zod-to-openapi";

// Contract

export type AnyMethod = "get" | "post" | "put" | "patch" | "delete";

export type AnyContract = {
  [path: string]: {
    [method in AnyMethod]?: AnyConfig;
  };
};

export interface AnyConfig {
  summary?: string;
  openapi?: Partial<RouteConfig>;
  query?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  contentType?: string;
  responses: {
    [status: number]: z.ZodTypeAny;
  };
}

// Express & Router

export interface ZodpressApp<Contract extends AnyContract>
  extends core.Express,
    Zodpress<Contract, ZodpressApp<Contract>> {}

export interface ZodpressRouter<Contract extends AnyContract>
  extends core.Router,
    Zodpress<Contract, ZodpressRouter<Contract>> {}

export interface ZodpressRoute<
  Contract extends AnyContract,
  _Path extends keyof Contract & string
> extends core.IRoute {}

export interface Zodpress<Contract extends AnyContract, ReturnType = any> {
  _contract: Contract;
  register(registry: OpenAPIRegistry, options?: RegistryOptions): void;
  openapi(config: OpenAPIObjectConfig): OpenAPIObject;
  z: {
    get<Path extends PathForMethod<Contract, "get"> & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "get", Path>[]
    ): ReturnType;
    post<Path extends PathForMethod<Contract, "post"> & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "post", Path>[]
    ): ReturnType;
    put<Path extends PathForMethod<Contract, "put"> & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "put", Path>[]
    ): ReturnType;
    patch<Path extends PathForMethod<Contract, "patch"> & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "patch", Path>[]
    ): ReturnType;
    delete<Path extends PathForMethod<Contract, "delete"> & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "delete", Path>[]
    ): ReturnType;
  };
}

// OpenAPI

export type OpenAPIObject = ReturnType<OpenApiGeneratorV3["generateDocument"]>;

export interface RegistryOptions {
  prefix?: string;
  tags?: string | string[];
}

export type OpenAPIObjectConfig = Parameters<
  OpenApiGeneratorV3["generateDocument"]
>[0] &
  RegistryOptions;

// Request handler

export type RequestHandler<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & string
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

type ParamsDictionary = never;

// Request query

export type RequestQuery<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & string
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["query"] extends z.AnyZodObject
    ? z.infer<Contract[Path][Method]["query"]>
    : never
  : never;

// Request body

export type RequestBody<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & string
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["body"] extends z.ZodTypeAny
    ? z.infer<Contract[Path][Method]["body"]>
    : never
  : never;

// Status codes

export type ResponseStatusCode<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & string
> = Contract[Path][Method] extends AnyConfig
  ? keyof Contract[Path][Method]["responses"] & number
  : never;

// Response body

export type ResponseBody<
  Contract extends AnyContract,
  Method extends AnyMethod,
  Path extends keyof Contract & string
> = Contract[Path][Method] extends AnyConfig
  ? Contract[Path][Method]["responses"] extends { [status: number]: infer R }
    ? R extends z.ZodTypeAny
      ? z.infer<R>
      : never
    : never
  : never;

// Inference

export type inferContract<Router extends Zodpress<{}>> = Router["_contract"];

export type inferHandler<
  Router extends Zodpress<{}>,
  Method extends AnyMethod,
  Path extends keyof inferContract<Router> & string
> = RequestHandler<inferContract<Router>, Method, Path>;

// Other

export interface ValidationError {
  queryErrors?: ZodIssue[];
  bodyErrors?: ZodIssue[];
}

export type PathForMethod<
  Contract extends AnyContract,
  Method extends AnyMethod
> = {
  [Path in keyof Contract]: Contract[Path & string][Method] extends AnyConfig
    ? Path
    : never;
}[keyof Contract];
