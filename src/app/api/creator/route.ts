import {
  api,
  ApiError,
  json,
  readJson,
  requireSameOrigin,
} from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";
import { rateLimit, throttle } from "@/lib/server/rate-limit";
import { creatorSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(async () => {
    await throttle(request, "creator-read", 120);
    const user = await requireUser(request);
    const result = await (
      await getDatabase()
    ).execute({
      sql: "SELECT profile_json FROM creator_profiles WHERE user_id=?",
      args: [user.id],
    });
    return json({
      profile: result.rows[0]
        ? {
            ...JSON.parse(String(result.rows[0].profile_json)),
            handleVerified: false,
          }
        : null,
    });
  });
}

export async function PUT(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "creator-write", 60);
    const user = await requireUser(request);
    await rateLimit(`creator-write:${user.id}`, 20, 60_000);
    const parsed = await readJson(request, creatorSchema);
    const profile = { ...parsed.profile, handleVerified: false };
    const tx = await (await getDatabase()).transaction("write");
    try {
      if (profile.published) {
        const existing = await tx.execute({
          sql: "SELECT user_id FROM creator_public_handles WHERE handle_key=?",
          args: [profile.handle.toLowerCase()],
        });
        if (existing.rows[0] && String(existing.rows[0].user_id) !== user.id)
          throw new ApiError(
            409,
            "handle_unavailable",
            "That public profile address is already in use. This does not establish ownership of an X account.",
          );
      }
      await tx.execute({
        sql: "DELETE FROM creator_public_handles WHERE user_id=?",
        args: [user.id],
      });
      if (profile.published)
        await tx.execute({
          sql: "INSERT INTO creator_public_handles(handle_key,user_id) VALUES(?,?)",
          args: [profile.handle.toLowerCase(), user.id],
        });
      await tx.execute({
        sql: "INSERT INTO creator_profiles(user_id,profile_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=excluded.updated_at",
        args: [user.id, JSON.stringify(profile), Date.now()],
      });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    return json({ profile });
  });
}

export async function DELETE(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "creator-delete", 10);
    const user = await requireUser(request);
    await (
      await getDatabase()
    ).batch(
      [
        {
          sql: "DELETE FROM creator_public_handles WHERE user_id=?",
          args: [user.id],
        },
        {
          sql: "DELETE FROM creator_profiles WHERE user_id=?",
          args: [user.id],
        },
      ],
      "write",
    );
    return json({ ok: true });
  });
}
