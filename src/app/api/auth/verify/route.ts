import {
  api,
  ApiError,
  json,
  readJson,
  requireSameOrigin,
} from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { verifyCodeSchema } from "@/lib/server/schemas";
import { consumeOtp } from "@/lib/server/otp";
import { createSession } from "@/lib/server/auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "verify-code", 30);
    const { email, code } = await readJson(request, verifyCodeSchema);
    if (!(await consumeOtp(email, code)))
      throw new ApiError(
        400,
        "invalid_code",
        "That code is invalid or expired. Request a new code.",
      );
    const response = json({});
    const user = await createSession(email, request, response);
    const result = json({ user });
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
    return result;
  });
}
