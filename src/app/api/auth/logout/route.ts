import { logout } from "@/lib/server/auth";
import { api, json, requireSameOrigin } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "logout", 30);
    const response = json({ ok: true });
    await logout(request, response);
    return response;
  });
}
