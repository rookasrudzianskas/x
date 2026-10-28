import { api, json, readJson, requireSameOrigin } from "@/lib/server/http";
import { rateLimit, throttle } from "@/lib/server/rate-limit";
import { sendCodeSchema } from "@/lib/server/schemas";
import { generateOtp, storeOtp } from "@/lib/server/otp";
import { requireEmailConfiguration, sendOtpEmail } from "@/lib/server/email";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    requireEmailConfiguration();
    await throttle(request, "send-code", 12, 60 * 60_000);
    const { email, locale } = await readJson(request, sendCodeSchema);
    await rateLimit(`otp-cooldown:${email}`, 1, 60_000);
    await rateLimit(`otp-hour:${email}`, 3, 60 * 60_000);
    const challenge = generateOtp(email);
    await sendOtpEmail(email, challenge.code, locale);
    await storeOtp(email, challenge);
    return json({ ok: true, expiresIn: 600, retryAfter: 60 });
  });
}
