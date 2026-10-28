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
import { LibsqlError } from "@libsql/client";

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
    try {
      await (
        await getDatabase()
      ).batch(
        [
          {
            sql: "DELETE FROM creator_public_handles WHERE user_id=?",
            args: [user.id],
          },
          ...(profile.published
            ? [
                {
                  sql: "INSERT INTO creator_public_handles(handle_key,user_id) VALUES(?,?)",
                  args: [profile.handle.toLowerCase(), user.id],
                },
              ]
            : []),
          {
            sql: "INSERT INTO creator_profiles(user_id,profile_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=excluded.updated_at",
            args: [user.id, JSON.stringify(profile), Date.now()],
          },
        ],
        "write",
      );
    } catch (error) {
      if (
        error instanceof LibsqlError &&
        error.code.startsWith("SQLITE_CONSTRAINT") &&
        /creator_public_handles/.test(error.message)
      ) {
        throw new ApiError(
          409,
          "handle_unavailable",
          "That public profile address is already in use. This does not establish ownership of an X account.",
        );
      }
      throw error;
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
