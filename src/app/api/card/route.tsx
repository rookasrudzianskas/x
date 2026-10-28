/* Satori renders these image elements to PNG, outside the browser. */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sampleReport, type Report } from "@/lib/profiles";
import { calculateEstimate } from "@/lib/estimate";
import { findReport } from "@/lib/server/reports";
import { lookupXProfile } from "@/lib/server/x";
import { api, ApiError } from "@/lib/server/http";
import { throttle } from "@/lib/server/rate-limit";
import { getDictionary, localizeProfileName, money } from "@/lib/i18n";
import {
  parseCardQuery,
  shortenCardText,
  supportedCardName,
} from "@/lib/share-card";
import type { Locale } from "@/lib/locale";
import { pageCopy } from "@/lib/page-metadata";

export const runtime = "nodejs";
let assets: Promise<[Buffer, Buffer, Buffer, Buffer, Buffer]> | undefined;
function getAssets() {
  if (!assets) {
    assets = Promise.all([
      readFile(
        path.join(process.cwd(), "public/reference/new-pixel-static.ttf"),
      ),
      readFile(path.join(process.cwd(), "public/vilnius-skyline.svg")),
      readFile(path.join(process.cwd(), "public/card-illustration.png")),
      readFile(
        path.join(process.cwd(), "public/reference/inter-latin-static.ttf"),
      ),
      readFile(
        path.join(process.cwd(), "public/reference/inter-latin-ext-static.ttf"),
      ),
    ]).catch((error) => {
      assets = undefined;
      throw error;
    });
  }
  return assets;
}

async function resolveReport(
  handle?: string,
  id?: string,
): Promise<Report | null> {
  if (!handle) return null;
  if (id) {
    const report = await findReport(id);
    if (
      !report ||
      report.profile.handle.toLowerCase() !== handle.toLowerCase()
    ) {
      throw new ApiError(404, "not_found", "Report not found.");
    }
    return report;
  }
  const sample = sampleReport(handle);
  if (sample) return sample;
  const profile = await lookupXProfile(handle);
  return {
    id: `x-${profile.handle}`,
    profile,
    estimate: calculateEstimate(profile.metrics),
  };
}

function ReportValues({
  report,
  locale,
  compact = false,
}: {
  report: Report;
  locale: Locale;
  compact?: boolean;
}) {
  const t = getDictionary(locale);
  const worth = money(
    report.estimate.worth,
    locale,
    report.estimate.worth >= 100_000,
  );
  const monthly = money(
    report.estimate.monthly,
    locale,
    report.estimate.monthly >= 10_000,
  );
  const name = shortenCardText(
    supportedCardName(
      localizeProfileName(report.profile.name, report.profile.source, locale),
      report.profile.handle,
    ),
    compact ? 28 : 40,
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: compact ? 508 : 1050,
      }}
    >
      <div
        style={{
          fontSize: compact
            ? Math.min(30, 490 / [...name].length)
            : Math.min(36, 1000 / [...name].length),
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 21,
          color: "#c9d1ff",
          marginTop: 5,
        }}
      >{`@${report.profile.handle} · ${t[report.profile.source]}`}</div>
      <div
        style={{
          fontSize: compact ? 20 : 23,
          marginTop: 38,
          maxWidth: compact ? 480 : 900,
        }}
      >
        {t.reportWorth}
      </div>
      <div
        style={{
          fontFamily: "Pixel",
          fontSize: compact
            ? Math.min(84, 590 / worth.length)
            : Math.min(116, 1500 / worth.length),
          lineHeight: 1.1,
          marginTop: 8,
          whiteSpace: "nowrap",
        }}
      >
        {worth}
      </div>
      {compact && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginTop: 24,
          }}
        >
          <span
            style={{
              fontFamily: "Pixel",
              fontSize: Math.min(48, 570 / monthly.length),
              whiteSpace: "nowrap",
            }}
          >
            {monthly}
          </span>
          <span style={{ fontSize: 20 }}>{t.perMonth}</span>
        </div>
      )}
    </div>
  );
}

