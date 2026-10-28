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

import {
  DRAFT_KEY,
  copy,
  creatorLocaleHref,
  parseCreatorDraft,
  profileExport,
  type CreatorProfile,
  type Locale,
} from "./profile-data";
export { copy, emptyProfile, euro } from "./profile-data";
export type { CreatorProfile, Locale } from "./profile-data";
export type SessionUser = { email: string };

export function readDraft(): CreatorProfile | null {
  try {
    return parseCreatorDraft(
      JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"),
    );
  } catch {
    return null;
  }
}
export function saveDraft(profile: CreatorProfile) {
  const checked = parseCreatorDraft({
    version: 1,
    profile: { ...profile, published: false },
  });
  if (!checked)
    throw new RequestError(
      "Please check the profile fields before saving.",
      "validation_error",
    );
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ version: 1, profile: checked }),
    );
  } catch {
    throw new RequestError(
      "This browser could not save your draft. Download your media kit or save to your account instead.",
      "storage_unavailable",
    );
  }
  window.dispatchEvent(new Event("creator-draft-change"));
}
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    throw new RequestError(
      "This browser could not remove the local draft. Please try again.",
      "storage_unavailable",
    );
  }
  window.dispatchEvent(new Event("creator-draft-change"));
}
export function downloadProfile(
  profile: CreatorProfile,
  locale: Locale,
  format: "json" | "html" = "json",
) {
  const url = URL.createObjectURL(
    new Blob([profileExport(profile, locale, format)], {
      type: format === "json" ? "application/json" : "text/html;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${profile.handle || "creator"}-media-kit.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryAfter?: number,
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
    network_error:
      "Ryšys nutrūko. Patikrink interneto ryšį ir bandyk dar kartą.",
    storage_unavailable:
      "Naršyklė negali išsaugoti vietinių duomenų. Atsisiųsk pristatymą arba išsaugok paskyroje.",
  };
  return error instanceof RequestError
    ? (messages[error.code] ?? messages.service_error)
    : "Prisijungti nepavyko. Patikrink ryšį ir bandyk dar kartą.";
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new RequestError(
      "Could not connect. Check your internet connection and try again.",
      "network_error",
    );
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new RequestError(
      "The server returned an unreadable response. Please try again.",
      "service_error",
    );
  if (!response.ok) {
    const retry = Number(response.headers.get("retry-after"));
    throw new RequestError(
      typeof result.error === "string"
        ? result.error
        : result.error?.message ||
          result.message ||
          `Request failed (${response.status})`,
      result.code || result.error?.code || "service_error",
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    );
  }
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
  const languageHref = creatorLocaleHref(pathname, nextLocale, suffix);
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
const focusableSelector =
  'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]';
function syncDialogStack() {
  for (const dialog of dialogStack) {
    const top = dialog === dialogStack.at(-1);
    dialog.inert = !top;
    dialog.setAttribute("aria-modal", String(top));
    if (top) dialog.removeAttribute("aria-hidden");
    else dialog.setAttribute("aria-hidden", "true");
  }
}

export function Dialog({
  title,
  children,
  onClose,
  locale,
  wide = false,
  closeDisabled = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  locale: Locale;
  wide?: boolean;
  closeDisabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ onClose, closeDisabled });
  useEffect(() => {
    latest.current = { onClose, closeDisabled };
  }, [onClose, closeDisabled]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const before = document.activeElement as HTMLElement | null;
    if (dialogStack.length === 0)
      originalBodyOverflow = document.body.style.overflow;
    dialogStack.push(node);
    syncDialogStack();
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) =>
          element.getClientRects().length > 0 && !element.closest("[inert]"),
      );
    const focusFirst = () =>
      (
        node.querySelector<HTMLElement>(
          "input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        ) ??
        focusables()[0] ??
        node
      ).focus();
    focusFirst();
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== node) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!latest.current.closeDisabled) latest.current.onClose();
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) {
          event.preventDefault();
          node.focus();
          return;
        }
        if (
          !node.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === items[0]) ||
          (!event.shiftKey && document.activeElement === items.at(-1))
        ) {
          event.preventDefault();
          (event.shiftKey ? items.at(-1) : items[0])?.focus();
        }
      }
    };
    const focusin = (event: FocusEvent) => {
      if (
        dialogStack.at(-1) === node &&
        event.target instanceof Node &&
        !node.contains(event.target)
      )
        focusFirst();
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      const index = dialogStack.indexOf(node);
      const wasTop = dialogStack.at(-1) === node;
      if (index !== -1) dialogStack.splice(index, 1);
      syncDialogStack();
      if (dialogStack.length === 0)
        document.body.style.overflow = originalBodyOverflow;
      if (wasTop) {
        const next = dialogStack.at(-1);
        if (before?.isConnected && (!next || next.contains(before)))
          before.focus();
        else
          (
            next?.querySelector<HTMLElement>(focusableSelector) ?? next
          )?.focus();
      }
    };
  }, []);
  return (
    <div
      data-modal-root
      className={styles.overlay}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          dialogStack.at(-1) === ref.current &&
          !closeDisabled
        )
          onClose();
      }}
    >
      <div
        ref={ref}
        className={`${styles.dialog} ${wide ? styles.wideDialog : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className={styles.dialogTop}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={closeDisabled}
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
  const [retryUntil, setRetryUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!retryUntil) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)));
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [retryUntil]);
  useEffect(() => {
    if (sent && !busy) codeInput.current?.focus();
  }, [sent, busy]);
  function cooldown(seconds: number) {
    setSeconds(seconds);
    setRetryUntil(Date.now() + seconds * 1000);
  }
  async function request(kind: "send" | "verify") {
    if (inFlight.current || (kind === "send" && Date.now() < retryUntil))
      return;
    const submittedEmail = email.trim().toLowerCase();
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "verify") {
        const result = await api<{ user: SessionUser }>(
          "/api/auth/verify",
          "POST",
          { email: submittedEmail, code },
        );
        if (!result.user?.email)
          throw new RequestError(
            "Could not verify your session. Please try again.",
            "service_error",
          );
        onSuccess(result.user);
        onClose();
      } else {
        const result = await api<{ ok: boolean; retryAfter?: number }>(
          "/api/auth/send-code",
          "POST",
          { email: submittedEmail, locale },
        );
        if (!result.ok)
          throw new RequestError(
            "The email could not be confirmed. Please try again.",
            "service_error",
          );
        setEmail(submittedEmail);
        setSent(true);
        setCode("");
        cooldown(
          Number.isFinite(result.retryAfter) && result.retryAfter! > 0
            ? result.retryAfter!
            : 60,
        );
      }
    } catch (error) {
      if (error instanceof RequestError && error.retryAfter)
        cooldown(error.retryAfter);
      setError(requestError(locale, error));
    } finally {
      inFlight.current = false;
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
      closeDisabled={busy}
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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void request(sent ? "verify" : "send");
        }}
        className={styles.form}
        aria-busy={busy}
      >
        {sent ? (
          <label>
            {copy(locale, "Verification code", "Patvirtinimo kodas")}
            <input
              ref={codeInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={busy}
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
              maxLength={254}
              disabled={busy}
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
        <button
          className={styles.primaryButton}
          disabled={busy || (!sent && seconds > 0)}
        >
          {busy
            ? copy(locale, "Please wait…", "Palauk…")
            : !sent && seconds > 0
              ? copy(
                  locale,
                  `Try again in ${seconds}s`,
                  `Bandyk po ${seconds} sek.`,
                )
              : copy(
                  locale,
                  sent ? "Verify & continue" : "Continue with email",
                  sent ? "Patvirtinti ir tęsti" : "Tęsti el. paštu",
                )}
          <ArrowRight size={16} />
        </button>
        {sent && (
          <div className={styles.exportActions}>
            <button
              type="button"
              className={styles.textButton}
              disabled={busy || seconds > 0}
              onClick={() => void request("send")}
            >
              {seconds > 0
                ? copy(
                    locale,
                    `Resend in ${seconds}s`,
                    `Siųsti po ${seconds} sek.`,
                  )
                : copy(locale, "Resend code", "Siųsti kodą dar kartą")}
            </button>
            <button
              type="button"
              className={styles.textButton}
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setError("");
              }}
            >
              <ArrowLeft size={14} />
              {copy(locale, "Use another email", "Keisti el. pašto adresą")}
            </button>
          </div>
        )}
      </form>
    </Dialog>
  );
}
