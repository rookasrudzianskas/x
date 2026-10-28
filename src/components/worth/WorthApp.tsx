"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  LoaderCircle,
  MessageCircle,
  Plus,
  X as CloseIcon,
} from "lucide-react";
import {
  calculateEstimate,
  DEFAULT_ESTIMATE_INPUT,
  estimateInputSchema,
  normalizeHandle,
  type EstimateInput,
} from "@/lib/estimate";
import {
  SAMPLE_PROFILES,
  sampleReport,
  type CreatorProfile,
  type Report,
} from "@/lib/profiles";
import { firstQueryValue, isValidReportId } from "@/lib/report-query";
import {
  comparisonImageUrl,
  lookupFailureKey,
  parseBoardPayload,
  parseReportPayload,
  updateReportQuery,
  type LookupError,
} from "./report-utils";
import {
  getDictionary,
  localizeProfileName,
  money,
  number,
  type Locale,
} from "@/lib/i18n";

const XMark = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.2-8.3L.8 2h6.5l4.4 6.8L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z" />
  </svg>
);

export function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const router = useRouter();
  function switchLanguage(next: Locale) {
    const path = /^\/(en|lt)(\/|$)/.test(pathname)
      ? pathname.replace(/^\/(en|lt)/, `/${next}`)
      : `/${next}${pathname}`;
    router.push(path + window.location.search + window.location.hash);
  }
  return (
    <header className="site-header">
      <Link
        className="wordmark"
        href={`/${locale}/worth`}
        aria-label={`unfair Vilnius — ${t.calculator}`}
      >
        unfair<span className="wordmark-city">Vilnius</span>
      </Link>
      <nav
        aria-label={locale === "lt" ? "Pagrindinis meniu" : "Main navigation"}
      >
        <div className="language-switch" role="group" aria-label={t.language}>
          <button
            type="button"
            aria-pressed={locale === "en"}
            onClick={() => switchLanguage("en")}
          >
            EN
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            aria-pressed={locale === "lt"}
            onClick={() => switchLanguage("lt")}
          >
            LT
          </button>
        </div>
        <Link className="nav-brands" href={`/${locale}/brands`}>
          {t.brands}
        </Link>
        <Link className="button nav-creator" href={`/${locale}/creators`}>
          {t.creators}
        </Link>
      </nav>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <footer className="site-footer page-width">
      <div className="footer-top">
        <Link className="wordmark" href={`/${locale}/worth`}>
          unfair<span className="wordmark-city">Vilnius</span>
        </Link>
        <nav aria-label={locale === "lt" ? "Poraštė" : "Footer"}>
          <Link href={`/${locale}/worth`}>{t.calculator}</Link>
          <Link href={`/${locale}/creators`}>{t.creators}</Link>
          <Link href={`/${locale}/brands`}>{t.brands}</Link>
          <Link href={`/${locale}/privacy`}>{t.privacy}</Link>
          <Link href={`/${locale}/terms`}>{t.terms}</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>{t.footerNote}</p>
        <Link href={`/${locale}/methodology`}>
          {locale === "lt" ? "Šaltiniai ir metodika" : "Sources & methodology"}{" "}
          ↗
        </Link>
      </div>
    </footer>
  );
}

export function Help({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="help-button"
        type="button"
        aria-label={t.help}
        onClick={() => dialog.current?.showModal()}
      >
        <MessageCircle size={25} fill="currentColor" strokeWidth={1.5} />
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="faq-heading"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-top">
          <h2 id="faq-heading">{t.faq}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={t.close}
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon />
          </button>
        </div>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <details key={n}>
            <summary>
              {t[`faq${n}`]}
              <Plus size={16} />
            </summary>
            <p>{t[`answer${n}`]}</p>
          </details>
        ))}
        <Link className="text-link" href={`/${locale}/methodology`}>
          {t.methodology} <ArrowRight size={15} />
        </Link>
      </dialog>
    </>
  );
}

function Avatar({
  profile,
  size = "normal",
}: {
  profile: Pick<CreatorProfile, "name" | "color" | "avatar">;
  size?: "normal" | "large";
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ "--avatar-color": profile.color } as CSSProperties}
      aria-hidden="true"
    >
      {profile.avatar && failedAvatar !== profile.avatar ? (
        <Image
          src={profile.avatar}
          alt=""
          width={46}
          height={46}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailedAvatar(profile.avatar || null)}
        />
      ) : (
        <span>{[...profile.name][0]}</span>
      )}
    </span>
  );
}

function Skyline({ className = "" }: { className?: string }) {
  return <div className={`skyline ${className}`} aria-hidden="true" />;
}
function FallingEuros() {
  return (
    <div className="falling-euros" aria-hidden="true">
      {[3, 11, 19, 27, 34, 42, 57, 67, 76, 83, 90, 97].map((left, index) => (
        <span
          key={left}
          style={
            {
              left: `${left}%`,
              "--delay": `${-index * 2.1}s`,
              "--duration": `${14 + (index % 6)}s`,
              "--opacity": `${0.18 + (index % 4) * 0.08}`,
            } as CSSProperties
          }
        >
          €
        </span>
      ))}
    </div>
  );
}

