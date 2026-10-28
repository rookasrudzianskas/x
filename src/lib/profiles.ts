import {
  calculateEstimate,
  type Estimate,
  type EstimateInput,
} from "./estimate";

export type CreatorProfile = {
  handle: string;
  name: string;
  bio: string;
  location: string;
  color: string;
  avatar?: string;
  metrics: EstimateInput;
  source: "sample" | "manual" | "x";
  updatedAt: string;
  sampleSize?: number;
  reportId?: string;
  topPost?: { id: string; text: string; views: number };
};

export type Report = {
  id: string;
  profile: CreatorProfile;
  estimate: Estimate;
};

// Fictional examples, never real claims about a person or a paid campaign.
const samples: [string, string, string, string, number, number][] = [
  [
    "demo_milda",
    "Milda · design",
    "Design, independent studios & life in Užupis.",
    "#d9a2a2",
    12400,
    6400,
  ],
  [
    "demo_tomas",
    "Tomas · tech",
    "Building products from Naujamiestis.",
    "#82a8bf",
    18600,
    9200,
  ],
  [
    "demo_ugne",
    "Ugnė · culture",
    "Art, books and little discoveries in the Old Town.",
    "#b9a2cf",
    8200,
    3700,
  ],
  [
    "demo_lukas",
    "Lukas · startups",
    "A founder's notebook from Vilnius.",
    "#d4ad77",
    24100,
    12000,
  ],
  [
    "demo_ieva",
    "Ieva · food",
    "Coffee, local kitchens and the taste of Vilnius.",
    "#9bbd98",
    15400,
    7800,
  ],
  [
    "demo_mantas",
    "Mantas · code",
    "Software, open source and Šnipiškės sunsets.",
    "#90a8d4",
    6700,
    2800,
  ],
  [
    "demo_ruta",
    "Rūta · city",
    "Slow walks, architecture and the Neris.",
    "#cf9caf",
    9800,
    5100,
  ],
  [
    "demo_jonas",
    "Jonas · product",
    "From a small idea to a useful product.",
    "#8ebdbd",
    21300,
    10800,
  ],
  [
    "demo_austeja",
    "Austėja · art",
    "Stories from the galleries of Vilnius.",
    "#b9ae85",
    5300,
    2400,
  ],
  [
    "demo_paulius",
    "Paulius · outdoors",
    "Green Vilnius, weekend walks and everyday cycling.",
    "#8fa58e",
    11700,
    5600,
  ],
  [
    "demo_emilija",
    "Emilija · ideas",
    "Creative work and conversations worth having.",
    "#c8a3d1",
    4200,
    1900,
  ],
  [
    "demo_domas",
    "Domas · digital",
    "Digital craft, local teams and global audiences.",
    "#b0b5c9",
    16700,
    8300,
  ],
];

export const SAMPLE_PROFILES: CreatorProfile[] = samples.map(
  ([handle, name, bio, color, followers, medianViews], index) => ({
    handle,
    name,
    bio,
    color,
    location: "Vilnius, Lithuania",
    source: "sample",
    metrics: { followers, medianViews, sponsoredPostsPerWeek: 1, cpm: 10 },
    updatedAt: new Date(Date.UTC(2026, 9, 28, 9, 30 - index)).toISOString(),
  }),
);

export function getSampleProfile(handle: string): CreatorProfile | undefined {
  return SAMPLE_PROFILES.find(
    (profile) => profile.handle.toLowerCase() === handle.toLowerCase(),
  );
}

export function sampleReport(handle: string): Report | null {
  const profile = getSampleProfile(handle);
  return profile
    ? {
        id: `sample-${profile.handle}`,
        profile,
        estimate: calculateEstimate(profile.metrics),
      }
    : null;
}
