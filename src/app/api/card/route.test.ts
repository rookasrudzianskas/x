import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/rate-limit", () => ({ throttle: vi.fn() }));
vi.mock("@/lib/server/reports", () => ({ findReport: vi.fn() }));
vi.mock("@/lib/server/x", () => ({ lookupXProfile: vi.fn() }));

import { GET } from "./route";
import { findReport } from "@/lib/server/reports";
import { lookupXProfile } from "@/lib/server/x";
import { throttle } from "@/lib/server/rate-limit";
import { sampleReport, type Report } from "@/lib/profiles";

const reportId = "6984c853-1944-46e0-913f-d9e44a55b694";
const otherReportId = "550e8400-e29b-41d4-a716-446655440000";
const offlineFetch = vi.fn<typeof fetch>(async () => {
  throw new Error("Image rendering must not call an external service.");
});

function request(query: string | URLSearchParams) {
  return new Request(`https://worth.example/api/card?${query}`);
}

function manualReport(name: string, handle = "zivile", id = reportId): Report {
  const example = sampleReport("demo_milda")!;
  return {
    ...example,
    id,
    profile: { ...example.profile, handle, name, source: "manual" },
  };
}

async function expectPng(response: Response, height: number) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("image/png");
  const png = Buffer.from(await response.arrayBuffer());
  expect(png.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  expect(png.toString("ascii", 12, 16)).toBe("IHDR");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(height);
  expect(png.toString("ascii", png.length - 8, png.length - 4)).toBe("IEND");
  expect(png.length).toBeGreaterThan(10_000);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(throttle).mockResolvedValue(undefined);
  vi.mocked(findReport).mockResolvedValue(null);
  vi.mocked(lookupXProfile).mockRejectedValue(
    new Error("Unexpected live profile lookup."),
  );
  vi.stubGlobal("fetch", offlineFetch);
});

afterEach(() => {
  // Yoga may try an embedded data: WASM URL before using its local fallback.
  // Every fetch throws, and no HTTP request is allowed, even if Satori catches it.
  const externalRequests = offlineFetch.mock.calls
    .map(([input]) =>
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    )
    .filter((url) => !url.startsWith("data:"));
  vi.unstubAllGlobals();
  expect(externalRequests).toEqual([]);
});

describe("share card route with real offline ImageResponse rendering", () => {
  it.each(["en", "lt"])(
    "renders a normalized sample account in %s using local assets",
    async (locale) => {
      const response = await GET(
        request(new URLSearchParams({ handle: "@demo_milda", lang: locale })),
      );
      expect(response.headers.get("cache-control")).toBe("public, max-age=900");
      await expectPng(response, 630);
      expect(findReport).not.toHaveBeenCalled();
      expect(lookupXProfile).not.toHaveBeenCalled();
    },
  );

  it("renders a Lithuanian comparison as a downloadable 1200 × 750 PNG", async () => {
    const response = await GET(
      request("handle=demo_milda&compare=demo_tomas&lang=lt&format=download"),
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="vilnius-worth-demo_milda-vs-demo_tomas.png"',
    );
    await expectPng(response, 750);
    expect(lookupXProfile).not.toHaveBeenCalled();
  });

  it.each(["Živilė 👩‍💻", "👩‍💻你好"])(
    "renders the valid manual name %j without font or emoji CDN requests",
    async (name) => {
      vi.mocked(findReport).mockResolvedValue(manualReport(name));
      const response = await GET(
        request(`handle=zivile&report=${reportId}&lang=lt`),
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      await expectPng(response, 630);
      expect(findReport).toHaveBeenCalledExactlyOnceWith(reportId);
      expect(lookupXProfile).not.toHaveBeenCalled();
    },
  );

  it("keeps both saved comparison identities private and uses the first duplicate ID", async () => {
    vi.mocked(findReport).mockImplementation(async (id) => {
      if (id === reportId) return manualReport("Živilė 👩‍💻");
      if (id === otherReportId)
        return manualReport("Ąžuolas", "azuolas", otherReportId);
      return null;
    });
    const response = await GET(
      request(
        `handle=zivile&compare=azuolas&report=${reportId}&report=invalid&otherReport=${otherReportId}&format=download`,
      ),
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expectPng(response, 750);
    expect(vi.mocked(findReport).mock.calls).toEqual([
      [reportId],
      [otherReportId],
    ]);
    expect(lookupXProfile).not.toHaveBeenCalled();
  });

  it("renders a live profile supplied by the lookup without making a provider call", async () => {
    const profile = {
      ...manualReport("Živilė 👩‍💻").profile,
      source: "x" as const,
    };
    vi.mocked(lookupXProfile).mockResolvedValue(profile);
    const response = await GET(request("handle=zivile&lang=lt"));
    await expectPng(response, 630);
    expect(lookupXProfile).toHaveBeenCalledExactlyOnceWith("zivile");
    expect(findReport).not.toHaveBeenCalled();
  });

  it.each(["missing", "mismatched"])(
    "returns 404 for a %s saved report without falling back to a sample or X",
    async (kind) => {
      vi.mocked(findReport).mockResolvedValue(
        kind === "missing" ? null : manualReport("Other creator"),
      );
      const response = await GET(
        request(`handle=demo_milda&report=${reportId}`),
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ code: "not_found" });
      expect(lookupXProfile).not.toHaveBeenCalled();
    },
  );

  it("rejects a saved comparison report belonging to another handle", async () => {
    vi.mocked(findReport).mockResolvedValue(manualReport("Other creator"));
    const response = await GET(
      request(`handle=demo_milda&compare=demo_tomas&otherReport=${reportId}`),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "not_found" });
    expect(lookupXProfile).not.toHaveBeenCalled();
  });

  it.each([
    "handle=demo_milda&report=invalid",
    "handle=demo_milda&report=",
    `handle=demo_milda&report=invalid&report=${reportId}`,
    `handle=demo_milda&report=&report=${reportId}`,
    "handle=demo_milda&compare=demo_tomas&otherReport=invalid",
    "handle=demo_milda&compare=%40DEMO_MILDA",
  ])("rejects invalid image identity before any lookup: %s", async (query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ code: "validation_error" });
    expect(findReport).not.toHaveBeenCalled();
    expect(lookupXProfile).not.toHaveBeenCalled();
  });
});
