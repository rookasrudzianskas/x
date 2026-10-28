# Verification

Verified locally on 28 October 2026 with Node.js 24.22.1 and Next.js 16.4.3.

## Automated checks

- TypeScript, including generated Next.js route types: passed.
- ESLint: passed without warnings.
- Vitest: 58 tests passed across calculation, input validation, X sampling, report persistence, authentication and route security.
- Production build: passed.
- Production HTTP checks: calculator, report, comparison, creator, dashboard, brand and information routes returned 200 in both supported locale families. Unsupported locale and missing public creator profile returned 404. Robots, sitemap and PNG social-image endpoints returned their expected content types.

Security tests include cross-origin mutation rejection, body-size limits, OTP expiry and attempt limits, replay and concurrent verification, public/private profile boundaries, unique public handles and public-board filtering. X and email-provider tests use controlled responses; they do not represent live credential verification.

## Chrome checks

- Compared the desktop typography, blue palette, calculator composition, report card and creator landing with the public reference.
- Inspected Lithuanian calculator and brand layouts at 390 × 844, and desktop layouts at 1554 × 825.
- Invalid handle validation and the unavailable-X/manual-entry path work.
- A manual report with 2,000 median impressions, €10 CPM and one sponsored post per week persisted and reloaded: €20 per post, €1,040 per year, €87 rounded monthly, and €3,942 rounded five-year value.
- Copy-link feedback works. The 1200 × 750 report PNG downloaded and was visually inspected.
- Comparison preserved the saved report ID and its numbers when switching from English to Lithuanian.
- Recent/top sorting and pagination loaded the expected example rows.
- Localized help opens and closes by keyboard.
- Creator setup, nested login dialog, local draft save, dashboard reload, HTML media-kit download and JSON export work. Missing email configuration displays an explicit error.
- The Lithuanian campaign planner computed €900 for three creators, two posts each and €150 per post. A local test inquiry returned a saved confirmation and request ID.
- Generated social preview PNGs render the local skyline, display font and report illustration.

## Boundaries

Live X lookup and real email delivery require the owner's credentials and have not been exercised against production accounts. No payment, real campaign, WhatsApp or appointment transaction was attempted. The original private marketplace was inaccessible and is outside the implemented parity claim. See the README for the exact implementation scope and deployment configuration.

The browser used for visual inspection had translation and other user extensions enabled. A development hydration warning was traced to extension-injected HTML attributes; the application production build and route checks passed.