export async function GET(request: Request) {
  return api(async () => {
    await throttle(request, "card", 60);
    const query = parseCardQuery(new URL(request.url).searchParams);
    const {
      lang: locale,
      handle,
      compare,
      report: reportId,
      otherReport,
    } = query;
    const [report, opponent] = await Promise.all([
      resolveReport(handle, reportId),
      resolveReport(compare, otherReport),
    ]);
    const [font, skyline, figure, inter, interExt] = await getAssets();
    const isComparison = Boolean(report && opponent);
    const height = query.format === "download" ? 750 : 630;
    const t = getDictionary(locale);
    const [pageTitle, pageDescription] = pageCopy(query.page, locale);
    const monthly = report
      ? money(
          report.estimate.monthly,
          locale,
          report.estimate.monthly >= 10_000,
        )
      : "";
    const filename = `vilnius-worth${handle ? `-${handle}` : ""}${compare ? `-vs-${compare}` : ""}.png`;
    const response = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            fontFamily: "Inter, InterExt",
            background: "#0033ff",
            color: "white",
            border: "14px solid white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              display: "flex",
              left: 48,
              top: 35,
              fontSize: 27,
            }}
          >
            {isComparison
              ? locale === "lt"
                ? "Greta vienas kito."
                : "Side by side."
              : t.local}
          </div>
          <div
            style={{
              position: "absolute",
              display: "flex",
              left: 905,
              top: 28,
              width: 240,
              fontFamily: "Pixel",
              fontSize: 40,
            }}
          >
            unfair · Vilnius
          </div>
          <img
            src={`data:image/svg+xml;base64,${skyline.toString("base64")}`}
            alt=""
            width={1172}
            height={163}
            style={{
              position: "absolute",
              left: 0,
              top: height - 191,
              width: 1172,
              height: 163,
            }}
          />
          {report && !opponent && (
            <img
              src={`data:image/png;base64,${figure.toString("base64")}`}
              alt=""
              width={340}
              height={255}
              style={{
                position: "absolute",
                left: 420,
                top: height - 290,
                width: 340,
                height: 255,
              }}
            />
          )}
          {report ? (
            isComparison && opponent ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    left: 48,
                    top: 120,
                  }}
                >
                  <ReportValues report={report} locale={locale} compact />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 586,
                    top: 115,
                    height: height - 270,
                    width: 2,
                    background: "rgba(255,255,255,.35)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    left: 620,
                    top: 120,
                  }}
                >
                  <ReportValues report={opponent} locale={locale} compact />
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    left: 48,
                    top: 110,
                  }}
                >
                  <ReportValues report={report} locale={locale} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    left: 820,
                    width: 300,
                    top: height - 300,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Pixel",
                      fontSize: Math.min(76, 850 / monthly.length),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {monthly}
                  </span>
                  <span style={{ fontSize: 24 }}>{t.perMonth}</span>
                </div>
              </>
            )
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  display: "flex",
                  top: 155,
                  left: 48,
                  fontFamily: "Pixel",
                  fontSize: 86,
                  lineHeight: 1,
                  maxWidth: 1050,
                }}
              >
                {query.page === "worth"
                  ? locale === "lt"
                    ? "Kiek €€€ galėtum uždirbti su savo X paskyra?"
                    : "How much €€€ could you earn with your X account?"
                  : pageTitle}
              </div>
              <div
                style={{
                  position: "absolute",
                  display: "flex",
                  top: 365,
                  left: 48,
                  fontSize: 25,
                  lineHeight: 1.2,
                  maxWidth: 1030,
                  color: "#c9d1ff",
                }}
              >
                {query.page === "worth"
                  ? locale === "lt"
                    ? "Skaidrios prielaidos. Pasaulinė auditorija."
                    : "Transparent assumptions. An audience without borders."
                  : pageDescription}
              </div>
            </>
          )}
          <div
            style={{
              position: "absolute",
              display: "flex",
              left: 48,
              right: 48,
              top: height - 62,
              justifyContent: "space-between",
              fontSize: 18,
              background: "rgba(0,24,155,.82)",
              padding: "8px 12px",
            }}
          >
            <span>{t.local} · EUR</span>
            <span>
              {locale === "lt"
                ? "Pavyzdinis skaičiavimas, ne garantuotos pajamos"
                : "Illustrative estimate, not guaranteed income"}
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height,
        fonts: [
          { name: "Pixel", data: font, weight: 400, style: "normal" },
          { name: "Inter", data: inter, weight: 400, style: "normal" },
          { name: "InterExt", data: interExt, weight: 400, style: "normal" },
        ],
        headers: {
          "Cache-Control":
            reportId || otherReport
              ? "private, no-store"
              : "public, max-age=900",
          ...(query.format === "download"
            ? { "Content-Disposition": `attachment; filename="${filename}"` }
            : {}),
        },
      },
    );
    // Keep rendering inside the error boundary: failures should not produce corrupt PNG downloads.
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: response.headers,
    });
  });
}
