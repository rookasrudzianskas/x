import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function api(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) {
      const response = json(
        { error: error.message, code: error.code },
        error.status,
      );
      if (error.retryAfter)
        response.headers.set("Retry-After", String(error.retryAfter));
      return response;
    }
    if (error instanceof z.ZodError)
      return json(
        {
          error: "Please check the supplied fields.",
          code: "validation_error",
          fields: error.issues.map((issue) => issue.path.join(".")),
        },
        400,
      );
    // Provider errors can contain credentials or personal data; do not return them.
    return json(
      {
        error: "The service is temporarily unavailable. Please try again.",
        code: "service_error",
      },
      503,
    );
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
    .origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new ApiError(
      403,
      "invalid_origin",
      "This request must come from this website.",
    );
  }
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const maximumBytes = 16_384;
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    throw new ApiError(415, "content_type", "Send JSON content.");
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maximumBytes)
    throw new ApiError(413, "body_too_large", "The request is too large.");
  if (!request.body)
    throw new ApiError(400, "invalid_json", "A JSON body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new ApiError(413, "body_too_large", "The request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "invalid_json", "The JSON body is invalid.");
  }
  return schema.parse(value);
}

/** Only trust forwarded addresses when the deployment proxy overwrites them. */
export function clientKey(request: Request): string {
  return process.env.TRUST_PROXY === "1"
    ? request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim()
        .slice(0, 80) || "shared"
    : "shared";
}