function HandleForm({
  locale,
  initial = "",
  comparisonWith,
}: {
  locale: Locale;
  initial?: string;
  comparisonWith?: string;
}) {
  const t = getDictionary(locale);
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const errorId = comparisonWith ? "compare-handle-error" : "x-handle-error";
  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeHandle(value);
    if (!normalized) {
      setError(t.invalidHandle);
      return;
    }
    if (comparisonWith?.toLowerCase() === normalized.toLowerCase()) {
      setError(t.compareError);
      return;
    }
    setError("");
    const reportId = comparisonWith
      ? new URLSearchParams(window.location.search).get("report")
      : null;
    router.push(
      `/${locale}/worth/${comparisonWith ? `${encodeURIComponent(comparisonWith)}/vs/` : ""}${encodeURIComponent(normalized)}${reportId ? `?report=${encodeURIComponent(reportId)}` : ""}`,
    );
  }
  return (
    <form
      className={`handle-form ${comparisonWith ? "compare-handle-form" : ""}`}
      onSubmit={submit}
    >
      <div className={`handle-control ${error ? "has-error" : ""}`}>
        <XMark />
        <label
          className="sr-only"
          htmlFor={comparisonWith ? "compare-handle" : "x-handle"}
        >
          {comparisonWith ? t.compareHandle : t.handleLabel}
        </label>
        <input
          id={comparisonWith ? "compare-handle" : "x-handle"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError("");
          }}
          placeholder={comparisonWith ? "@handle" : t.handlePlaceholder}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className="button button-blue">
          {comparisonWith ? t.compare : t.calculate}
        </button>
      </div>
      <p
        id={errorId}
        className="handle-error"
        role={error ? "alert" : undefined}
      >
        {error || "\u00a0"}
      </p>
    </form>
  );
}

function Hero({
  locale,
  handle,
  opponent,
}: {
  locale: Locale;
  handle?: string;
  opponent?: string;
}) {
  const t = getDictionary(locale);
  return (
    <section className={`worth-hero ${handle ? "worth-hero-report" : ""}`}>
      <Header locale={locale} />
      <FallingEuros />
      <div className="hero-content">
        <Link className="community-badge" href={`/${locale}/creators`}>
          <span className="badge-avatars" aria-hidden="true">
            <span>M</span>
            <span>T</span>
            <span>U</span>
          </span>
          <span>{t.badge}</span>
          <ArrowRight size={14} />
        </Link>
        <h1>
          {opponent ? (
            <>
              {t.comparison}
              <br />
              {t.reportTitle}
            </>
          ) : (
            <>
              {t.heroOne}
              <br />
              {t.heroTwo}
            </>
          )}
        </h1>
        <HandleForm
          key={handle || "index"}
          locale={locale}
          initial={handle || ""}
        />
        {!handle && (
          <div className="hero-intro">
            <h2>{t.introTitle}</h2>
            <div>
              <p>{t.introOne}</p>
              <p>{t.introTwo}</p>
            </div>
          </div>
        )}
      </div>
      <Skyline />
    </section>
  );
}

