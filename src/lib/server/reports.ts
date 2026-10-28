import "server-only";
import { randomUUID } from "node:crypto";
import { calculateEstimate } from "../estimate";
import { SAMPLE_PROFILES, type CreatorProfile, type Report } from "../profiles";
import { getDatabase } from "./db";
import { reportSchema } from "./schemas";
import type { z } from "zod";

export async function saveReport(
  input: z.infer<typeof reportSchema>,
): Promise<Report> {
  const now = Date.now();
  const report: Report = {
    id: randomUUID(),
    profile: {
      handle: input.handle,
      name: input.name || `@${input.handle}`,
      bio: "",
      location: "Vilnius, Lithuania",
      color: "#1c2eff",
      metrics: input.input,
      source: "manual",
      updatedAt: new Date(now).toISOString(),
    },
    estimate: calculateEstimate(input.input),
  };
  await (
    await getDatabase()
  ).execute({
    sql: "INSERT INTO reports(id,handle,profile_json,estimate_json,published,created_at) VALUES(?,?,?,?,?,?)",
    args: [
      report.id,
      report.profile.handle.toLowerCase(),
      JSON.stringify(report.profile),
      JSON.stringify(report.estimate),
      input.publish ? 1 : 0,
      now,
    ],
  });
  return report;
}

export async function findReport(id: string): Promise<Report | null> {
  const result = await (
    await getDatabase()
  ).execute({
    sql: "SELECT id,profile_json,estimate_json FROM reports WHERE id=?",
    args: [id],
  });
  const row = result.rows[0];
  return row
    ? {
        id: String(row.id),
        profile: JSON.parse(String(row.profile_json)),
        estimate: JSON.parse(String(row.estimate_json)),
      }
    : null;
}

export async function getBoard(
  sort: "recent" | "top",
  limit: number,
  offset: number,
) {
  const result = await (
    await getDatabase()
  ).execute(`SELECT id, profile_json FROM (
    SELECT id, profile_json, ROW_NUMBER() OVER (PARTITION BY lower(handle) ORDER BY rowid DESC) AS rank
    FROM reports WHERE published=1
  ) WHERE rank=1`);
  const profiles = new Map<string, CreatorProfile>();
  for (const row of result.rows) {
    const profile = {
      ...JSON.parse(String(row.profile_json)),
      reportId: String(row.id),
    } as CreatorProfile;
    profiles.set(profile.handle.toLowerCase(), profile);
  }
  for (const profile of SAMPLE_PROFILES) {
    if (!profiles.has(profile.handle.toLowerCase()))
      profiles.set(profile.handle.toLowerCase(), profile);
  }
  const sorted = [...profiles.values()].sort((a, b) => {
    const difference =
      sort === "top"
        ? calculateEstimate(b.metrics).worth -
          calculateEstimate(a.metrics).worth
        : Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    return difference || a.handle.localeCompare(b.handle);
  });
  return {
    profiles: sorted.slice(offset, offset + limit),
    total: sorted.length,
  };
}
