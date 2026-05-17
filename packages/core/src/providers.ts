import { z } from "zod";

/** API providers we support. Browser-safe; key-validators.ts is server-only. */
export const providerSchema = z.enum(["youtube", "brave", "anthropic"]);
export type Provider = z.infer<typeof providerSchema>;
