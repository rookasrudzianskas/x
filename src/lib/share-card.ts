import { z } from "zod";
import { normalizeHandle } from "./estimate";
import { normalizeHandleSegment } from "./handle-route";
import fontCharacters from "./card-font-characters.json";
import { firstQueryValue, reportIdSchema } from "./report-query";
const supportedGlyphs = new Set(fontCharacters);

const handle = z.string().transform((value, context) => {
  const normalized = normalizeHandle(value);
  if (!normalized) {
    context.addIssue({ code: "custom", message: "Invalid X handle." });
    return z.NEVER;
  }
  return normalized;
});

export const cardQuerySchema = z
  .object({
    lang: z.enum(["en", "lt"]).default("en"),
    handle: handle.optional(),
    compare: handle.optional(),
    report: reportIdSchema.optional(),
    otherReport: reportIdSchema.optional(),
    format: z.enum(["social", "download"]).default("social"),
    page: z
      .enum([
        "worth",
        "creators",
        "brands",
        "methodology",
        "privacy",
        "terms",
        "dashboard",
      ])
      .default("worth"),
  })
  .superRefine((query, context) => {
    if ((query.report || query.compare) && !query.handle) {
      context.addIssue({
        code: "custom",
        path: ["handle"],
        message: "A primary handle is required.",
      });
    }
    if (query.otherReport && !query.compare) {
      context.addIssue({
        code: "custom",
        path: ["compare"],
        message: "A comparison handle is required.",
      });
    }
    if (
      query.compare &&
      query.handle?.toLowerCase() === query.compare.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        path: ["compare"],
        message: "Choose a different account.",
      });
    }
  });

export function parseCardQuery(params: URLSearchParams) {
  return cardQuerySchema.parse(
    Object.fromEntries(
      [...new Set(params.keys())].map((key) => [
        key,
        firstQueryValue(params, key),
      ]),
    ),
  );
}

export function cardPathQuery(
  requestUrl: string,
  params: { locale: string; handle: string; opponent?: string },
  download: boolean,
) {
  const incoming = new URL(requestUrl).searchParams;
  const result = new URLSearchParams({
    lang: params.locale,
    handle: normalizeHandleSegment(params.handle) || params.handle,
    format: download ? "download" : "social",
  });
  if (params.opponent)
    result.set(
      "compare",
      normalizeHandleSegment(params.opponent) || params.opponent,
    );
  for (const key of ["report", "otherReport"]) {
    const value = firstQueryValue(incoming, key);
    if (value !== undefined) result.set(key, value);
  }
  return result;
}

export function shortenCardText(text: string, maximum: number) {
  const parts = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ].map((part) => part.segment);
  return parts.length <= maximum
    ? text
    : `${parts.slice(0, maximum - 1).join("")}…`;
}

/** ImageResponse must remain offline: unsupported name glyphs otherwise trigger font/emoji CDN fetches. */
export function supportedCardName(text: string, handle: string) {
  const parts = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      text.normalize("NFC"),
    ),
  ];
  const supported = parts
    .filter(
      ({ segment }) =>
        !/\p{Extended_Pictographic}/u.test(segment) &&
        [...segment].every((character) => supportedGlyphs.has(character)),
    )
    .map(({ segment }) => segment)
    .join("")
    .trim();
  return supported || `@${handle}`;
}
