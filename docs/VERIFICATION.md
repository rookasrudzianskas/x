# Verification

Verified locally on 28 October 2026 with Node.js 24.22.1 and Next.js 16.4.3.

## Automated checks

- TypeScript, including generated Next.js route types: passed.
- ESLint: passed without warnings.
- Vitest: 272 tests passed across calculation, input validation, X sampling, report persistence, authentication, route security, offers, draft migration, exports, query identity, real PNG rendering and deployment configuration.
- Production build: passed.
- Production HTTP checks: calculator, report, comparison, creator, dashboard, brand and information routes returned 200 in both supported locale families. Unsupported locale and missing public creator profile returned 404. Robots, sitemap and PNG social-image endpoints returned their expected content types.

Security tests include cross-origin mutation rejection, body-size limits, OTP expiry and attempt limits, replay and concurrent verification, public/private profile boundaries, unique public handles and public-board filtering. X and email-provider tests use controlled responses; they do not represent live credential verification.

## Chrome checks for the initial release (`e97ab05`)

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

## Detailed follow-up verification

- Real single-report and comparison PNGs were rendered from both the development and production servers. English/Lithuanian labels, long names and maximum allowed monetary inputs were visually inspected in the resulting files.
- Sixteen image-route integration tests render actual PNGs with external fetches forbidden. They check PNG signatures, dimensions, complete image data, manual/live/sample cases, Unicode-name fallback, private cache headers and 400/404 boundaries.
- Duplicate report parameters consistently use the first value in the browser helper, metadata, path adapters and image API. Empty/malformed supplied IDs never silently substitute a sample. Both comparison IDs survive edits and sharing.
- Encoded `@` handle routes, same-account rejection and LinkedIn entry redirects were exercised over production HTTP.
- All five runtime assets (three fonts, skyline and illustration) are present in the production file traces for the API and all four image-route adapters.
- Tests cover standard/custom offers, decimal prices, corrupted/legacy drafts, localized HTML escaping, exported profile data, budget calculations, failed email resend, atomic OTP/session creation, concurrent publishing and failed-rename rollback.
- Production build, TypeScript and ESLint pass. Production route checks returned the expected HTML/PNG/status codes.

The browser-extension path continued reporting that local browser use was disabled in Work settings. Native Chrome control subsequently became available for the deployment below. The earlier mobile-layout evidence applies to the initial release; the new offer controls, comparison editing and dialog changes have automated coverage and code review, but are not claimed as mobile-browser-verified in this pass.

## Vercel preparation

- The Vercel-specific build runs an environment preflight; the ordinary local build still works without external services.
- Seventy preflight tests cover missing settings, secure remote database URLs, exact HTTPS app origins, proxy configuration, optional email consistency, native Turso variables, and diagnostics that do not disclose values.
- Fourteen database environment cases plus the existing initialization test verify explicit-pair precedence, Turso integration variables, no credential mixing and the unchanged local SQLite default.
- All 272 tests, ESLint, and the production build (including TypeScript) passed. The Vercel build command was exercised with non-secret fixture values and made no remote database connection; this does not verify a real hosted database.
- `.vercelignore` excludes local databases, environment files and local build artifacts from CLI uploads.

## Live Vercel deployment

Deployed on 28 October 2026 through the Vercel website in Chrome, using the existing GitHub connection for `rookasrudzianskas/x`, branch `main`, in the **boringai** team. No CLI login was used for deployment.

- Vercel marked deployment [`9V7FHS5bZzH1o1iMDgyNKHTBrhq2`](https://vercel.com/boringai/x/9V7FHS5bZzH1o1iMDgyNKHTBrhq2) **Ready / Production** for application commit `bceb3e0aaeb02fa6208e00d648ae37d76ba83980`.
- Production origin: [https://x-two-ecru.vercel.app](https://x-two-ecru.vercel.app).
- Persistent Turso database `x-vilnius-worth`, EU West (Ireland), connected to Production using the integration's sensitive environment variables. The application origin and trusted-proxy setting were configured before building.
- **42 live HTTP checks passed, zero failed** against the production origin. They cover both locales' calculator, creator, brand, methodology, privacy, terms, report and comparison pages; canonical URLs, language tags, robots and sitemap; single/comparison social and downloadable PNGs; example calculations and public-board sorting; and invalid input, unsupported locale, same-account and cross-origin boundaries.
- One explicitly fictional, unlisted QA report was created and reloaded from the hosted database. It returned **€20 per post / €1,040 annually**, its saved-report PNGs rendered with private/no-store cache headers, and it remained absent from the public board.
- Native Chrome inspection confirmed the live desktop typography, illustration and Vilnius skyline. Entering `demo_milda` opened its report, the comparison control loaded `demo_tomas`, switching to Lithuanian preserved both accounts and localized the amounts, and copying the comparison link showed localized success feedback.
- The Lithuanian creator wizard accepted a fictional local draft, a standard repost offer at €10.50 and a custom offer at €35.25. Its preview and saved dashboard retained all three enabled offers and localized amounts. This draft was saved only in the QA browser; no public profile or account was created.
- Vercel completed the locked dependency install and production build. Build logs reported zero dependency vulnerabilities; non-fatal npm configuration/install-script and ESLint lifecycle warnings were present.

## Boundaries

Live X lookup and real email delivery require the owner's credentials and have not been exercised against production accounts. No payment, real campaign, WhatsApp or appointment transaction was attempted. The original private marketplace was inaccessible and is outside the implemented parity claim. See the README for the exact implementation scope and deployment configuration.

The browser used for visual inspection had translation and other user extensions enabled. A development hydration warning was traced to extension-injected HTML attributes; the application production build and route checks passed.
