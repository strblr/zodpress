import type { ZodIssue } from "zod";
import { isEmpty } from "./utils";

export class ValidationError extends Error {
  headersErrors?: ZodIssue[];
  paramsErrors?: ZodIssue[];
  queryErrors?: ZodIssue[];
  bodyErrors?: ZodIssue[];

  constructor() {
    super();
    this.name = "ValidationError";
  }

  isEmpty() {
    return (
      isEmpty(this.headersErrors) &&
      isEmpty(this.paramsErrors) &&
      isEmpty(this.queryErrors) &&
      isEmpty(this.bodyErrors)
    );
  }
}
