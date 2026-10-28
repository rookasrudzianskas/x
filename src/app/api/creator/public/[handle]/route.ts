import { api, ApiError, json } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { throttle } from "@/lib/server/rate-limit";
import { creatorProfileSchema, handleSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  return api(async () => {
    await throttle(request, "creator-public", 120);
    const handle = handleSchema.parse((await context.params).handle);
    const result = await (
      await getDatabase()
    ).execute({
      sql: "SELECT profile_json FROM creator_profiles JOIN creator_public_handles ON creator_profiles.user_id=creator_public_handles.user_id WHERE handle_key=?",
      args: [handle.toLowerCase()],
    });
    if (!result.rows[0])
      throw new ApiError(
        404,
        "not_found",
        "This public creator profile was not found.",
      );
    const parsed = JSON.parse(String(result.rows[0].profile_json));
    delete parsed.handleVerified;
    const profile = creatorProfileSchema.parse(parsed);
    if (!profile.published || profile.platform !== "x")
      throw new ApiError(
        404,
        "not_found",
        "This public creator profile was not found.",
      );
    // Explicit allowlist: email addresses and account IDs never leave this endpoint.
    return json({
      profile: {
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        location: profile.location,
        niche: profile.niche,
        rate: profile.rate,
        platform: profile.platform,
        published: true,
        handleVerified: false,
        ...(profile.offers ? { offers: profile.offers } : {}),
      },
    });
  });
}
