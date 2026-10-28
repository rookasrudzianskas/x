/* Satori renders these image elements to PNG; they are not browser <img> elements. */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sampleReport, type Report } from "@/lib/profiles";
import { normalizeHandle } from "@/lib/estimate";
import { findReport } from "@/lib/server/reports";
import { api, ApiError } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { localizeProfileName } from "@/lib/i18n";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let assets: Promise<[Buffer, Buffer, Buffer]> | undefined;
function getAssets() {
  return (assets ??= Promise.all([
    readFile(path.join(process.cwd(), "public/reference/new-pixel-static.ttf")),
    readFile(path.join(process.cwd(), "public/vilnius-skyline.svg")),
    readFile(path.join(process.cwd(), "public/card-illustration.png")),
  ]));
}

export async function GET(request: Request) {
  return api(async () => {
    await throttle(request, "card", 60);
    const url = new URL(request.url);
    const locale = url.searchParams.get("lang") === "lt" ? "lt" : "en";
    const handle = normalizeHandle(url.searchParams.get("handle") || "");
    const reportId = url.searchParams.get("report");
    let report: Report | null = handle ? sampleReport(handle) : null;
    if (reportId) {
      if (!uuid.test(reportId))
        throw new ApiError(400, "invalid_report", "Invalid report.");
      report = await findReport(reportId);
      if (
        !report ||
        (handle && handle.toLowerCase() !== report.profile.handle.toLowerCase())
      )
        throw new ApiError(404, "not_found", "Report not found.");
    }
    const [font, skyline, figure] = await getAssets();
    const money = (value: number) =>
      new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value);
    const title = report
      ? localizeProfileName(report.profile.name, report.profile.source, locale)
      : locale === "lt"
        ? "Tavo balsas Vilniuje."
        : "Your voice in Vilnius.";
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0033ff",
          color: "#fff",
          padding: "42px 62px",
          border: "14px solid white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 40,
            left: 62,
            right: 62,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 28 }}>{title}</span>
          <span style={{ fontFamily: "Pixel", fontSize: 40 }}>
            unfair · Vilnius
          </span>
        </div>
        {report ? (
          <>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 90,
                left: 62,
                fontSize: 21,
                color: "#b5c3ff",
              }}
            >
              @{report.profile.handle}
            </div>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 160,
                left: 62,
                fontSize: 22,
                maxWidth: 700,
              }}
            >
              {locale === "lt"
                ? "Pavyzdinė penkerių metų reklaminė vertė"
                : "Illustrative five-year sponsorship value"}
            </div>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 200,
                left: 62,
                fontFamily: "Pixel",
                fontSize: 110,
              }}
            >
              {money(report.estimate.worth)}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                right: 62,
                top: 300,
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontFamily: "Pixel", fontSize: 74 }}>
                {money(report.estimate.monthly)}
              </span>
              <span style={{ fontSize: 22 }}>
                {locale === "lt" ? "per mėnesį" : "per month"}
              </span>
            </div>
            <img
              src={`data:image/png;base64,${figure.toString("base64")}`}
              width={340}
              height={255}
              alt=""
              style={{
                position: "absolute",
                left: 430,
                top: 307,
                width: 340,
                height: 255,
              }}
            />
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 155,
                left: 62,
                fontFamily: "Pixel",
                fontSize: 86,
                lineHeight: 1,
                maxWidth: 1000,
              }}
            >
              {locale === "lt"
                ? "Kiek €€€ galėtum uždirbti su savo X paskyra?"
                : "How much €€€ could you earn with your X account?"}
            </div>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 365,
                left: 62,
                fontSize: 24,
                color: "#c9d1ff",
              }}
            >
              {locale === "lt"
                ? "Skaidrios prielaidos. Pasaulinė auditorija."
                : "Transparent assumptions. An audience without borders."}
            </div>
          </>
        )}
        <img
          src={`data:image/svg+xml;base64,${skyline.toString("base64")}`}
          width={1172}
          height={163}
          alt=""
          style={{
            position: "absolute",
            left: 0,
            top: 439,
            width: 1172,
            height: 163,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 50,
            right: 50,
            bottom: 20,
            justifyContent: "space-between",
            fontSize: 17,
          }}
        >
          <span>VILNIUS, LITHUANIA · EUR</span>
          <span>
            {locale === "lt"
              ? "Pavyzdinis skaičiavimas, ne garantuotos pajamos"
              : "Illustrative estimate, not guaranteed income"}
          </span>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [{ name: "Pixel", data: font, weight: 400, style: "normal" }],
        headers: { "Cache-Control": "public, max-age=3600" },
      },
    );
  });
}
