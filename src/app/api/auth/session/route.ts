import { getUser } from "@/lib/server/auth";
import { api, json } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(async () => {
    await throttle(request, "session", 120);
    return json({ user: await getUser(request) });
  });
}
