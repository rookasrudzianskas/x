import { randomUUID } from "node:crypto";
import { api, json, readJson, requireSameOrigin } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { rateLimit, throttle } from "@/lib/server/rate-limit";
import { bookingSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "booking", 10, 60 * 60_000);
    const booking = await readJson(request, bookingSchema);
    await rateLimit(`booking-email:${booking.email}`, 3, 60 * 60_000);
    const id = randomUUID();
    await (
      await getDatabase()
    ).execute({
      sql: "INSERT INTO booking_requests(id,request_json,created_at) VALUES(?,?,?)",
      args: [id, JSON.stringify(booking), Date.now()],
    });
    return json({ ok: true, id }, 201);
  });
}
