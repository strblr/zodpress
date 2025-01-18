import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { extendZodWithZodpress } from "../zodpress/extension";

extendZodWithOpenApi(z);
extendZodWithZodpress(z);

export { z };