function Leaderboard({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [profiles, setProfiles] = useState(SAMPLE_PROFILES.slice(0, 8));
  const [total, setTotal] = useState(SAMPLE_PROFILES.length);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<"" | "all" | "page">("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const refresh = () => {
      generation.current += 1;
      setExpanded(false);
      setBusy(true);
      setRevision((value) => value + 1);
    };
    window.addEventListener("worth:directory-updated", refresh);
    return () => window.removeEventListener("worth:directory-updated", refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const requestGeneration = generation.current;
    fetch(`/api/board?sort=${sort}&offset=0&limit=8`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("board");
        return response.json().then(parseBoardPayload);
      })
      .then((data: { profiles: CreatorProfile[]; total: number }) => {
        if (
          controller.signal.aborted ||
          requestGeneration !== generation.current
        )
          return;
        setProfiles(data.profiles);
        setTotal(data.total);
        setUnavailable("");
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          requestGeneration === generation.current &&
          error.name !== "AbortError"
        ) {
          const samples = [...SAMPLE_PROFILES];
          if (sort === "top")
            samples.sort(
              (a, b) =>
                calculateEstimate(b.metrics).worth -
                calculateEstimate(a.metrics).worth,
            );
          setProfiles(samples.slice(0, 8));
          setTotal(samples.length);
          setUnavailable("all");
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          requestGeneration === generation.current
        )
          setBusy(false);
      });
    return () => controller.abort();
  }, [sort, revision]);
  function changeSort(value: "recent" | "top") {
    if (value !== sort) {
      generation.current += 1;
      setSort(value);
      setExpanded(false);
      setBusy(true);
    }
  }
  async function more() {
    const requestGeneration = generation.current;
    setExpanded(true);
    if (profiles.length >= total) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/board?sort=${sort}&offset=${profiles.length}&limit=30`,
      );
      if (!response.ok) throw new Error("board");
      const data = parseBoardPayload(await response.json());
      if (requestGeneration !== generation.current) return;
      setProfiles((existing) => [
        ...existing,
        ...data.profiles.filter(
          (profile) => !existing.some((item) => item.handle === profile.handle),
        ),
      ]);
      setTotal(data.total);
    } catch {
      if (requestGeneration !== generation.current) return;
      setUnavailable("page");
    } finally {
      if (requestGeneration === generation.current) setBusy(false);
    }
  }
  return (
    <section
      className="leaderboard page-width"
      aria-labelledby="leaderboard-title"
    >
      <div className="section-heading">
        <h2 id="leaderboard-title">{t.leaderboard}</h2>
        <div
          className="board-tabs"
          role="tablist"
          aria-label={t.leaderboard}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "recent"
                : event.key === "End"
                  ? "top"
                  : sort === "recent"
                    ? "top"
                    : "recent";
            changeSort(next);
            document.getElementById(`board-tab-${next}`)?.focus();
          }}
        >
          <button
            role="tab"
            type="button"
            id="board-tab-recent"
            aria-controls="board-panel"
            tabIndex={sort === "recent" ? 0 : -1}
            aria-selected={sort === "recent"}
            onClick={() => changeSort("recent")}
          >
            <span className="status-dot" />
            {t.recent}
          </button>
          <button
            role="tab"
            type="button"
            id="board-tab-top"
            aria-controls="board-panel"
            tabIndex={sort === "top" ? 0 : -1}
            aria-selected={sort === "top"}
            onClick={() => changeSort("top")}
          >
            {t.top}
            <span className="tab-count">{total}</span>
          </button>
        </div>
      </div>
      <div
        className={`board-wrap ${expanded ? "expanded" : "collapsed"}`}
        id="board-panel"
        role="tabpanel"
        aria-labelledby={`board-tab-${sort}`}
        aria-busy={busy}
      >
        <div
          className="board-scroll"
          tabIndex={0}
          role="region"
          aria-label={t.leaderboard}
        >
          <table className="board-table">
            <thead>
              <tr>
                <th className="rank-cell" scope="col">
                  #
                </th>
                <th scope="col">{t.account}</th>
                <th scope="col">{t.followers}</th>
                <th scope="col">{t.medianViews}</th>
                <th scope="col">{t.aYear}</th>
                <th scope="col">{t.worth}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile, index) => {
                const estimate = calculateEstimate(profile.metrics);
                return (
                  <tr key={profile.handle}>
                    <td className="rank-cell">{index + 1}</td>
                    <td className="profile-cell">
                      <Link
                        href={`/${locale}/worth/${encodeURIComponent(profile.handle)}${profile.reportId ? `?report=${encodeURIComponent(profile.reportId)}` : ""}`}
                      >
                        <Avatar profile={profile} />
                        <span className="profile-text">
                          <strong>
                            {localizeProfileName(
                              profile.name,
                              profile.source,
                              locale,
                            )}
                          </strong>
                          <span className="profile-handle">
                            @{profile.handle}
                            <span className="source-tag">
                              {t[profile.source]}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>{number(profile.metrics.followers, locale, true)}</td>
                    <td className="muted">
                      {number(profile.metrics.medianViews, locale, true)}
                    </td>
                    <td className="muted">
                      {money(estimate.annual, locale, true)}
                    </td>
                    <td className="worth-cell">
                      {money(estimate.worth, locale, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!profiles.length && <p className="empty-state">{t.noResults}</p>}
        {(!expanded || profiles.length < total) && !!profiles.length && (
          <div className="board-more">
            <button
              type="button"
              className="button button-white"
              onClick={more}
              disabled={busy}
            >
              {busy ? <LoaderCircle size={16} className="spin" /> : t.showMore}
            </button>
          </div>
        )}
      </div>
      <p className="section-note">
        {unavailable === "all"
          ? t.boardUnavailable
          : unavailable === "page"
            ? t.boardPageUnavailable
            : t.sampleNote}
      </p>
    </section>
  );
}

function LocalSections({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <>
      <section className="city-band page-width">
        <div className="city-band-inner">
          <p>{t.cityBandTop}</p>
          <h2>
            {t.cityBandTitle.split("\n").map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
          <p className="city-band-bottom">{t.cityBandBottom}</p>
          <Skyline />
        </div>
      </section>
      <section
        className="brands-section page-width"
        aria-labelledby="launch-heading"
      >
        <h2 id="launch-heading">{t.launchTitle}</h2>
        <div className="launch-card">
          <div>
            <span className="eyebrow">{t.launchLabel}</span>
            <h3>{t.launchName}</h3>
            <p>{t.launchBody}</p>
            <Link className="button button-blue" href={`/${locale}/brands`}>
              {t.launchButton}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="launch-features">
            {[t.launchFeature1, t.launchFeature2, t.launchFeature3].map(
              (feature) => (
                <div key={feature}>
                  <span className="verified-icon">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <p>{feature}</p>
                </div>
              ),
            )}
            <p className="launch-note">{t.launchNote}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function useReport(handle: string, primary = true) {
  const searchParams = useSearchParams();
  const id = firstQueryValue(searchParams, primary ? "report" : "otherReport");
  const hasReportId = id !== undefined;
  const invalidReportId = hasReportId && !isValidReportId(id);
  const requestKey = JSON.stringify([handle, id ?? null]);
  const example = hasReportId ? null : sampleReport(handle);
  const [result, setResult] = useState<{
    key: string;
    report: Report | null;
    error: LookupError | null;
  } | null>(null);
  const current = invalidReportId
    ? { report: null, error: "reportMissing" as const }
    : result?.key === requestKey
      ? result
      : example
        ? { report: example, error: null }
        : null;

  useEffect(() => {
    if (invalidReportId || (!hasReportId && sampleReport(handle))) return;
    const controller = new AbortController();
    const url = hasReportId
      ? `/api/reports/${encodeURIComponent(id)}`
      : `/api/worth/${encodeURIComponent(handle)}`;
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          const code = String(data.code || data.error?.code || "");
          const error = lookupFailureKey(response.status, code, hasReportId);
          setResult({ key: requestKey, report: null, error });
          return;
        }
        const report = parseReportPayload(hasReportId ? data.report : data);
        if (
          (hasReportId && report.id !== id) ||
          report.profile.handle.toLowerCase() !== handle.toLowerCase()
        ) {
          setResult({ key: requestKey, report: null, error: "reportMissing" });
          return;
        }
        setResult({ key: requestKey, report, error: null });
      })
      .catch((failure) => {
        if (!controller.signal.aborted && failure.name !== "AbortError")
          setResult({ key: requestKey, report: null, error: "lookupFailed" });
      });
    return () => controller.abort();
  }, [handle, id, hasReportId, invalidReportId, requestKey]);

  function setReport(report: Report) {
    // Saving also updates this slot's query parameter in the same event.
    setResult({
      key: JSON.stringify([handle, report.id]),
      report,
      error: null,
    });
  }
  return {
    report: current?.report || null,
    setReport,
    loading: !current,
    error: current?.error || null,
  };
}

function MetricsForm({
  locale,
  handle,
  initial,
  name = "",
  onSaved,
}: {
  locale: Locale;
  handle: string;
  initial?: EstimateInput;
  name?: string;
  onSaved: (report: Report) => void;
}) {
  const t = getDictionary(locale);
  const [input, setInput] = useState(initial || DEFAULT_ESTIMATE_INPUT);
  const [displayName, setDisplayName] = useState(name);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "" | "formError" | "saveError" | "saveRateLimit"
  >("");
  const activeSave = useRef<AbortController | null>(null);
  useEffect(() => () => activeSave.current?.abort(), []);
  const prefix = `metrics-${handle}`;
  const fields = [
    { key: "followers", label: t.followers, max: 1_000_000_000, step: 1 },
    {
      key: "medianViews",
      label: t.viewsLabel,
      max: 1_000_000_000,
      step: "any",
    },
    { key: "sponsoredPostsPerWeek", label: t.frequency, max: 7, step: "any" },
    { key: "cpm", label: t.cpm, max: 1_000, step: "any" },
  ] as const;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (activeSave.current) return;
    const parsed = estimateInputSchema.safeParse(input);
    if (!parsed.success) {
      setError("formError");
      return;
    }
    const controller = new AbortController();
    activeSave.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          name: displayName.trim() || undefined,
          input: parsed.data,
          publish,
        }),
      });
      if (controller.signal.aborted) return;
      if (response.status === 429) {
        setError("saveRateLimit");
        return;
      }
      if (!response.ok) throw new Error("save");
      const data = await response.json();
      const report = parseReportPayload(data.report);
      if (controller.signal.aborted) return;
      onSaved(report);
      if (publish) window.dispatchEvent(new Event("worth:directory-updated"));
    } catch {
      if (!controller.signal.aborted) setError("saveError");
    } finally {
      activeSave.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <form className="metrics-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        {!initial && <p className="form-intro">{t.exampleDefaults}</p>}
        <div className="metrics-grid">
          <label className="full-width" htmlFor={`${prefix}-name`}>
            {t.name}
            <input
              id={`${prefix}-name`}
              value={displayName}
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={`@${handle}`}
            />
          </label>
          {fields.map((field) => (
            <label key={field.key} htmlFor={`${prefix}-${field.key}`}>
              {field.label}
              <input
                id={`${prefix}-${field.key}`}
                name={field.key}
                type="number"
                inputMode="decimal"
                min={0}
                max={field.max}
                step={field.step}
                required
                value={Number.isNaN(input[field.key]) ? "" : input[field.key]}
                onChange={(event) =>
                  setInput({
                    ...input,
                    [field.key]:
                      event.target.value === ""
                        ? NaN
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="form-help">{t.cpmHelp}</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={publish}
            onChange={(event) => setPublish(event.target.checked)}
          />
          <span>{t.publish}</span>
        </label>
        <p className="form-help">{t.publishHelp}</p>
        {error && (
          <p role="alert" className="form-error">
            {t[error]}
          </p>
        )}
        <button type="submit" className="button button-blue" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={17} className="spin" />
              {t.saving}
            </>
          ) : (
            <>
              {t.recalculate}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}

function ReportCard({
  locale,
  report,
  compact = false,
}: {
  locale: Locale;
  report: Report;
  compact?: boolean;
}) {
  const t = getDictionary(locale);
  const profile = report.profile;
  const worthText = money(
    report.estimate.worth,
    locale,
    report.estimate.worth >= 100_000,
  );
  const monthText = money(
    report.estimate.monthly,
    locale,
    report.estimate.monthly >= 10_000,
  );
  return (
    <div className={`share-card ${compact ? "share-card-compact" : ""}`}>
      <div className="share-card-pixels" aria-hidden="true" />
      <div className="share-card-content">
        <div className="share-identity">
          <Avatar profile={profile} size="large" />
          <div>
            <strong>
              {localizeProfileName(profile.name, profile.source, locale)}
            </strong>
            <span>@{profile.handle}</span>
          </div>
          <span className="share-card-brand">
            unfair<span>Vilnius</span>
          </span>
        </div>
        <p className="share-value-label">{t.reportWorth}</p>
        <div
          className="share-worth"
          style={
            {
              "--value-scale": Math.min(1, 8.5 / [...worthText].length),
            } as CSSProperties
          }
          title={money(report.estimate.worth, locale)}
        >
          {worthText}
        </div>
        <div className="share-month">
          <strong
            style={
              {
                "--value-scale": Math.min(1, 6.5 / [...monthText].length),
              } as CSSProperties
            }
            title={money(report.estimate.monthly, locale)}
          >
            {monthText}
          </strong>
          <span>{t.perMonth}</span>
        </div>
        <span className="share-source">{t[profile.source]}</span>
      </div>
      <Image
        className="share-illustration"
        src="/card-illustration.png"
        width={1440}
        height={1088}
        alt=""
        aria-hidden="true"
      />
      <span className="pixel-heart heart-one" aria-hidden="true">
        ♥
      </span>
      <span className="pixel-heart heart-two" aria-hidden="true">
        ♥
      </span>
      <Skyline />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadCard(
  report: Report,
  locale: Locale,
  signal: AbortSignal,
): Promise<Blob> {
  await document.fonts.ready;
  const t = getDictionary(locale);
  async function loadImage(src: string, remote = false) {
    const image = new window.Image();
    if (remote) {
      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          image.src = "";
          reject(new Error("image timeout"));
        },
        remote ? 4_000 : 10_000,
      );
      image.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error("image"));
      };
      image.src = src;
    });
    return image;
  }
  const [skyline, illustration, avatar] = await Promise.all([
    loadImage("/vilnius-skyline.svg"),
    loadImage("/card-illustration.png"),
    report.profile.avatar
      ? loadImage(report.profile.avatar, true).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 750;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  const ctx = context;
  const styles = getComputedStyle(document.body);
  const pixelFont = styles.getPropertyValue("--font-pixel").trim() || "serif";
  const sansFont =
    styles.getPropertyValue("--font-sans").trim() || "sans-serif";
  ctx.fillStyle = "#0033ff";
  ctx.fillRect(0, 0, 1200, 750);
  const gradient = ctx.createLinearGradient(0, 0, 1200, 750);
  gradient.addColorStop(0, "rgba(133,107,255,.32)");
  gradient.addColorStop(1, "rgba(0,25,220,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 750);
  // Match the UI's layer order: scenery and illustration behind readable values.
  ctx.globalAlpha = 0.7;
  ctx.drawImage(skyline, 30, 486, 1140, 228);
  ctx.globalAlpha = 1;
  ctx.drawImage(illustration, 340, 345, 470, 355);
  const heart = [
    "0110110",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
  ];
  ctx.fillStyle = "rgba(255,255,255,.45)";
  for (const [x, y, cell] of [
    [770, 130, 10],
    [1030, 190, 7],
  ]) {
    heart.forEach((row, rowIndex) =>
      [...row].forEach((value, column) => {
        if (value === "1")
          ctx.fillRect(x + column * cell, y + rowIndex * cell, cell, cell);
      }),
    );
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(24, 24, 1152, 6);
  ctx.fillRect(24, 720, 1152, 6);
  ctx.fillRect(24, 24, 6, 702);
  ctx.fillRect(1170, 24, 6, 702);
  for (let x = 24; x < 1176; x += 24) {
    ctx.fillRect(x, 24, 12, 12);
    ctx.fillRect(x, 714, 12, 12);
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(103, 105, 36, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = report.profile.color;
  ctx.fillRect(67, 69, 72, 72);
  if (avatar) ctx.drawImage(avatar, 67, 69, 72, 72);
  else {
    ctx.fillStyle = "#142248";
    ctx.font = `40px ${pixelFont}`;
    ctx.textAlign = "center";
    ctx.fillText([...report.profile.name][0] || "?", 103, 119);
  }
  ctx.restore();
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  function textFit(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    font: string,
    weight = "400",
  ) {
    ctx.font = `${weight} ${size}px ${font}`;
    const scale = Math.min(
      1,
      maxWidth / Math.max(1, ctx.measureText(text).width),
    );
    ctx.font = `${weight} ${size * scale}px ${font}`;
    ctx.fillText(text, x, y);
  }
  let name = localizeProfileName(
    report.profile.name,
    report.profile.source,
    locale,
  );
  ctx.font = `600 27px ${sansFont}`;
  while (ctx.measureText(name).width > 650 && name.length > 1)
    name = [...name].slice(0, -2).join("") + "…";
  ctx.fillText(name, 157, 99);
  ctx.font = `22px ${sansFont}`;
  ctx.fillText(`@${report.profile.handle}`, 157, 134);
  textFit("unfair · Vilnius", 930, 97, 210, 36, pixelFont);
  textFit(t.reportWorth, 72, 227, 660, 24, sansFont);
  textFit(
    money(report.estimate.worth, locale, report.estimate.worth >= 100_000),
    68,
    355,
    500,
    120,
    pixelFont,
  );
  ctx.textAlign = "right";
  textFit(
    money(report.estimate.monthly, locale, report.estimate.monthly >= 10_000),
    1110,
    485,
    355,
    76,
    pixelFont,
  );
  textFit(t.perMonth, 1110, 525, 355, 26, sansFont);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0,20,150,.55)";
  ctx.fillRect(62, 657, 1080, 39);
  ctx.fillStyle = "#fff";
  textFit(
    `${t[report.profile.source]} · ${t.assumptions} · EUR`,
    76,
    683,
    1050,
    18,
    sansFont,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("blob"))),
      "image/png",
    ),
  );
}

function ShareActions({
  report,
  locale,
  opponent,
}: {
  report: Report;
  locale: Locale;
  opponent?: Report;
}) {
  const t = getDictionary(locale);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"" | "copyError" | "imageError">("");
  const [compare, setCompare] = useState(false);
  const activeSave = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      activeSave.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setError("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 3000);
    } catch {
      setError("copyError");
    }
  }
  async function save() {
    if (activeSave.current) return;
    const controller = new AbortController();
    activeSave.current = controller;
    setSaving(true);
    setError("");
    try {
      let blob: Blob;
      if (opponent) {
        const response = await fetch(
          comparisonImageUrl(
            report.profile.handle,
            opponent.profile.handle,
            locale,
            window.location.search,
          ),
          { signal: controller.signal },
        );
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("image/png")
        )
          throw new Error("image");
        blob = await response.blob();
      } else {
        blob = await downloadCard(report, locale, controller.signal);
      }
      if (!controller.signal.aborted)
        downloadBlob(
          blob,
          `vilnius-worth-${report.profile.handle}${opponent ? `-vs-${opponent.profile.handle}` : ""}.png`,
        );
    } catch {
      if (!controller.signal.aborted) setError("imageError");
    } finally {
      activeSave.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  function share() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(opponent ? t.shareComparisonText : t.shareText)}&url=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <div className="share-actions-wrap">
      <div className="share-actions">
        <button type="button" className="button button-white" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t.copied : t.copyLink}
        </button>
        <button
          type="button"
          className="button button-white"
          onClick={save}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          {saving ? t.saving : t.saveImage}
        </button>
        <button type="button" className="button button-dark" onClick={share}>
          <XMark size={14} />
          {t.postOnX}
        </button>
        {!opponent && (
          <button
            type="button"
            className="button button-white"
            onClick={() => setCompare(!compare)}
            aria-expanded={compare}
            aria-controls="comparison-form"
          >
            {t.compare}
            <Plus size={15} />
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {copied ? t.copied : ""}
      </span>
      {error && (
        <p className="form-error" role="alert">
          {t[error]}
        </p>
      )}
      {compare && (
        <div className="compare-form" id="comparison-form">
          <p>{t.compareHandle}</p>
          <HandleForm locale={locale} comparisonWith={report.profile.handle} />
        </div>
      )}
    </div>
  );
}

function TopPost({
  locale,
  profile,
}: {
  locale: Locale;
  profile: CreatorProfile;
}) {
  const post = profile.topPost;
  if (!post) return null;
  return (
    <section className="top-post-card">
      <div className="top-post-heading">
        <h2>
          {locale === "lt"
            ? "Vertingiausias tavo įrašas."
            : "Your most valuable post."}
        </h2>
        <XMark size={17} />
      </div>
      <p className="top-post-text">{post.text}</p>
      <div className="top-post-metrics">
        <span>
          {number(post.views, locale)}{" "}
          {locale === "lt" ? "parodymų" : "impressions"}
        </span>
        <strong>
          {money((post.views / 1_000) * profile.metrics.cpm, locale)}{" "}
          <small>
            {locale === "lt" ? "pagal pasirinktą CPM" : "at your selected CPM"}
          </small>
        </strong>
      </div>
      <a
        className="text-link"
        href={`https://x.com/${encodeURIComponent(profile.handle)}/status/${encodeURIComponent(post.id)}`}
        target="_blank"
        rel="noreferrer"
      >
        {locale === "lt" ? "Peržiūrėti įrašą" : "View post"} ↗
      </a>
    </section>
  );
}

