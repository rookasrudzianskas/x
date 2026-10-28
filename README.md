# Vilnius Worth

A close visual recreation of the public [Unfair creator-worth experience](https://creators.unfair.so/worth), adapted to Vilnius, Lithuania. English and Lithuanian, EUR calculations, a custom pixel Vilnius skyline, creator media kits, comparisons and downloadable report cards.

## Run

Use **Node.js 24 LTS** (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The root redirects to `/en/worth`; Lithuanian lives at `/lt/worth`. SQLite storage is created on demand in the ignored `data/` directory. No credentials are needed for the example profiles, manual calculator, persistent reports, local creator drafts, budget planning or saved booking requests.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Stack

- Next.js **16.4.3**, App Router and Turbopack
- React **19.3.1**, TypeScript, Zod validation
- Custom responsive CSS and locally hosted reference fonts
- libSQL: local SQLite for development, optional remote Turso database
- Vitest for calculation, validation, authentication and persistence tests
- Optional X API for real public metrics; optional Resend for email-code authentication
- GitHub Actions runs types, lint, tests and the production build

Checks and browser walkthroughs are recorded in [`docs/VERIFICATION.md`](docs/VERIFICATION.md). Asset provenance and the illustration-edit prompt are in [`docs/ASSETS.md`](docs/ASSETS.md).

## Pages and behavior

| Path                                 | Behavior                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `/{en,lt}/worth`                     | Calculator, recent/top board, paginated examples, brand section, help      |
| `/{en,lt}/worth/:handle`             | Report, editable assumptions, chart, methodology, PNG download, share/copy |
| `/{en,lt}/worth/:handle/vs/:other`   | Comparison                                                                 |
| `/{en,lt}/creators`                  | Creator landing and setup; X and local LinkedIn media-kit drafts           |
| `/{en,lt}/creators/:handle`          | Published creator profile or prefilled setup                               |
| `/{en,lt}/dashboard`                 | Creator draft management and account controls                              |
| `/{en,lt}/brands`                    | Campaign budget planner and saved booking inquiry                          |
| `/{en,lt}/methodology`               | Formula, data provenance, city/currency sources                            |
| `/{en,lt}/privacy`, `/{en,lt}/terms` | Accurate application information                                           |

Manual reports are unlisted by default. The creator explicitly chooses whether to add a report to the public board. Anyone with a report URL can open it; do not place private information in a report. Sample profiles are fictional and are always labelled. No fake payout totals, customer claims, audience verification or paid campaigns are presented as real.

## Calculation

```text
per post = median impressions / 1,000 × chosen CPM in EUR
annual = per post × sponsored posts per week × 52
monthly = annual / 12
five-year value = Σ annual / 1.1^year, for years 1…5
```

The default €10 CPM and ±50% CPM scenarios are illustrative, editable assumptions, not verified Vilnius market rates. Followers provide context. The result models gross sponsorship revenue assuming each selected slot sells; it is not an account sale price, an offer, guaranteed income, or X revenue-sharing income. See the in-app methodology page.

## Connect real services

Copy `.env.example` to `.env.local` and provide only the services you use. Never commit `.env.local`.

| Variable              | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Actual application origin, used for origin checks and links            |
| `DATABASE_URL`        | `file:./data/worth.db` locally, or a persistent `libsql://…` database  |
| `DATABASE_AUTH_TOKEN` | Remote database credential, server-only                                |
| `X_API_BEARER_TOKEN`  | Approved X API access for public profiles and original-post metrics    |
| `AUTH_SECRET`         | Random secret of at least 32 characters for OTP hashing                |
| `RESEND_API_KEY`      | Transactional email provider credential                                |
| `EMAIL_FROM`          | Sender on your verified email domain                                   |
| `TRUST_PROXY`         | Set `1` only behind a trusted proxy that replaces forwarded IP headers |

Without X credentials, unknown handles lead to manual entry. No metrics are invented from a handle. Live lookups sample up to 100 original posts from the previous 30 days and disclose the usable sample size. Private X metrics and OAuth-based ownership verification are not implemented.

Without email configuration, sign-in clearly reports that it is unavailable; local creator drafts still work. Configured email sign-in uses expiring, hashed, single-use codes, persistent rate limits, limited attempts and HTTP-only sessions. Email authentication does **not** verify an X handle. Public creator profiles remain explicitly unverified. LinkedIn is a local media-kit draft flow, not a live LinkedIn integration.

Booking requests are saved in the database. This is an inquiry record, not an appointment booking or a sent email. An operator can connect an actual scheduling service separately. The application does not process payments, send WhatsApp messages, run campaigns or provide a staffed support service.

## Deploy

This is a standard Node.js Next.js app; deploy to a compatible Next.js host. Set `NEXT_PUBLIC_APP_URL` to its HTTPS origin. **Use a persistent remote libSQL database on ephemeral/serverless hosts**; the default local SQLite file is intended for local development or a server with a persistent disk. Configure email/X only when those integrations are needed.

Before operating a public service, add the operator’s actual contact details and retention/deletion process to the privacy information. Third-party asset licensing should be resolved by the project owner before commercial redistribution. No deployment was implicitly tied to the original site’s private services.

## Scope and provenance

The public calculator, report, comparison and creator landing were inspected in Chrome and via their public assets. The original private marketplace, messaging, payment and campaign administration could not be inspected without an account; this project does not claim to reproduce those private systems. It uses an independent transparent model because the original coefficients and growth rules are private and its USD rates are not a verified Vilnius benchmark.

The display font, body-font subsets and original skyline reference were obtained from public reference assets; their sources and ownership are recorded in [`public/reference/SOURCES.txt`](public/reference/SOURCES.txt). The Vilnius skyline is authored for this project. This adaptation is independent of unfair.so and X.

Primary local-data sources: [Lithuania and the euro](https://economy-finance.ec.europa.eu/euro/eu-countries-and-euro/lithuania-and-euro_en), [Gediminas’ Tower](https://www.govilnius.lt/visit-vilnius/places/the-gediminas-tower), [Three Crosses](https://www.govilnius.lt/visit-vilnius/places/the-hill-of-three-crosses), [Cathedral Bell Tower](https://www.govilnius.lt/visit-vilnius/places/vilnius-cathedral-bell-tower), [TV Tower](https://www.govilnius.lt/visit-vilnius/places/television-tower), [X public metrics](https://docs.x.com/x-api/fundamentals/metrics).
