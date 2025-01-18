import type { ZodIssue } from "zod";
import { isEmpty } from "./utils";

export class ValidationError extends Error {
  type = "validation_error";
  headersErrors?: ZodIssue[];
  paramsErrors?: ZodIssue[];
  queryErrors?: ZodIssue[];
  bodyErrors?: ZodIssue[];

  constructor() {
    super("Zodpress validation error");
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