function Projection({ report, locale }: { report: Report; locale: Locale }) {
  const t = getDictionary(locale);
  const amount = report.estimate.annual;
  const path = amount ? "M84 210 L612 30" : "M84 210 L612 210";
  return (
    <section className="projection-card">
      <div className="projection-heading">
        <div>
          <h2>{t.projection}</h2>
          <p>{t.projectionDescription}</p>
        </div>
        <strong title={money(amount, locale)}>
          {money(amount, locale, amount >= 100_000)}
        </strong>
      </div>
      <svg
        className="income-chart"
        viewBox="0 0 660 260"
        role="img"
        aria-label={`${t.annualLabel}: ${money(amount, locale)}`}
      >
        <defs>
          <linearGradient
            id={`chart-gradient-${report.profile.handle}`}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#0033ff" stopOpacity=".13" />
            <stop offset="100%" stopColor="#0033ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 90, 150, 210].map((y, i) => (
          <g key={y}>
            <line
              x1="84"
              x2="612"
              y1={y}
              y2={y}
              stroke="#eceef2"
              strokeDasharray="3 5"
            />
            <text x="76" y={y + 4} textAnchor="end">
              {number((amount * (3 - i)) / 3, locale, true)}
            </text>
          </g>
        ))}
        <path
          d={`${path} L612 210 L84 210 Z`}
          fill={`url(#chart-gradient-${report.profile.handle})`}
        />
        <path
          d={path}
          fill="none"
          stroke="#0033ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {[0, 3, 6, 9, 12].map((month) => (
          <text key={month} x={84 + month * 44} y="238" textAnchor="middle">
            {month}
          </text>
        ))}
        <text x="330" y="259" textAnchor="middle">
          {t.months}
        </text>
      </svg>
      <div className="scenario-grid">
        <div>
          <span>{t.lowScenario}</span>
          <strong title={money(report.estimate.lowAnnual, locale)}>
            {money(
              report.estimate.lowAnnual,
              locale,
              report.estimate.lowAnnual >= 100_000,
            )}
          </strong>
        </div>
        <div>
          <span>{t.highScenario}</span>
          <strong title={money(report.estimate.highAnnual, locale)}>
            {money(
              report.estimate.highAnnual,
              locale,
              report.estimate.highAnnual >= 100_000,
            )}
          </strong>
        </div>
      </div>
    </section>
  );
}

