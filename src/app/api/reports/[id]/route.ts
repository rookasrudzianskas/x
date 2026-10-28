import { z } from "zod";
import { api, ApiError, json } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { findReport } from "@/lib/server/reports";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    await throttle(request, "report-read", 120);
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const report = await findReport(id);
    if (!report)
      throw new ApiError(404, "not_found", "This report was not found.");
    return json({ report });
  });
}
