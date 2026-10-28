import { z } from "zod";
import { api, json } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { getBoard } from "@/lib/server/reports";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(async () => {
    await throttle(request, "board", 120);
    const query = new URL(request.url).searchParams;
    const sort = z.enum(["recent", "top"]).parse(query.get("sort") || "recent");
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(query.get("limit") || 8);
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100_000)
      .parse(query.get("offset") || 0);
    return json(await getBoard(sort, limit, offset));
  });
}
