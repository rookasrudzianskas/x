"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import styles from "./Creator.module.css";

export type Locale = "en" | "lt";
export type CreatorProfile = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  niche: string;
  rate: number;
  published: boolean;
  platform?: "x" | "linkedin";
  profileUrl?: string;
};
export type SessionUser = { email: string };
const DRAFT_KEY = "vilnius-worth.creator-draft.v1";
export const copy = <T,>(locale: Locale, en: T, lt: T): T =>
  locale === "lt" ? lt : en;
export const euro = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
export const emptyProfile = (handle = ""): CreatorProfile => ({
  name: "",
  handle,
  bio: "",
  location: "Vilnius, Lithuania",
  niche: "",
  rate: 50,
  published: false,
  platform: "x",
});

function checkedDraft(value: unknown): CreatorProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (
    entry.version !== 1 ||
    !entry.profile ||
    typeof entry.profile !== "object" ||
    Array.isArray(entry.profile)
  )
    return null;
  const profile = entry.profile as Record<string, unknown>;
  const boundedString = (key: string, max: number, required = false) =>
    typeof profile[key] === "string" &&
    (profile[key] as string).length <= max &&
    (!required || (profile[key] as string).trim().length > 0);
  if (
    !boundedString("name", 80, true) ||
    !boundedString("handle", 100, true) ||
    !boundedString("bio", 500) ||
    !boundedString("location", 100, true) ||
    !boundedString("niche", 100)
  )
    return null;
  if (
    typeof profile.rate !== "number" ||
    !Number.isFinite(profile.rate) ||
    profile.rate < 0 ||
    profile.rate > 1_000_000 ||
    typeof profile.published !== "boolean"
  )
    return null;
  if (
    profile.platform !== undefined &&
    profile.platform !== "x" &&
    profile.platform !== "linkedin"
  )
    return null;
  const platform = profile.platform === "linkedin" ? "linkedin" : "x";
  if (
    !(
      platform === "linkedin" ? /^[A-Za-z0-9-]{3,100}$/ : /^[A-Za-z0-9_]{1,15}$/
    ).test(profile.handle as string)
  )
    return null;
  if (profile.profileUrl !== undefined) {
    if (
      typeof profile.profileUrl !== "string" ||
      profile.profileUrl.length > 300
    )
      return null;
    if (profile.profileUrl) {
      try {
        const url = new URL(profile.profileUrl);
        const hosts =
          platform === "linkedin"
            ? ["linkedin.com", "www.linkedin.com"]
            : ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.port ||
          !hosts.includes(url.hostname)
        )
          return null;
      } catch {
        return null;
      }
    }
  }
  return {
    name: profile.name as string,
    handle: profile.handle as string,
    bio: profile.bio as string,
    location: profile.location as string,
    niche: profile.niche as string,
    rate: profile.rate,
    published: false,
    platform,
    ...(profile.profileUrl ? { profileUrl: profile.profileUrl as string } : {}),
  };
}
export function readDraft(): CreatorProfile | null {
  try {
    return checkedDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"));
  } catch {
    return null;
  }
}
export function saveDraft(profile: CreatorProfile) {
  const checked = checkedDraft({
    version: 1,
    profile: { ...profile, published: false },
  });
  if (!checked)
    throw new RequestError(
      "Please check the profile fields before saving.",
      "validation_error",
    );
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ version: 1, profile: checked }),
  );
  window.dispatchEvent(new Event("creator-draft-change"));
}
export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  window.dispatchEvent(new Event("creator-draft-change"));
}
export function downloadProfile(
  profile: CreatorProfile,
  locale: Locale,
  format: "json" | "html" = "json",
) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const body =
    format === "json"
      ? JSON.stringify(
          { ...profile, exportedAt: new Date().toISOString(), currency: "EUR" },
          null,
          2,
        )
      : `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(profile.name)} — ${copy(locale, "Media kit", "Kūrėjo pristatymas")}</title><style>body{font:18px/1.6 system-ui;max-width:760px;margin:8vh auto;padding:32px;color:#1a1a1a}h1{font-size:54px;line-height:1.1}header{border-bottom:8px solid #03f;padding-bottom:32px}small{color:#6e6e6e}strong{color:#03f}.rate{font-size:40px}p{white-space:pre-wrap}</style><header><small>VILNIUS · ${copy(locale, "CREATOR MEDIA KIT", "KŪRĖJO PRISTATYMAS")}</small><h1>${escape(profile.name)}</h1><p>@${escape(profile.handle)} · ${escape(profile.location)}</p></header><h2>${escape(profile.niche)}</h2><p>${escape(profile.bio)}</p><p class="rate"><strong>${euro(profile.rate, locale)}</strong> / ${copy(locale, "sponsored post", "reklaminį įrašą")}</p><small>${copy(locale, "Self-reported profile. Rates are indicative and subject to agreement. X identity is unverified.", "Kūrėjo pateikti duomenys. Įkainiai preliminarūs ir derinami individualiai. X tapatybė nepatvirtinta.")}</small></html>`;
  const url = URL.createObjectURL(
    new Blob([body], {
      type: format === "json" ? "application/json" : "text/html;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${profile.handle || "creator"}-media-kit.${format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export function requestError(locale: Locale, error: unknown) {
  if (locale === "en")
    return error instanceof Error
      ? error.message
      : "Could not connect. Please try again.";
  const messages: Record<string, string> = {
    not_configured:
      "El. pašto prisijungimas dar nesukonfigūruotas. Gali išsaugoti vietinį juodraštį.",
    invalid_code: "Kodas neteisingas arba nebegalioja. Paprašyk naujo kodo.",
    email_failed: "El. laiško išsiųsti nepavyko. Bandyk dar kartą vėliau.",
    unauthorized: "Norėdamas tęsti prisijunk prie paskyros.",
    rate_limited: "Per daug užklausų. Šiek tiek palauk ir bandyk dar kartą.",
    validation_error: "Patikrink įvestus duomenis ir bandyk dar kartą.",
    handle_unavailable:
      "Šis viešo profilio adresas jau naudojamas. Tai nepatvirtina X paskyros nuosavybės.",
    invalid_origin: "Užklausą pateik iš šios svetainės.",
    body_too_large: "Duomenų per daug. Sutrumpink tekstą ir bandyk dar kartą.",
    service_error: "Paslauga laikinai nepasiekiama. Bandyk dar kartą vėliau.",
  };
  return error instanceof RequestError
    ? (messages[error.code] ?? messages.service_error)
    : "Prisijungti nepavyko. Patikrink ryšį ir bandyk dar kartą.";
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new RequestError(
      typeof result.error === "string"
        ? result.error
        : result.error?.message ||
            result.message ||
            `Request failed (${response.status})`,
      result.code || result.error?.code || "service_error",
    );
  return result as T;
}

function subscribeLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}
const locationSuffix = () => window.location.search + window.location.hash;
const emptyLocationSuffix = () => "";

export function CreatorHeader({
  locale,
  active = "creators",
  dark = false,
  onLogin,
}: {
  locale: Locale;
  active?: string;
  dark?: boolean;
  onLogin?: () => void;
}) {
  const pathname = usePathname();
  const suffix = useSyncExternalStore(
    subscribeLocation,
    locationSuffix,
    emptyLocationSuffix,
  );
  const nextLocale = locale === "en" ? "lt" : "en";
  const languageHref = `${pathname.replace(/^\/(en|lt)(?=\/|$)/, `/${nextLocale}`)}${suffix}`;
  return (
    <header className={`${styles.header} ${dark ? styles.headerDark : ""}`}>
      <Link href={`/${locale}/worth`} className={styles.wordmark}>
        unfair<span>vilnius</span>
      </Link>
      <nav aria-label={copy(locale, "Main navigation", "Pagrindinis meniu")}>
        <Link
          href={`/${locale}/${active === "brands" ? "creators" : "brands"}`}
          className={styles.navLink}
        >
          {active === "brands"
            ? copy(locale, "For creators", "Kūrėjams")
            : copy(locale, "For brands", "Prekių ženklams")}
        </Link>
        <Link
          href={languageHref}
          className={styles.language}
          hrefLang={locale === "en" ? "lt" : "en"}
          aria-label={copy(
            locale,
            "Switch to Lithuanian",
            "Keisti į anglų kalbą",
          )}
        >
          {locale === "en" ? "LT" : "EN"}
        </Link>
        {onLogin ? (
          <button className={styles.smallButton} onClick={onLogin}>
            {copy(locale, "Log in", "Prisijungti")}
          </button>
        ) : (
          <Link href={`/${locale}/dashboard`} className={styles.smallButton}>
            {copy(locale, "My page", "Mano puslapis")}
          </Link>
        )}
      </nav>
    </header>
  );
}
export function CreatorFooter({ locale }: { locale: Locale }) {
  return (
    <footer className={styles.footer}>
      <div>
        <Link href={`/${locale}/worth`} className={styles.wordmark}>
          unfair<span>vilnius</span>
        </Link>
        <p>
          {copy(
            locale,
            "Your voice in Vilnius. Your value everywhere.",
            "Tavo balsas Vilniuje. Tavo vertė – visur.",
          )}
        </p>
      </div>
      <div>
        <strong>{copy(locale, "Explore", "Atrask")}</strong>
        <Link href={`/${locale}/worth`}>
          {copy(locale, "Account calculator", "Paskyros skaičiuoklė")}
        </Link>
        <Link href={`/${locale}/creators`}>
          {copy(locale, "For creators", "Kūrėjams")}
        </Link>
        <Link href={`/${locale}/brands`}>
          {copy(locale, "For brands", "Prekių ženklams")}
        </Link>
      </div>
      <div>
        <strong>{copy(locale, "Your space", "Tavo erdvė")}</strong>
        <Link href={`/${locale}/dashboard`}>
          {copy(locale, "Dashboard", "Valdymo skydelis")}
        </Link>
        <Link href={`/${locale}/privacy`}>
          {copy(locale, "Privacy", "Privatumas")}
        </Link>
        <Link href={`/${locale}/terms`}>
          {copy(locale, "Terms", "Sąlygos")}
        </Link>
      </div>
    </footer>
  );
}

const dialogStack: HTMLDivElement[] = [];
let originalBodyOverflow = "";

export function Dialog({
  title,
  children,
  onClose,
  locale,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  locale: Locale;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const before = document.activeElement as HTMLElement | null;
    if (dialogStack.length === 0)
      originalBodyOverflow = document.body.style.overflow;
    dialogStack.push(node);
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    (
      node.querySelector<HTMLElement>("input,select,textarea") ??
      focusables()[0]
    )?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== node) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1)?.focus();
        }
        if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      const index = dialogStack.indexOf(node);
      const wasTop = dialogStack.at(-1) === node;
      if (index !== -1) dialogStack.splice(index, 1);
      if (dialogStack.length === 0)
        document.body.style.overflow = originalBodyOverflow;
      if (wasTop) {
        if (before?.isConnected) before.focus();
        else
          dialogStack
            .at(-1)
            ?.querySelector<HTMLElement>("input,button,select,textarea,a")
            ?.focus();
      }
    };
  }, [onClose]);
  return (
    <div
      data-modal-root
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`${styles.dialog} ${wide ? styles.wideDialog : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.dialogTop}>
          <h2>{title}</h2>
          <button
            className={styles.iconButton}
            onClick={onClose}
            aria-label={copy(locale, "Close", "Uždaryti")}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoginDialog({
  locale,
  onClose,
  onSuccess,
}: {
  locale: Locale;
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (sent) {
        const result = await api<{ user: SessionUser }>(
          "/api/auth/verify",
          "POST",
          { email, code },
        );
        if (!result.user?.email)
          throw new RequestError(
            "Could not verify your session. Please try again.",
            "service_error",
          );
        onSuccess(result.user);
        onClose();
      } else {
        await api("/api/auth/send-code", "POST", { email, locale });
        setSent(true);
      }
    } catch (error) {
      setError(requestError(locale, error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={copy(
        locale,
        sent ? "Check your inbox" : "Welcome, creator.",
        sent ? "Patikrink el. paštą" : "Sveikas, kūrėjau.",
      )}
      onClose={onClose}
      locale={locale}
    >
      <p className={styles.muted}>
        {sent
          ? copy(
              locale,
              `Enter the code sent to ${email}.`,
              `Įvesk kodą, išsiųstą adresu ${email}.`,
            )
          : copy(
              locale,
              "Sign in by email to save a profile to your account. You can also build a local draft without signing in.",
              "Prisijunk el. paštu ir išsaugok profilį paskyroje. Vietinį juodraštį gali kurti ir neprisijungęs.",
            )}
      </p>
      <form onSubmit={submit} className={styles.form}>
        {sent ? (
          <label>
            {copy(locale, "Verification code", "Patvirtinimo kodas")}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
            />
          </label>
        ) : (
          <label>
            {copy(locale, "Email address", "El. pašto adresas")}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.primaryButton} disabled={busy}>
          {busy
            ? copy(locale, "Please wait…", "Palauk…")
            : copy(
                locale,
                sent ? "Verify & continue" : "Continue with email",
                sent ? "Patvirtinti ir tęsti" : "Tęsti el. paštu",
              )}
          <ArrowRight size={16} />
        </button>
        {sent && (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
          >
            <ArrowLeft size={14} />
            {copy(
              locale,
              "Use another email or resend",
              "Keisti adresą arba siųsti dar kartą",
            )}
          </button>
        )}
      </form>
    </Dialog>
  );
}
