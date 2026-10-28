import { GET as renderCard } from "@/app/api/card/route";
import { cardPathQuery } from "@/lib/share-card";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ locale: string; handle: string; opponent: string }> },
) {
  const query = cardPathQuery(request.url, await params, true);
  const url = new URL("/api/card", request.url);
  url.search = query.toString();
  return renderCard(new Request(url, { headers: request.headers }));
}