function Methodology({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <details className="methodology">
      <summary>
        {t.methodology}
        <ChevronDown size={18} />
      </summary>
      <div>
        <p>{t.methodologyOne}</p>
        <p>{t.methodologyTwo}</p>
        <p>{t.methodologyThree}</p>
        <Link href={`/${locale}/methodology`}>
          {locale === "lt"
            ? "Šaltiniai ir visa metodika"
            : "Sources and full methodology"}{" "}
          ↗
        </Link>
      </div>
    </details>
  );
}

function SingleReport({ locale, handle }: { locale: Locale; handle: string }) {
  const t = getDictionary(locale);
  const { report, setReport, loading, error } = useReport(handle);
  const [saved, setSaved] = useState(false);
  function onSaved(nextReport: Report) {
    setReport(nextReport);
    setSaved(true);
    const url = updateReportQuery(new URL(window.location.href), nextReport.id);
    window.history.replaceState(null, "", url);
  }
  if (loading)
    return (
      <section
        className="report-container loading-report"
        aria-live="polite"
        aria-busy="true"
      >
        <LoaderCircle className="spin" size={28} />
        <h2>{t.loading}</h2>
        <p>{t.loadingDetail}</p>
      </section>
    );
  if (!report)
    return (
      <section className="report-container manual-card">
        <span className="eyebrow">@{handle}</span>
        <h2>{t.manualTitle}</h2>
        <p>
          {t.manualIntro} <strong>@{handle}</strong>.
        </p>
        {error && (
          <p className="lookup-notice" role="status">
            {t[error]}
          </p>
        )}
        <MetricsForm locale={locale} handle={handle} onSaved={onSaved} />
      </section>
    );
  return (
    <div className="report-container">
      <ReportCard locale={locale} report={report} />
      <ShareActions
        key={`${report.id}-${locale}`}
        locale={locale}
        report={report}
      />
      <div className="report-facts">
        <div>
          <span>{t.followers}</span>
          <strong title={number(report.profile.metrics.followers, locale)}>
            {number(
              report.profile.metrics.followers,
              locale,
              report.profile.metrics.followers >= 100_000,
            )}
          </strong>
        </div>
        <div>
          <span>{t.medianViews}</span>
          <strong title={number(report.profile.metrics.medianViews, locale)}>
            {number(
              report.profile.metrics.medianViews,
              locale,
              report.profile.metrics.medianViews >= 100_000,
            )}
          </strong>
        </div>
        <div>
          <span>{t.perPost}</span>
          <strong title={money(report.estimate.perPost, locale)}>
            {money(
              report.estimate.perPost,
              locale,
              report.estimate.perPost >= 100_000,
            )}
          </strong>
        </div>
      </div>
      <p className="report-source">
        {t.source}: {t[report.profile.source]}
        {report.profile.sampleSize
          ? ` · ${report.profile.sampleSize} ${t.sampleSize}`
          : ""}
      </p>
      <TopPost locale={locale} profile={report.profile} />
      <Projection locale={locale} report={report} />
      <details className="adjust-panel">
        <summary>
          {t.adjust}
          <Plus size={19} />
        </summary>
        <MetricsForm
          key={report.id}
          locale={locale}
          handle={handle}
          initial={report.profile.metrics}
          name={report.profile.name}
          onSaved={onSaved}
        />
      </details>
      {saved && (
        <p className="saved-status" role="status">
          <Check size={14} />
          {t.saved}
        </p>
      )}
      <Methodology locale={locale} />
      <p className="estimate-disclosure">{t.disclosure}</p>
      <div className="report-cta">
        <Link
          className="button button-blue"
          href={`/${locale}/creators/${encodeURIComponent(handle)}`}
        >
          {t.createProfile}
          <ArrowRight size={16} />
        </Link>
        {report.profile.source !== "sample" && (
          <a
            className="text-link"
            href={`https://x.com/${encodeURIComponent(handle)}`}
            target="_blank"
            rel="noreferrer"
          >
            {t.viewProfile} ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Comparison({
  locale,
  handle,
  opponent,
}: {
  locale: Locale;
  handle: string;
  opponent: string;
}) {
  const t = getDictionary(locale);
  const first = useReport(handle);
  const second = useReport(opponent, false);
  function saveReport(nextReport: Report, primary: boolean) {
    (primary ? first : second).setReport(nextReport);
    const url = updateReportQuery(
      new URL(window.location.href),
      nextReport.id,
      primary,
    );
    window.history.replaceState(null, "", url);
  }
  const rows = [
    {
      label: t.followers,
      get: (r: Report) => number(r.profile.metrics.followers, locale),
    },
    {
      label: t.medianViews,
      get: (r: Report) => number(r.profile.metrics.medianViews, locale),
    },
    {
      label: t.frequency,
      get: (r: Report) =>
        new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
          maximumFractionDigits: 3,
        }).format(r.profile.metrics.sponsoredPostsPerWeek),
    },
    {
      label: t.cpm,
      get: (r: Report) =>
        new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 2,
        }).format(r.profile.metrics.cpm),
    },
    { label: t.perPost, get: (r: Report) => money(r.estimate.perPost, locale) },
    { label: t.perYear, get: (r: Report) => money(r.estimate.annual, locale) },
    { label: t.fiveYear, get: (r: Report) => money(r.estimate.worth, locale) },
  ];
  return (
    <section className="comparison-container page-width">
      <p className="comparison-subtitle">{t.comparisonSub}</p>
      <div className="comparison-grid">
        {[first, second].map((item, index) => (
          <div key={index}>
            {item.loading ? (
              <div className="comparison-loading">
                <LoaderCircle className="spin" />
                <p>{t.loading}</p>
              </div>
            ) : item.report ? (
              <>
                <ReportCard locale={locale} report={item.report} compact />
                <details className="adjust-panel">
                  <summary>
                    {t.adjust}
                    <Plus size={18} />
                  </summary>
                  <MetricsForm
                    key={item.report.id}
                    locale={locale}
                    handle={index === 0 ? handle : opponent}
                    name={item.report.profile.name}
                    initial={item.report.profile.metrics}
                    onSaved={(report) => saveReport(report, index === 0)}
                  />
                </details>
              </>
            ) : (
              <div className="manual-card">
                <h2>@{index === 0 ? handle : opponent}</h2>
                <p>{item.error ? t[item.error] : t.missingComparison}</p>
                <MetricsForm
                  locale={locale}
                  handle={index === 0 ? handle : opponent}
                  onSaved={(report) => saveReport(report, index === 0)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {first.report && second.report && (
        <ShareActions
          key={`${first.report.id}-${second.report.id}-${locale}`}
          locale={locale}
          report={first.report}
          opponent={second.report}
        />
      )}
      {first.report && second.report && (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t.metric}</th>
                <th>@{handle}</th>
                <th>@{opponent}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.get(first.report!)}</td>
                  <td>{row.get(second.report!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Methodology locale={locale} />
      <p className="estimate-disclosure">{t.disclosure}</p>
      <Link className="text-link" href={`/${locale}/worth`}>
        {t.another}
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

export default function WorthApp({
  locale,
  handle,
  opponent,
}: {
  locale: Locale;
  handle?: string;
  opponent?: string;
}) {
  return (
    <div className="worth-app">
      <Hero locale={locale} handle={handle} opponent={opponent} />
      <Suspense
        fallback={
          <section
            className="report-container loading-report"
            aria-live="polite"
            aria-busy="true"
          >
            <LoaderCircle className="spin" size={28} />
            <p>{getDictionary(locale).loading}</p>
          </section>
        }
      >
        {handle ? (
          opponent ? (
            <Comparison
              key={`${handle}-${opponent}`}
              locale={locale}
              handle={handle}
              opponent={opponent}
            />
          ) : (
            <SingleReport key={handle} locale={locale} handle={handle} />
          )
        ) : null}
      </Suspense>
      <Leaderboard locale={locale} />
      <LocalSections locale={locale} />
      <Footer locale={locale} />
      <Help locale={locale} />
    </div>
  );
}
