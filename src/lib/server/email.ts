import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError } from "./http";
import { authSecret } from "./otp";

export function requireEmailConfiguration() {
  authSecret();
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new ApiError(
      503,
      "not_configured",
      "Email sign-in is not configured yet.",
    );
}

export async function sendOtpEmail(
  email: string,
  code: string,
  locale: "en" | "lt",
) {
  requireEmailConfiguration();
  const lt = locale === "lt";
  const subject = lt
    ? "Tavo prisijungimo prie Vilnius Worth kodas"
    : "Your Vilnius Worth sign-in code";
  const description = lt
    ? "Įvesk šį kodą, kad prisijungtum prie Vilnius Worth. Kodas galioja 10 minučių."
    : "Enter this code to sign in to Vilnius Worth. It expires in 10 minutes.";
  const footer = lt
    ? "Jei neprašei šio kodo, gali ignoruoti šį laišką. Niekam neatskleisk prisijungimo kodo."
    : "If you did not request this code, you can ignore this email. Never share your sign-in code.";
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `otp-${randomUUID()}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject,
        text: `${description}\n\n${code}\n\n${footer}`,
        html: `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head><body style="margin:0;padding:32px 20px;background:#f6f6fa;font:16px/1.6 Arial,sans-serif;color:#202020"><main style="max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px"><h1 style="font-size:24px">Vilnius Worth</h1><p>${description}</p><p style="font:32px/1.4 monospace;letter-spacing:8px;text-align:center;padding:20px;background:#f0f1ff">${code}</p><p style="font-size:14px;color:#555">${footer}</p></main></body></html>`,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ApiError(
      502,
      "email_failed",
      "We could not send the email. Please try again later.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      502,
      "email_failed",
      "We could not send the email. Please try again later.",
    );
  const receipt: unknown = await response.json().catch(() => null);
  if (
    !receipt ||
    typeof receipt !== "object" ||
    !("id" in receipt) ||
    typeof receipt.id !== "string" ||
    !receipt.id ||
    receipt.id.length > 200
  ) {
    throw new ApiError(
      502,
      "email_failed",
      "The email provider did not confirm the message. Please try again later.",
    );
  }
}
