"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Copy,
  Download,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { ProfileEditor, ProfilePreview } from "./CreatorLanding";
import {
  api,
  clearDraft,
  copy,
  CreatorFooter,
  CreatorHeader,
  downloadProfile,
  LoginDialog,
  readDraft,
  requestError,
  RequestError,
  saveDraft,
  type CreatorProfile,
  type Locale,
  type SessionUser,
} from "./Shared";
import styles from "./Creator.module.css";
import { parseCreatorProfile } from "./profile-data";

export function CreatorDashboard({ locale }: { locale: Locale }) {
  const [local, setLocal] = useState<CreatorProfile | null>(null);
  const [remote, setRemote] = useState<CreatorProfile | null>(null);
  const [source, setSource] = useState<"local" | "account">("local");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState(false);
  const [editor, setEditor] = useState<CreatorProfile | null>(null);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState<CreatorProfile | null>(null);
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountRequest = useRef<AbortController | null>(null);
  const logoutFlight = useRef(false);
  const profile = source === "account" ? remote : local;
  const closeLogin = useCallback(() => setLogin(false), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const loadAccount = useCallback(() => {
    if (logoutFlight.current) return Promise.resolve();
    accountRequest.current?.abort();
    const controller = new AbortController();
    accountRequest.current = controller;
    return api<{ user: SessionUser | null }>(
      "/api/auth/session",
      "GET",
      undefined,
      { signal: controller.signal },
    )
      .then(async (session) => {
        if (controller.signal.aborted) return;
        if (session.user !== null && !session.user?.email)
          throw new RequestError(
            "Your account session could not be read. Please try again.",
            "service_error",
          );
        setUser(session.user);
        if (!session.user) {
          setRemote(null);
          setSource("local");
          return;
        }
        const result = await api<{ profile: unknown }>(
          "/api/creator",
          "GET",
          undefined,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const profile =
          result.profile === null ? null : parseCreatorProfile(result.profile);
        if (result.profile !== null && !profile)
          throw new RequestError(
            "Your saved profile could not be read. Please try again.",
            "service_error",
          );
        setRemote(profile);
        if (profile) setSource("account");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setAccountError(requestError(locale, error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAccountLoading(false);
          setLoading(false);
        }
      });
  }, [locale]);
  useEffect(() => {
    const update = () => {
      const draft = readDraft();
      setLocal(draft);
      if (draft) setDeleted(null);
    };
    update();
    window.addEventListener("creator-draft-change", update);
    window.addEventListener("storage", update);
    void loadAccount();
    return () => {
      accountRequest.current?.abort();
      window.removeEventListener("creator-draft-change", update);
      window.removeEventListener("storage", update);
    };
  }, [loadAccount]);
  async function logout() {
    if (logoutFlight.current) return;
    logoutFlight.current = true;
    accountRequest.current?.abort();
    setAccountLoading(false);
    setLoading(false);
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", "POST");
      setUser(null);
      setRemote(null);
      setSource("local");
      setAccountError("");
      setMessage(
        copy(
          locale,
          "Signed out. Your local draft remains on this device.",
          "Atsijungei. Vietinis juodraštis liko šiame įrenginyje.",
        ),
      );
    } catch (error) {
      setMessage(requestError(locale, error));
    } finally {
      logoutFlight.current = false;
      setLoggingOut(false);
    }
  }
  async function share() {
    if (!profile?.published || source !== "account") return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/${locale}/creators/${encodeURIComponent(profile.handle)}`,
      );
      setMessage(
        copy(
          locale,
          "Public profile link copied.",
          "Viešo profilio nuoroda nukopijuota.",
        ),
      );
    } catch {
      setMessage(
        copy(
          locale,
          "Clipboard access failed. Open your public page and copy its URL.",
          "Nepavyko kopijuoti. Atidaryk viešą puslapį ir nukopijuok jo adresą.",
        ),
      );
    }
  }
  function removeLocal() {
    if (
      !local ||
      !window.confirm(
        copy(
          locale,
          "Remove the creator draft saved on this device? Your online profile will not be changed.",
          "Pašalinti šiame įrenginyje išsaugotą kūrėjo juodraštį? Profilis internete nebus keičiamas.",
        ),
      )
    )
      return;
    try {
      clearDraft();
      setDeleted(local);
      setMessage(
        copy(
          locale,
          "Local draft removed. You can undo this below.",
          "Vietinis juodraštis pašalintas. Toliau gali atšaukti veiksmą.",
        ),
      );
    } catch (error) {
      setMessage(requestError(locale, error));
    }
  }
  function undoRemoval() {
    if (!deleted) return;
    if (readDraft()) {
      setDeleted(null);
      return;
    }
    try {
      saveDraft(deleted);
      setDeleted(null);
      setSource("local");
      setMessage(copy(locale, "Draft restored.", "Juodraštis atkurtas."));
    } catch (error) {
      setMessage(requestError(locale, error));
    }
  }
  return (
    <div className={styles.page}>
      <CreatorHeader
        locale={locale}
        active="dashboard"
        onLogin={user ? undefined : () => setLogin(true)}
      />
      <main className={styles.dashboard}>
        <div className={styles.dashboardTitle}>
          <div>
            <span className={styles.eyebrow}>
              {copy(locale, "Your creator space", "Tavo kūrėjo erdvė")}
            </span>
            <h1>
              {copy(locale, "A little more possible.", "Daugiau galimybių.")}
            </h1>
            <p className={styles.muted}>
              {user
                ? user.email
                : copy(
                    locale,
                    "Local mode · your draft stays in this browser",
                    "Vietinis režimas · juodraštis saugomas šioje naršyklėje",
                  )}
            </p>
          </div>
          {user && (
            <button
              className={styles.secondaryButton}
              disabled={loggingOut}
              onClick={() => void logout()}
            >
              <LogOut size={16} />
              {copy(locale, "Log out", "Atsijungti")}
            </button>
          )}
        </div>
        {message && (
          <div role="status" className={styles.inlineNotice}>
            {message}
            <button
              className={styles.iconButton}
              onClick={() => setMessage("")}
              aria-label={copy(locale, "Dismiss", "Uždaryti")}
            >
              ×
            </button>
          </div>
        )}
        {accountError && (
          <div className={styles.inlineNotice} role="alert">
            <span>{accountError}</span>
            <button
              className={styles.textButton}
              disabled={accountLoading || loggingOut}
              onClick={() => {
                setAccountError("");
                setAccountLoading(true);
                void loadAccount();
              }}
            >
              {copy(locale, "Retry account", "Bandyti įkelti paskyrą")}
            </button>
          </div>
        )}
        {deleted && (
          <button className={styles.textButton} onClick={undoRemoval}>
            <Undo2 size={16} />
            {copy(locale, "Undo removal", "Atšaukti pašalinimą")}
          </button>
        )}
        {loading ? (
          <p className={styles.muted}>
            {copy(locale, "Loading your space…", "Įkeliama tavo erdvė…")}
          </p>
        ) : (
          <>
            <div className={styles.sourceTabs}>
              <button
                aria-pressed={source === "local"}
                disabled={loggingOut}
                onClick={() => setSource("local")}
              >
                {copy(locale, "On this device", "Šiame įrenginyje")}
              </button>
              <button
                aria-pressed={source === "account"}
                disabled={loggingOut}
                onClick={() => {
                  if (!user) {
                    setLogin(true);
                    return;
                  }
                  setSource("account");
                  setAccountError("");
                  setAccountLoading(true);
                  void loadAccount();
                }}
              >
                {copy(locale, "My account", "Mano paskyra")}
                {!user && <span>↗</span>}
              </button>
            </div>
            <div className={styles.dashboardGrid}>
              <section>
                {profile ? (
                  <>
                    <ProfilePreview
                      profile={profile}
                      locale={locale}
                      publicView={source === "account" && profile.published}
                      saved={source}
                    />
                    <div className={styles.dashboardActions}>
                      <button
                        className={styles.primaryButton}
                        disabled={accountLoading || loggingOut}
                        onClick={() => setEditor(profile)}
                      >
                        <Pencil size={16} />
                        {copy(locale, "Edit my page", "Redaguoti puslapį")}
                      </button>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => downloadProfile(profile, locale, "html")}
                      >
                        <Download size={16} />
                        {copy(locale, "Media kit", "Pristatymas")}
                      </button>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => downloadProfile(profile, locale)}
                      >
                        <FileText size={16} />
                        JSON
                      </button>
                      {source === "account" && profile.published && (
                        <>
                          <button
                            className={styles.secondaryButton}
                            onClick={() => void share()}
                          >
                            <Copy size={15} />
                            {copy(
                              locale,
                              "Copy public link",
                              "Kopijuoti viešą nuorodą",
                            )}
                          </button>
                          <Link
                            href={`/${locale}/creators/${encodeURIComponent(profile.handle)}`}
                            className={styles.textButton}
                          >
                            {copy(
                              locale,
                              "Open public page",
                              "Atidaryti viešą puslapį",
                            )}
                            <ArrowRight size={15} />
                          </Link>
                        </>
                      )}
                      {source === "local" && (
                        <button
                          className={styles.deleteButton}
                          onClick={removeLocal}
                        >
                          <Trash2 size={15} />
                          {copy(
                            locale,
                            "Remove local draft",
                            "Pašalinti vietinį juodraštį",
                          )}
                        </button>
                      )}
                    </div>
                  </>
                ) : source === "account" && (accountLoading || accountError) ? (
                  <div className={styles.emptyProfile}>
                    <p>
                      {accountLoading
                        ? copy(
                            locale,
                            "Loading your account profile…",
                            "Įkeliamas paskyros profilis…",
                          )
                        : copy(
                            locale,
                            "Your account profile is unavailable. Retry above or open the draft saved on this device.",
                            "Paskyros profilis nepasiekiamas. Bandyk dar kartą arba atidaryk šiame įrenginyje išsaugotą juodraštį.",
                          )}
                    </p>
                  </div>
                ) : (
                  <div className={styles.emptyProfile}>
                    <UserMark />
                    <h2>
                      {copy(
                        locale,
                        "Your page starts here.",
                        "Čia prasideda tavo puslapis.",
                      )}
                    </h2>
                    <p>
                      {copy(
                        locale,
                        source === "local"
                          ? "There is no creator draft on this device yet. Start with your handle and make it yours."
                          : "You have no saved profile in this account. Create a draft, then save it to your account.",
                        source === "local"
                          ? "Šiame įrenginyje dar nėra kūrėjo juodraščio. Pradėk nuo naudotojo vardo."
                          : "Šioje paskyroje dar nėra profilio. Sukurk juodraštį ir išsaugok jį paskyroje.",
                      )}
                    </p>
                    <Link
                      className={styles.primaryButton}
                      href={`/${locale}/creators`}
                    >
                      <Plus size={16} />
                      {copy(locale, "Build my page", "Kurti puslapį")}
                    </Link>
                  </div>
                )}
              </section>
              <aside className={styles.dashboardAside}>
                <section>
                  <span className={styles.eyebrow}>
                    {copy(locale, "Campaigns", "Kampanijos")}
                  </span>
                  <Users size={28} className={styles.emptyIcon} />
                  <h3>
                    {copy(locale, "No campaigns yet", "Kampanijų dar nėra")}
                  </h3>
                  <p>
                    {copy(
                      locale,
                      "This workspace does not create or promise paid bookings. A clear media kit is a good place to start your next conversation.",
                      "Ši erdvė nekuria ir nežada apmokamų užsakymų. Aiškus pristatymas – gera kito pokalbio pradžia.",
                    )}
                  </p>
                  <Link
                    className={styles.textButton}
                    href={`/${locale}/brands`}
                  >
                    {copy(locale, "Plan a campaign", "Planuoti kampaniją")}
                    <ArrowRight size={14} />
                  </Link>
                </section>
                <section>
                  <span className={styles.eyebrow}>
                    {copy(locale, "Make it useful", "Pasiruošk")}
                  </span>
                  <ul>
                    <li>
                      {copy(
                        locale,
                        "Tell brands what your audience cares about",
                        "Papasakok, kas rūpi tavo auditorijai",
                      )}
                    </li>
                    <li>
                      {copy(
                        locale,
                        "Keep your rate and deliverables clear",
                        "Aiškiai nurodyk įkainį ir darbus",
                      )}
                    </li>
                    <li>
                      {copy(
                        locale,
                        "Share a media kit you can stand behind",
                        "Dalykis tiksliu pristatymu",
                      )}
                    </li>
                  </ul>
                  <p className={styles.finePrint}>
                    {copy(
                      locale,
                      "Only profiles explicitly published from a signed-in account have public links. Local drafts are private to this device.",
                      "Viešas nuorodas turi tik prisijungus paskelbti profiliai. Vietiniai juodraščiai lieka šiame įrenginyje.",
                    )}
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
      <CreatorFooter locale={locale} />
      {editor && (
        <ProfileEditor
          initial={editor}
          locale={locale}
          user={user}
          onClose={closeEditor}
          onLogin={() => setLogin(true)}
          onSaved={(updated, online) => {
            accountRequest.current?.abort();
            setAccountLoading(false);
            setLoading(false);
            setAccountError("");
            setEditor(null);
            setDeleted(null);
            if (online) {
              setRemote(updated);
              setSource("account");
            } else {
              setLocal(updated);
              setSource("local");
            }
            setMessage(
              copy(
                locale,
                online
                  ? "Profile saved to your account."
                  : "Draft saved on this device.",
                online
                  ? "Profilis išsaugotas paskyroje."
                  : "Juodraštis išsaugotas šiame įrenginyje.",
              ),
            );
          }}
        />
      )}
      {login && (
        <LoginDialog
          locale={locale}
          onClose={closeLogin}
          onSuccess={(next) => {
            setUser(next);
            setAccountError("");
            setAccountLoading(true);
            void loadAccount();
          }}
        />
      )}
    </div>
  );
}
function UserMark() {
  return (
    <div className={styles.emptyMark}>
      <span /> <span /> <span />
    </div>
  );
}
