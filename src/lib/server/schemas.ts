import { z } from "zod";
import { estimateInputSchema, normalizeHandle } from "../estimate";

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((email) => email.toLowerCase());
export const handleSchema = z
  .string()
  .max(200)
  .transform((value, ctx) => {
    const handle = normalizeHandle(value);
    if (!handle) {
      ctx.addIssue({ code: "custom", message: "Invalid X handle." });
      return z.NEVER;
    }
    return handle;
  });
export const localeSchema = z.enum(["en", "lt"]).default("en");
export const reportSchema = z
  .object({
    handle: handleSchema,
    name: z.string().trim().min(1).max(80).optional(),
    input: estimateInputSchema,
    publish: z.boolean().default(false),
  })
  .strict();
export const sendCodeSchema = z
  .object({ email: emailSchema, locale: localeSchema })
  .strict();
export const verifyCodeSchema = z
  .object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) })
  .strict();
export const creatorProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    handle: handleSchema,
    bio: z.string().trim().max(500).default(""),
    location: z.string().trim().max(100).default("Vilnius, Lithuania"),
    niche: z.string().trim().max(100).default(""),
    rate: z.number().min(0).max(1_000_000).default(0),
    email: z.union([emailSchema, z.literal("")]).optional(),
    published: z.boolean().default(false),
    platform: z.enum(["x", "linkedin"]).default("x"),
    profileUrl: z.union([z.string().url().max(300), z.literal("")]).optional(),
  })
  .strict()
  .superRefine((profile, ctx) => {
    if (profile.platform === "linkedin" && profile.published)
      ctx.addIssue({
        code: "custom",
        path: ["published"],
        message: "LinkedIn profiles can only be saved as drafts.",
      });
    if (profile.profileUrl) {
      const url = new URL(profile.profileUrl);
      const allowed =
        profile.platform === "linkedin"
          ? ["linkedin.com", "www.linkedin.com"]
          : ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        !allowed.includes(url.hostname)
      )
        ctx.addIssue({
          code: "custom",
          path: ["profileUrl"],
          message: "Use an HTTPS profile URL for the selected platform.",
        });
    }
  });
export const creatorSchema = z
  .object({ profile: creatorProfileSchema })
  .strict();
export const bookingSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: emailSchema,
    company: z.string().trim().min(1).max(120),
    budget: z.union([
      z.number().min(0).max(1_000_000_000),
      z.string().trim().min(1).max(80),
    ]),
    message: z.string().trim().min(10).max(3_000),
    locale: localeSchema,
  })
  .strict();
