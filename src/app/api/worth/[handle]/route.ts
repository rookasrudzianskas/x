import { calculateEstimate } from "@/lib/estimate";
import { getSampleProfile } from "@/lib/profiles";
import { api, json } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { handleSchema } from "@/lib/server/schemas";
import { lookupXProfile } from "@/lib/server/x";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  return api(async () => {
    await throttle(request, "worth", 30);
    const handle = handleSchema.parse((await context.params).handle);
    const profile = getSampleProfile(handle) || (await lookupXProfile(handle));
    return json({ profile, estimate: calculateEstimate(profile.metrics) });
  });
}
