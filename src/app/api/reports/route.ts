import { api, json, readJson, requireSameOrigin } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { saveReport } from "@/lib/server/reports";
import { reportSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    await throttle(request, "reports", 20);
    const report = await saveReport(await readJson(request, reportSchema));
    return json({ report }, 201);
  });
}
