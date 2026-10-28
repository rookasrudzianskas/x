import { z } from "zod";

type QuerySource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

/** Use the first supplied value, including an empty or invalid value. */
export function firstQueryValue(
  source: QuerySource,
  key: string,
): string | undefined {
  if ("get" in source && typeof source.get === "function") {
    return source.get(key) ?? undefined;
  }
  const value = (source as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
}

export const reportIdSchema = z.uuid();

export function isValidReportId(value: string): boolean {
  return reportIdSchema.safeParse(value).success;
}
