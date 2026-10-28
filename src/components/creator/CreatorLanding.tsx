"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Download,
  Heart,
  MessageSquare,
  Pencil,
  UserRound,
} from "lucide-react";
import {
  api,
  copy,
  CreatorFooter,
  CreatorHeader,
  Dialog,
  downloadProfile,
  emptyProfile,
  euro,
  LoginDialog,
  readDraft,
  requestError,
  saveDraft,
  type CreatorProfile,
  type Locale,
  type SessionUser,
} from "./Shared";
import styles from "./Creator.module.css";

function normalizeHandle(value: string, platform: "x" | "linkedin") {
  const raw = value.trim();
  if (platform === "linkedin")
    return (
      raw.match(
        /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]{3,100})\/?(?:[?#].*)?$/,
      )?.[1] ?? null
    );
  const match = raw.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/@?([a-zA-Z0-9_]{1,15})\/?(?:[?#].*)?$/i,
  );
  const handle = match?.[1] ?? raw.replace(/^@/, "");
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle) ? handle : null;
}

export function ProfilePreview({
  profile,
  locale,
  publicView = false,
}: {
  profile: CreatorProfile;
  locale: Locale;
  publicView?: boolean;
}) {
  return (
    <article className={styles.profilePreview}>
      <div className={styles.profileBanner}>
        <Image
          width={1440}
          height={200}
          unoptimized
          src="/vilnius-skyline.svg"
          alt=""
        />
      </div>
      <div className={styles.profileBody}>
        <div className={styles.profileAvatar}>
          {profile.name.trim().slice(0, 1).toUpperCase() || (
            <UserRound size={30} />
          )}
        </div>
        <span className={styles.microBadge}>
          {copy(
            locale,
            publicView
              ? "Published profile · self-reported"
              : "Preview · saved on this device",
            publicView
              ? "Viešas profilis · pateikti duomenys"
              : "Peržiūra · saugoma šiame įrenginyje",
          )}
        </span>
        <h2>{profile.name || copy(locale, "Your name", "Tavo vardas")}</h2>
        <p className={styles.muted}>
          @{profile.handle} · {profile.location}
        </p>
        <p className={styles.bio}>
          {profile.bio ||
            copy(
              locale,
              "A few words about what you create and who you reach.",
              "Keli žodžiai apie tavo kūrybą ir auditoriją.",
            )}
        </p>
        {profile.niche && <span className={styles.topic}>{profile.niche}</span>}
        <div className={styles.profileRate}>
          <div>
            <strong>
              {copy(locale, "Sponsored post", "Reklaminis įrašas")}
            </strong>
            <small>
              {copy(
                locale,
                "Scope and terms agreed with the brand",
                "Apimtis ir sąlygos derinamos su prekių ženklu",
              )}
            </small>
          </div>
          <b>{euro(profile.rate, locale)}</b>
        </div>
        <p className={styles.finePrint}>
          {copy(
            locale,
            "Self-reported information. X / LinkedIn identity is unverified. Publishing here does not connect a social account.",
            "Kūrėjo pateikti duomenys. X / LinkedIn tapatybė nepatvirtinta. Publikavimas čia nesujungia socialinės paskyros.",
          )}
        </p>
      </div>
    </article>
  );
}

