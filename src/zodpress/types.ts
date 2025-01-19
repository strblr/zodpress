import type * as core from "express-serve-static-core";
import type { z } from "zod";
import type {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  RouteConfig as OpenAPIRouteConfig
} from "@asteasolutions/zod-to-openapi";

// Contract

export type AnyMethod = "get" | "post" | "put" | "patch" | "delete";
export type AnyValidationErrorPolicy =
  | "send"
  | "forward"
  | "ignore"
  | core.ErrorRequestHandler;

export type AnyContract = {
  deprecated?: boolean;
  tags?: string | string[];
  validationErrorPolicy?: AnyValidationErrorPolicy;
  commonResponses?: {
    [status: number]: z.ZodTypeAny;
  };
} & {
  [method in AnyMethod]?: {
    [path: string]: AnyRouteConfig;
  };
};

export interface AnyRouteConfig {
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags?: string | string[];
  validationErrorPolicy?: AnyValidationErrorPolicy;
  openapi?: Partial<OpenAPIRouteConfig>;
  headers?: z.AnyZodObject;
  params?: z.AnyZodObject;
  query?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  responses?: {
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

export interface Zodpress<Contract extends AnyContract, ReturnType = any> {
  z: {
    contract: Contract;
    openapi(options?: OpenAPIRegisterOptions): OpenAPIFactory;
    register(registry: OpenAPIRegistry, options?: OpenAPIRegisterOptions): void;
    get<Path extends keyof Contract["get"] & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "get", Path>[]
    ): ReturnType;
    post<Path extends keyof Contract["post"] & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "post", Path>[]
    ): ReturnType;
    put<Path extends keyof Contract["put"] & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "put", Path>[]
    ): ReturnType;
    patch<Path extends keyof Contract["patch"] & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "patch", Path>[]
    ): ReturnType;
    delete<Path extends keyof Contract["delete"] & string>(
      path: Path,
      ...handlers: RequestHandler<Contract, "delete", Path>[]
    ): ReturnType;
  };
}

// OpenAPI

export interface OpenAPIRegisterOptions {
  pathPrefix?: string;
}

export type OpenAPIDocumentConfig = Parameters<
  OpenApiGeneratorV3["generateDocument"]
>[0];

export type OpenAPIDocument = ReturnType<
  OpenApiGeneratorV3["generateDocument"]
>;

export interface OpenAPIFactory {
  with(callback: (registry: OpenAPIRegistry) => void): OpenAPIFactory;
  generate(config: OpenAPIDocumentConfig): OpenAPIDocument;
}

// Request handler

export type RequestHandler<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = BaseRequestHandler<
  RequestHeaders<Contract, Method, Path>,
  RequestParams<Contract, Method, Path>,
  RequestQuery<Contract, Method, Path>,
  RequestBody<Contract, Method, Path>,
  ResponseMap<Contract, Method, Path>
>;

type BaseRequestHandler<
  Headers,
  Params,
  Query,
  Body,
  ResMap extends Record<number, any>
> = (
  req: BaseRequest<Headers, Params, Query, Body, ResMap>,
  res: BaseResponse<ResMap>,
  next: core.NextFunction
) => void | Promise<void>;

type BaseRequest<
  Headers,
  Params,
  Query,
  Body,
  ResMap extends Record<number, any>
> = Omit<core.Request<Params, ResponseBody<ResMap>, Body, Query>, "headers"> & {
  headers: Headers;
};

type BaseResponse<ResMap extends Record<number, any>> = Omit<
  core.Response<
    ResponseBody<ResMap>,
    Record<string, any>,
    ResponseCode<ResMap>
  >,
  "status"
> & {
  status<StatusCode extends Pretty<ResponseCode<ResMap>> & number>(
    code: StatusCode
  ): BaseResponse<Pick<ResMap, StatusCode>>;
};

// Headers

export type RequestHeaders<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = core.Request["headers"] &
  (Contract[Method][Path] extends {
    headers: infer Headers extends z.AnyZodObject;
  }
    ? z.infer<Headers>
    : {});

// Path parameters

export type RequestParams<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = Contract[Method][Path] extends {
  params: infer Params extends z.AnyZodObject;
}
  ? z.infer<Params>
  : RequestParamsStr<Path>;

type RequestParamsStr<Path extends string> =
  Path extends `${infer Required}{${infer Optional}}${infer Next}`
    ? ParseRequestParams<Required> &
        Partial<ParseRequestParams<Optional>> &
        RequestParamsStr<Next>
    : ParseRequestParams<Path>;

type ParseRequestParams<Path extends string> = string extends Path
  ? {}
  : Path extends `${string}(${string}`
  ? {}
  : Path extends `${string}:${infer Rest}`
  ? (GetPathParam<Rest> extends never
      ? {}
      : GetPathParam<Rest> extends `${infer ParamName}?`
      ? { [P in ParamName]?: string }
      : { [P in GetPathParam<Rest>]: string }) &
      (Rest extends `${GetPathParam<Rest>}${infer Next}`
        ? RequestParamsStr<Next>
        : unknown)
  : {};

type RemoveTail<
  Str extends string,
  Tail extends string
> = Str extends `${infer P}${Tail}` ? P : Str;

type GetPathParam<Str extends string> = RemoveTail<
  RemoveTail<RemoveTail<Str, `/${string}`>, `-${string}`>,
  `.${string}`
>;

// Request query

export type RequestQuery<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = Contract[Method][Path] extends {
  query: infer Query extends z.AnyZodObject;
}
  ? z.infer<Query>
  : never;

// Request body

export type RequestBody<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = Contract[Method][Path] extends { body: infer Body extends z.ZodTypeAny }
  ? z.infer<Body>
  : never;

// Response status code and body

export type ResponseMap<
  Contract extends AnyContract,
  Method extends keyof Contract & AnyMethod,
  Path extends keyof Contract[Method] & string
> = Assign<
  Contract extends {
    commonResponses: infer Responses extends Record<number, z.ZodTypeAny>;
  }
    ? { [R in keyof Responses & number]: z.infer<Responses[R]> }
    : {},
  Contract[Method][Path] extends {
    responses: infer Responses extends Record<number, z.ZodTypeAny>;
  }
    ? { [R in keyof Responses & number]: z.infer<Responses[R]> }
    : {}
>;

export type ResponseCode<ResponseMap extends Record<number, any>> =
  keyof ResponseMap & number;

export type ResponseBody<ResponseMap extends Record<number, any>> =
  ResponseMap[ResponseCode<ResponseMap>];

// Other

export type inferContract<Router extends Zodpress<AnyContract>> =
  Router["z"]["contract"];

export type inferHandler<
  Router extends Zodpress<AnyContract>,
  Method extends keyof inferContract<Router> & AnyMethod,
  Path extends keyof inferContract<Router>[Method] & string
> = RequestHandler<inferContract<Router>, Method, Path>;

type Pretty<T> = {
  [K in keyof T]: T[K];
};

type Assign<T extends object, U extends object> = Pretty<Omit<T, keyof U> & U>;
