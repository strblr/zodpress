import type { z } from "zod";

export function extendZodWithZodpress(zod: typeof z) {
  if (typeof zod.ZodType.prototype.contentType !== "undefined") {
    return;
  }

  zod.ZodType.prototype.contentType = function (contentType: string) {
    return new (this as any).constructor({
      ...this._def,
      _zodpress: { contentType }
    });
  };
}

declare module "zod" {
  interface ZodTypeDef {
    _zodpress?: {
      contentType?: string;
    };
  }

  interface ZodType<
    Output = any,
    Def extends ZodTypeDef = ZodTypeDef,
    Input = Output
  > {
    contentType(contentType: string): this;
  }
}