export function ProfileEditor({
  initial,
  locale,
  user,
  onSaved,
  onClose,
  onLogin,
}: {
  initial: CreatorProfile;
  locale: Locale;
  user: SessionUser | null;
  onSaved: (profile: CreatorProfile, remote: boolean) => void;
  onClose: () => void;
  onLogin: () => void;
}) {
  const [profile, setProfile] = useState(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(initial.published);
  const labels = copy(
    locale,
    ["Your profile", "Your rates", "Preview & save"],
    ["Tavo profilis", "Tavo įkainiai", "Peržiūra ir išsaugojimas"],
  );
  const topics = copy(
    locale,
    [
      "Technology & startups",
      "Food & coffee",
      "Design & culture",
      "Travel & city life",
      "Sustainability",
      "Business & education",
      "Other",
    ],
    [
      "Technologijos ir startuoliai",
      "Maistas ir kava",
      "Dizainas ir kultūra",
      "Kelionės ir miesto gyvenimas",
      "Tvarumas",
      "Verslas ir švietimas",
      "Kita",
    ],
  );
  const update = <K extends keyof CreatorProfile>(
    key: K,
    value: CreatorProfile[K],
  ) => setProfile((current) => ({ ...current, [key]: value }));
  async function save(remote: boolean) {
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...profile,
        name: profile.name.trim(),
        handle: profile.handle.trim(),
        published: remote && publish,
      };
      if (remote) {
        const result = await api<{ profile: CreatorProfile }>(
          "/api/creator",
          "PUT",
          {
            profile: {
              name: payload.name,
              handle: payload.handle,
              bio: payload.bio,
              location: payload.location,
              niche: payload.niche,
              rate: payload.rate,
              published: payload.published,
            },
          },
        );
        saveDraft({ ...payload, published: false });
        onSaved(result.profile ?? payload, true);
      } else {
        saveDraft(payload);
        onSaved({ ...payload, published: false }, false);
      }
    } catch (error) {
      setError(requestError(locale, error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      wide
      title={copy(locale, "Build your creator page", "Sukurk kūrėjo puslapį")}
      locale={locale}
      onClose={onClose}
    >
      <ol className={styles.steps}>
        {labels.map((label, index) => (
          <li key={label} data-active={step === index} data-done={step > index}>
            <span>{step > index ? <Check size={12} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <p className={styles.localNotice}>
        {copy(
          locale,
          profile.platform === "linkedin"
            ? "LinkedIn draft mode. Profile links are stored locally; no account is connected."
            : "Your X handle is unverified. Drafts can be saved on this device without an account.",
          profile.platform === "linkedin"
            ? "LinkedIn juodraščio režimas. Nuoroda saugoma vietoje; paskyra neprijungiama."
            : "Tavo X vardas nepatvirtintas. Juodraščius gali išsaugoti šiame įrenginyje be paskyros.",
        )}
      </p>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          if (
            step === 0 &&
            (!profile.name.trim() ||
              !profile.location.trim() ||
              profile.bio.trim().length < 10)
          ) {
            setError(
              copy(
                locale,
                "Add your name, location and at least 10 characters about yourself.",
                "Įvesk vardą, miestą ir bent 10 simbolių apie save.",
              ),
            );
            return;
          }
          if (step < 2) setStep(step + 1);
          else void save(false);
        }}
      >
        {step === 0 && (
          <div className={styles.fieldGrid}>
            <label>
              {copy(locale, "Your name", "Tavo vardas")}
              <input
                required
                maxLength={80}
                value={profile.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder={copy(
                  locale,
                  "First and last name",
                  "Vardas ir pavardė",
                )}
              />
            </label>
            <label>
              {copy(locale, "Handle", "Naudotojo vardas")}
              <input
                required
                pattern={
                  profile.platform === "linkedin"
                    ? "[a-zA-Z0-9-]{3,100}"
                    : "[a-zA-Z0-9_]{1,15}"
                }
                maxLength={profile.platform === "linkedin" ? 100 : 15}
                value={profile.handle}
                onChange={(event) =>
                  update("handle", event.target.value.replace(/^@/, ""))
                }
              />
            </label>
            <label>
              {copy(locale, "Based in", "Miestas")}
              <input
                required
                maxLength={100}
                value={profile.location}
                onChange={(event) => update("location", event.target.value)}
              />
            </label>
            <label>
              {copy(locale, "What you create", "Tavo kūrybos sritis")}
              <select
                required
                value={profile.niche}
                onChange={(event) => update("niche", event.target.value)}
              >
                <option value="">
                  {copy(locale, "Choose a topic", "Pasirink temą")}
                </option>
                {profile.niche && !topics.includes(profile.niche) && (
                  <option value={profile.niche}>{profile.niche}</option>
                )}
                {topics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label className={styles.fullField}>
              {copy(
                locale,
                "Tell brands about yourself",
                "Prisistatyk prekių ženklams",
              )}
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                value={profile.bio}
                onChange={(event) => update("bio", event.target.value)}
                placeholder={copy(
                  locale,
                  "What you make, who you reach, and why it matters.",
                  "Ką kuri, ką pasieki ir kodėl tai svarbu.",
                )}
              />
              <small>{profile.bio.length}/500</small>
            </label>
          </div>
        )}
        {step === 1 && (
          <div className={styles.rateEditor}>
            <span className={styles.eyebrow}>
              {copy(locale, "You set the price", "Kainą nustatai tu")}
            </span>
            <h3>
              {copy(
                locale,
                "What is a post worth to you?",
                "Kiek vertas tavo įrašas?",
              )}
            </h3>
            <p className={styles.muted}>
              {copy(
                locale,
                "Set an indicative price for one sponsored post. Your final agreement can include production, usage rights and other deliverables.",
                "Nustatyk preliminarią vieno reklaminio įrašo kainą. Galutinėje sutartyje gali būti aptarta kūryba, naudojimo teisės ir kiti darbai.",
              )}
            </p>
            <label className={styles.rateInput}>
              <span>€</span>
              <input
                aria-label={copy(
                  locale,
                  "Price per sponsored post in euros",
                  "Reklaminio įrašo kaina eurais",
                )}
                type="number"
                min={0}
                max={100000}
                step={1}
                required
                value={profile.rate}
                onChange={(event) => update("rate", Number(event.target.value))}
              />
              <span>/ {copy(locale, "post", "įrašą")}</span>
            </label>
            <input
              aria-label={copy(locale, "Adjust your rate", "Keisk įkainį")}
              type="range"
              min={0}
              max={1000}
              step={5}
              value={Math.min(profile.rate, 1000)}
              onChange={(event) => update("rate", Number(event.target.value))}
            />
            <div className={styles.rangeLabels}>
              <span>€0</span>
              <span>€1,000</span>
            </div>
            <p className={styles.finePrint}>
              {copy(
                locale,
                "This is your asking price, not a verified Vilnius market rate or a guaranteed booking.",
                "Tai tavo prašoma kaina, o ne patvirtintas Vilniaus rinkos įkainis ar garantuotas užsakymas.",
              )}
            </p>
          </div>
        )}
        {step === 2 && (
          <>
            <ProfilePreview profile={profile} locale={locale} />
            {user && profile.platform !== "linkedin" && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(event) => setPublish(event.target.checked)}
                />
                <span>
                  {copy(
                    locale,
                    "Publish this profile publicly when saving to my account",
                    "Išsaugant paskyroje paskelbti šį profilį viešai",
                  )}
                </span>
              </label>
            )}
          </>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.editorActions}>
          {step > 0 && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setStep(step - 1)}
            >
              {copy(locale, "Back", "Atgal")}
            </button>
          )}
          <button className={styles.primaryButton} disabled={busy}>
            {copy(
              locale,
              step < 2 ? "Continue" : busy ? "Saving…" : "Save on this device",
              step < 2
                ? "Tęsti"
                : busy
                  ? "Saugoma…"
                  : "Išsaugoti šiame įrenginyje",
            )}
            <ArrowRight size={16} />
          </button>
        </div>
        {step === 2 && (
          <div className={styles.exportActions}>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => downloadProfile(profile, locale, "html")}
            >
              <Download size={15} />
              {copy(locale, "Download media kit", "Atsisiųsti pristatymą")}
            </button>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => downloadProfile(profile, locale)}
            >
              <Download size={15} />
              JSON
            </button>
            {profile.platform !== "linkedin" &&
              (user ? (
                <button
                  className={styles.textButton}
                  type="button"
                  disabled={busy}
                  onClick={() => void save(true)}
                >
                  {copy(locale, "Save to my account", "Išsaugoti paskyroje")}
                </button>
              ) : (
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={onLogin}
                >
                  {copy(
                    locale,
                    "Sign in to save online",
                    "Prisijungti ir išsaugoti internete",
                  )}
                </button>
              ))}
          </div>
        )}
      </form>
    </Dialog>
  );
}

function AttentionGame({ locale }: { locale: Locale }) {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(15);
  const [target, setTarget] = useState(0);
  const spots = [
    [16, 58],
    [67, 30],
    [42, 65],
    [80, 61],
    [25, 29],
    [58, 46],
  ];
  const collect = useCallback(() => {
    if (running) {
      setScore((value) => value + 1);
      setTarget((value) => (value + 1) % spots.length);
    }
  }, [running, spots.length]);
  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + 15000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) setRunning(false);
    }, 250);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <section className={styles.gameSection}>
      <div>
        <span className={styles.eyebrow}>
          {copy(
            locale,
            "A little attention break",
            "Truputis dėmesio žaidimui",
          )}
        </span>
        <h2>
          {copy(locale, "Catch a little love.", "Pagauk šiek tiek meilės.")}
        </h2>
        <p>
          {copy(
            locale,
            "15 seconds. Tap the heart, or focus the game and press Space. Just for fun.",
            "15 sekundžių. Spausk širdelę arba pažymėk žaidimą ir spausk tarpą. Tiesiog pramogai.",
          )}
        </p>
      </div>
      <div
        className={styles.game}
        tabIndex={0}
        role="group"
        aria-label={copy(
          locale,
          "Catch hearts game. Press Space to collect.",
          "Širdelių žaidimas. Spausk tarpą ir rink širdeles.",
        )}
        onKeyDown={(event) => {
          if (event.code === "Space") {
            event.preventDefault();
            if (running) collect();
            else {
              setScore(0);
              setSeconds(15);
              setTarget(0);
              setRunning(true);
            }
          }
        }}
      >
        <div className={styles.gameStats}>
          <span>♥ {score}</span>
          <span>{seconds}s</span>
        </div>
        <Image
          width={1440}
          height={200}
          unoptimized
          src="/vilnius-skyline.svg"
          alt=""
        />
        {running ? (
          <button
            style={{
              left: `${spots[target][0]}%`,
              top: `${spots[target][1]}%`,
            }}
            className={styles.gameHeart}
            onClick={collect}
            aria-label={copy(locale, "Collect heart", "Pagauti širdelę")}
          >
            <Heart fill="currentColor" size={32} />
          </button>
        ) : (
          <div className={styles.gameStart}>
            {seconds === 0 && (
              <p role="status">
                {copy(
                  locale,
                  `You caught ${score} hearts.`,
                  `Pagavai ${score} širdelių.`,
                )}
              </p>
            )}
            <button
              className={styles.smallButton}
              onClick={() => {
                setScore(0);
                setSeconds(15);
                setTarget(0);
                setRunning(true);
              }}
            >
              {copy(
                locale,
                seconds === 0 ? "Play again" : "Play",
                seconds === 0 ? "Žaisti dar kartą" : "Žaisti",
              )}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function CreatorLanding({
  locale,
  handle,
}: {
  locale: Locale;
  handle?: string;
}) {
  const [input, setInput] = useState(handle ?? "");
  const [platform, setPlatform] = useState<"x" | "linkedin">("x");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<CreatorProfile | null>(null);
  const [login, setLogin] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notice, setNotice] = useState("");
  const [publicProfile, setPublicProfile] = useState<CreatorProfile | null>(
    null,
  );
  const [loadingPublic, setLoadingPublic] = useState(!!handle);
  const [sampleRate, setSampleRate] = useState(80);
  const [sampleAccepted, setSampleAccepted] = useState(false);
  const [task, setTask] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void api<{ user: SessionUser | null }>("/api/auth/session")
      .then((value) => setUser(value.user))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!handle) return;
    let active = true;
    void api<{ profile: CreatorProfile }>(
      `/api/creator/public/${encodeURIComponent(handle)}`,
    )
      .then((result) => {
        if (active) setPublicProfile(result.profile);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingPublic(false);
      });
    return () => {
      active = false;
    };
  }, [handle]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeLogin = useCallback(() => setLogin(false), []);
  function build(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeHandle(input, platform);
    if (!normalized)
      return setError(
        copy(
          locale,
          platform === "x"
            ? "Use 1–15 letters, numbers or underscores, or an X profile URL."
            : "Enter a LinkedIn profile link: linkedin.com/in/your-name.",
          platform === "x"
            ? "Naudok 1–15 raidžių, skaitmenų arba apatinių brūkšnių, arba X profilio nuorodą."
            : "Įvesk LinkedIn profilio nuorodą: linkedin.com/in/tavo-vardas.",
        ),
      );
    setError("");
    const previous = readDraft();
    setEditor(
      previous?.handle === normalized
        ? previous
        : {
            ...emptyProfile(normalized),
            location: copy(locale, "Vilnius, Lithuania", "Vilnius, Lietuva"),
            platform,
            profileUrl:
              platform === "linkedin"
                ? `https://linkedin.com/in/${normalized}`
                : undefined,
          },
    );
  }
  const handleForm = (
    <form onSubmit={build} className={styles.handleForm}>
      <div className={styles.handleInput}>
        <span aria-hidden="true" className={styles.xMark}>
          {platform === "x" ? "𝕏" : "in"}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError("");
          }}
          placeholder={copy(
            locale,
            platform === "x"
              ? "Enter your X handle"
              : "Your LinkedIn profile link",
            platform === "x"
              ? "Įvesk X naudotojo vardą"
              : "Tavo LinkedIn profilio nuoroda",
          )}
          aria-label={copy(locale, "Your profile", "Tavo profilis")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className={styles.primaryButton}>
          {copy(locale, "Build my page", "Kurti puslapį")}
          <ArrowRight size={16} />
        </button>
      </div>
      <div
        className={styles.platformToggle}
        aria-label={copy(locale, "Where you post", "Kur kuri")}
      >
        <button
          type="button"
          aria-pressed={platform === "x"}
          onClick={() => {
            setPlatform("x");
            setError("");
          }}
        >
          𝕏 &nbsp;X (Twitter)
        </button>
        <button
          type="button"
          aria-pressed={platform === "linkedin"}
          onClick={() => {
            setPlatform("linkedin");
            setError("");
          }}
        >
          <b>in</b>&nbsp; LinkedIn
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
  return (
    <div className={styles.page}>
      <CreatorHeader locale={locale} onLogin={() => setLogin(true)} />
      {loadingPublic ? (
        <main className={styles.publicWrap}>
          <p>{copy(locale, "Loading profile…", "Įkeliamas profilis…")}</p>
        </main>
      ) : publicProfile ? (
        <main className={styles.publicWrap}>
          <Link className={styles.textButton} href={`/${locale}/creators`}>
            {copy(locale, "Create your own page", "Sukurk savo puslapį")}
            <ArrowUpRight size={15} />
          </Link>
          <ProfilePreview profile={publicProfile} locale={locale} publicView />
          <button
            className={styles.secondaryButton}
            onClick={() => downloadProfile(publicProfile, locale, "html")}
          >
            <Download size={16} />
            {copy(locale, "Download media kit", "Atsisiųsti pristatymą")}
          </button>
        </main>
      ) : (
        <>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                {copy(
                  locale,
                  "Vilnius, Lithuania · creators",
                  "Vilnius, Lietuva · kūrėjams",
                )}
              </span>
              <h1>
                {copy(
                  locale,
                  <>
                    Where Vilnius
                    <br />
                    creators work
                    <br />
                    with ambitious
                    <br />
                    <em>brands.</em>
                  </>,
                  <>
                    Kur Vilniaus
                    <br />
                    kūrėjai kuria
                    <br />
                    su ambicingais
                    <br />
                    <em>prekių ženklais.</em>
                  </>,
                )}
              </h1>
              <p className={styles.heroLead}>
                {copy(
                  locale,
                  "Your audience. Your rates. Your next chapter. Build a page that shows what you bring to the table.",
                  "Tavo auditorija. Tavo įkainiai. Tavo naujas etapas. Sukurk puslapį, atskleidžiantį tavo kūrybos vertę.",
                )}
              </p>
              {handleForm}
              <p className={styles.heroNote}>
                {copy(
                  locale,
                  "Start with a free local draft. No social account password needed.",
                  "Pradėk nuo nemokamo vietinio juodraščio. Socialinės paskyros slaptažodžio nereikia.",
                )}
              </p>
            </div>
            <div
              className={styles.heroArt}
              aria-label={copy(
                locale,
                "Illustrative campaign cards",
                "Pavyzdinės kampanijų kortelės",
              )}
            >
              <div className={styles.artOrbit} />
              <span className={styles.artLabel}>
                {copy(
                  locale,
                  "Example campaigns · not live bookings",
                  "Kampanijų pavyzdžiai · ne tikri užsakymai",
                )}
              </span>
              {[
                {
                  letter: "S",
                  name: copy(
                    locale,
                    "Vilnius design studio",
                    "Vilniaus dizaino studija",
                  ),
                  text: copy(
                    locale,
                    "A launch story, in your voice",
                    "Pristatymo istorija tavo balsu",
                  ),
                  rate: 120,
                },
                {
                  letter: "K",
                  name: copy(
                    locale,
                    "Old Town coffee project",
                    "Senamiesčio kavos projektas",
                  ),
                  text: copy(
                    locale,
                    "A neighbourhood worth sharing",
                    "Rajonas, kuriuo verta pasidalyti",
                  ),
                  rate: 80,
                },
                {
                  letter: "V",
                  name: copy(
                    locale,
                    "Local technology team",
                    "Vietinė technologijų komanda",
                  ),
                  text: copy(
                    locale,
                    "One idea. A new audience.",
                    "Viena idėja. Nauja auditorija.",
                  ),
                  rate: 200,
                },
              ].map((card, index) => (
                <div
                  key={card.letter}
                  className={`${styles.orderCard} ${styles[`order${index}`]}`}
                >
                  <span className={styles.orderLogo}>{card.letter}</span>
                  <div>
                    <strong>{card.name}</strong>
                    <p>{card.text}</p>
                  </div>
                  <b>{euro(card.rate, locale)}</b>
                </div>
              ))}
              <span className={styles.floatHeart}>
                <Heart fill="currentColor" />
              </span>
              <span className={styles.floatMessage}>
                <MessageSquare fill="currentColor" />
              </span>
              <div className={styles.cityArt}>
                <Image
                  width={1440}
                  height={200}
                  unoptimized
                  src="/vilnius-skyline.svg"
                  alt={copy(
                    locale,
                    "Pixel illustration of Vilnius landmarks",
                    "Vilniaus įžymybių pikselinė iliustracija",
                  )}
                />
              </div>
            </div>
          </section>
          <main className={styles.features}>
            <section className={`${styles.feature} ${styles.wideFeature}`}>
              <div>
                <span className={styles.eyebrow}>
                  01 /{" "}
                  {copy(
                    locale,
                    "Good work finds good company",
                    "Geri darbai randa gerą draugiją",
                  )}
                </span>
                <h2>
                  {copy(
                    locale,
                    "Better stories.\nBetter partnerships.",
                    "Geresnės istorijos.\nGeresni ryšiai.",
                  )}
                </h2>
                <p>
                  {copy(
                    locale,
                    "From a studio in Naujamiestis to a café in the Old Town, make it easy for a brand to understand your voice, your audience and your offer.",
                    "Nuo studijos Naujamiestyje iki kavinės Senamiestyje – padėk prekių ženklui suprasti tavo balsą, auditoriją ir pasiūlymą.",
                  )}
                </p>
              </div>
              <div className={styles.offerExample}>
                <small>
                  {copy(locale, "INTERACTIVE EXAMPLE", "INTERAKTYVUS PAVYZDYS")}
                </small>
                <div className={styles.offerHead}>
                  <span className={styles.orderLogo}>V</span>
                  <div>
                    <strong>
                      {copy(locale, "A Vilnius story", "Vilniaus istorija")}
                    </strong>
                    <p>
                      {copy(
                        locale,
                        "Sponsored post · creative brief",
                        "Reklaminis įrašas · kūrybinė užduotis",
                      )}
                    </p>
                  </div>
                  <b>€120</b>
                </div>
                <button
                  className={
                    sampleAccepted
                      ? styles.acceptedButton
                      : styles.secondaryButton
                  }
                  onClick={() => setSampleAccepted((value) => !value)}
                >
                  {sampleAccepted ? (
                    <>
                      <Check size={16} />
                      {copy(
                        locale,
                        "Added to sample plan",
                        "Įtraukta į pavyzdinį planą",
                      )}
                    </>
                  ) : (
                    <>
                      {copy(locale, "Try the interaction", "Išbandyk veiksmą")}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </section>
            <section
              className={`${styles.feature} ${styles.wideFeature} ${styles.blueFeature}`}
            >
              <div>
                <span className={styles.eyebrow}>
                  02 /{" "}
                  {copy(locale, "Know your numbers", "Žinok savo skaičius")}
                </span>
                <h2>
                  {copy(
                    locale,
                    "You built the audience.\nMake the value visible.",
                    "Tu subūrei auditoriją.\nParodyk jos vertę.",
                  )}
                </h2>
                <p>
                  {copy(
                    locale,
                    "Keep your rate, reach and creative approach in one place. Explore sponsorship value with clear, editable assumptions.",
                    "Laikyk įkainį, pasiekiamumą ir kūrybinį požiūrį vienoje vietoje. Įvertink bendradarbiavimo vertę pagal aiškias, keičiamas prielaidas.",
                  )}
                </p>
                <Link className={styles.whiteLink} href={`/${locale}/worth`}>
                  {copy(
                    locale,
                    "Calculate your potential",
                    "Apskaičiuok galimybes",
                  )}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className={styles.bigEuro} aria-hidden="true">
                €<span>€</span>
                <i>€</i>
              </div>
            </section>
            <section className={styles.feature}>
              <div>
                <span className={styles.eyebrow}>
                  03 /{" "}
                  {copy(locale, "Set your own rate", "Nustatyk savo įkainį")}
                </span>
                <h2>
                  {copy(
                    locale,
                    "Your price.\nOn your terms.",
                    "Tavo kaina.\nTavo sąlygomis.",
                  )}
                </h2>
                <p>
                  {copy(
                    locale,
                    "A starting point for a conversation, with room for the work, the usage rights and the idea.",
                    "Pokalbio pradžia, paliekant vietos darbui, naudojimo teisėms ir idėjai.",
                  )}
                </p>
              </div>
              <div className={styles.rateDemo}>
                <small>
                  {copy(
                    locale,
                    "EXAMPLE ASKING PRICE",
                    "PAVYZDINĖ PRAŠOMA KAINA",
                  )}
                </small>
                <strong>
                  {euro(sampleRate, locale)}
                  <span> / {copy(locale, "post", "įrašą")}</span>
                </strong>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={sampleRate}
                  aria-label={copy(
                    locale,
                    "Example post price",
                    "Pavyzdinė įrašo kaina",
                  )}
                  onChange={(event) =>
                    setSampleRate(Number(event.target.value))
                  }
                />
                <p>
                  {copy(
                    locale,
                    "An illustration, not a market benchmark.",
                    "Pavyzdys, o ne rinkos standartas.",
                  )}
                </p>
              </div>
            </section>
            <section className={styles.feature}>
              <div>
                <span className={styles.eyebrow}>
                  04 /{" "}
                  {copy(
                    locale,
                    "Your page, your story",
                    "Tavo puslapis, tavo istorija",
                  )}
                </span>
                <h2>
                  {copy(
                    locale,
                    "More than\na follower count.",
                    "Daugiau nei\nsekėjų skaičius.",
                  )}
                </h2>
                <p>
                  {copy(
                    locale,
                    "Say what you create. Show what matters. Download a media kit you can send to the right people.",
                    "Papasakok, ką kuri. Parodyk tai, kas svarbu. Atsisiųsk pristatymą, kuriuo gali pasidalyti.",
                  )}
                </p>
              </div>
              <div className={styles.miniProfile}>
                <div>
                  <span className={styles.miniFace}>
                    <UserRound />
                  </span>
                  <strong>
                    {copy(locale, "Your creator page", "Tavo kūrėjo puslapis")}
                    <small>Vilnius, LT</small>
                  </strong>
                  <span className={styles.miniBadge}>
                    {copy(locale, "Preview", "Peržiūra")}
                  </span>
                </div>
                <span className={styles.skeletonLine} />
                <span className={styles.skeletonLine} />
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    inputRef.current?.focus();
                    inputRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  {copy(locale, "Make it yours", "Sukurk savąjį")}
                  <Pencil size={14} />
                </button>
              </div>
            </section>
            <section className={`${styles.feature} ${styles.wideFeature}`}>
              <div>
                <span className={styles.eyebrow}>
                  05 /{" "}
                  {copy(locale, "Less back and forth", "Mažiau susirašinėjimo")}
                </span>
                <h2>
                  {copy(
                    locale,
                    "A clearer brief.\nA better beginning.",
                    "Aiškesnė užduotis.\nGeresnė pradžia.",
                  )}
                </h2>
                <p>
                  {copy(
                    locale,
                    "Put the essentials in writing before the creative work begins. Build a campaign plan around your scope and budget.",
                    "Prieš pradėdamas kurti užrašyk svarbiausius dalykus. Planuok kampaniją pagal darbų apimtį ir biudžetą.",
                  )}
                </p>
              </div>
              <div className={styles.taskDemo}>
                <small>
                  {copy(
                    locale,
                    "YOUR PLANNING CHECKLIST",
                    "TAVO PLANAVIMO SĄRAŠAS",
                  )}
                </small>
                {copy(
                  locale,
                  [
                    "The idea, in one clear sentence",
                    "Deliverables and usage rights",
                    "Dates, feedback and payment terms",
                    "A final brief everyone can follow",
                  ],
                  [
                    "Idėja vienu aiškiu sakiniu",
                    "Darbai ir naudojimo teisės",
                    "Datos, atsiliepimai ir apmokėjimas",
                    "Aiški galutinė užduotis visiems",
                  ],
                ).map((line, index) => (
                  <button
                    key={line}
                    onClick={() => setTask(index + 1)}
                    aria-pressed={task > index}
                  >
                    <span className={task > index ? styles.checked : ""}>
                      {task > index && <Check size={12} />}
                    </span>
                    {line}
                  </button>
                ))}
                <Link href={`/${locale}/brands`}>
                  {copy(
                    locale,
                    "Open campaign planner",
                    "Atidaryti kampanijos planą",
                  )}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          </main>
          <AttentionGame locale={locale} />
          <section className={styles.bottomCta}>
            <span className={styles.eyebrow}>
              Vilnius → {copy(locale, "everywhere", "visur")}
            </span>
            <h2>
              {copy(
                locale,
                "A little more you.\nA lot more possible.",
                "Daugiau tavęs.\nDaugiau galimybių.",
              )}
            </h2>
            <p>
              {copy(
                locale,
                "Turn what you create into a page worth sharing.",
                "Paversk savo kūrybą puslapiu, kuriuo verta dalytis.",
              )}
            </p>
            <button
              className={styles.primaryButton}
              onClick={() => {
                inputRef.current?.focus();
                inputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              {copy(locale, "Build my page", "Kurti puslapį")}
              <ArrowRight size={16} />
            </button>
          </section>
        </>
      )}
      <CreatorFooter locale={locale} />
      {notice && (
        <div role="status" className={styles.toast}>
          <CheckCircle2 size={18} />
          {notice}
          <Link href={`/${locale}/dashboard`}>
            {copy(locale, "Open dashboard", "Atidaryti skydelį")}
            <ArrowRight size={14} />
          </Link>
          <button
            onClick={() => setNotice("")}
            aria-label={copy(locale, "Dismiss", "Uždaryti")}
          >
            ×
          </button>
        </div>
      )}
      {editor && (
        <ProfileEditor
          initial={editor}
          locale={locale}
          user={user}
          onClose={closeEditor}
          onLogin={() => setLogin(true)}
          onSaved={(profile, remote) => {
            setEditor(null);
            setNotice(
              copy(
                locale,
                remote
                  ? profile.published
                    ? "Your profile is published."
                    : "Saved to your account."
                  : "Draft saved on this device.",
                remote
                  ? profile.published
                    ? "Profilis paskelbtas."
                    : "Išsaugota tavo paskyroje."
                  : "Juodraštis išsaugotas šiame įrenginyje.",
              ),
            );
          }}
        />
      )}
      {login && (
        <LoginDialog locale={locale} onClose={closeLogin} onSuccess={setUser} />
      )}
    </div>
  );
}
