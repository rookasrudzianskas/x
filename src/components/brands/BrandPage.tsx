"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  api,
  copy,
  CreatorFooter,
  CreatorHeader,
  euro,
  requestError,
  RequestError,
  type Locale,
} from "../creator/Shared";
import shared from "../creator/Creator.module.css";
import styles from "./Brands.module.css";
import { campaignBudget } from "./campaign-budget";

export function BrandPage({ locale }: { locale: Locale }) {
  const [creators, setCreators] = useState(3);
  const [posts, setPosts] = useState(2);
  const [rateText, setRateText] = useState("100");
  const [productionText, setProductionText] = useState("0");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; budget: number } | null>(
    null,
  );
  const contact = useRef<HTMLElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const success = useRef<HTMLDivElement>(null);
  const budget = campaignBudget(creators, posts, rateText, productionText);
  useEffect(() => {
    if (saved) success.current?.focus();
  }, [saved]);
  function scrollToForm() {
    contact.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    nameInput.current?.focus({ preventScroll: true });
  }
  function exportPlan() {
    if (!budget) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              city: "Vilnius, Lithuania",
              locale,
              currency: "EUR",
              creators,
              postsPerCreator: posts,
              ratePerPost: budget.rate,
              productionBudget: budget.production,
              total: budget.total,
              assumptions: copy(
                locale,
                "Illustrative budget. No booking, availability or market rate is implied.",
                "Pavyzdinis biudžetas. Užsakymas, prieinamumas ar rinkos įkainis nepatvirtinami.",
              ),
              createdAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "vilnius-campaign-plan.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    const details = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      company: form.company.trim(),
      message: form.message.trim(),
    };
    if (!budget) {
      setError(
        copy(
          locale,
          "Check both amounts in your campaign plan before saving.",
          "Prieš išsaugant patikrink abi kampanijos plano sumas.",
        ),
      );
      return;
    }
    if (!details.name || !details.company || details.message.length < 10) {
      setError(
        copy(
          locale,
          "Enter your name, company and at least 10 characters about the idea.",
          "Įvesk vardą, įmonę ir bent 10 simbolių apie idėją.",
        ),
      );
      return;
    }
    const submittedBudget = budget.total;
    inFlight.current = true;
    setSending(true);
    try {
      const result = await api<{ ok: true; id: string }>(
        "/api/bookings",
        "POST",
        { ...details, budget: submittedBudget, locale },
      );
      if (result.ok !== true || typeof result.id !== "string" || !result.id)
        throw new RequestError(
          "The request could not be confirmed. Please try again.",
          "service_error",
        );
      setSaved({ id: result.id, budget: submittedBudget });
    } catch (error) {
      setError(requestError(locale, error));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  const plans = copy(
    locale,
    [
      {
        number: "01",
        title: "A local story",
        sub: "An idea with a place to call home.",
        points: [
          "A specific audience and one clear message",
          "A creator whose work fits the idea",
          "A simple post or neighbourhood story",
        ],
      },
      {
        number: "02",
        title: "A coordinated launch",
        sub: "One idea. A few different voices.",
        points: [
          "Several creators and a shared brief",
          "A clear launch window and deliverables",
          "Room for each creator’s own perspective",
        ],
      },
      {
        number: "03",
        title: "An ongoing partnership",
        sub: "Build familiarity over time.",
        points: [
          "A repeatable publishing schedule",
          "Agreed usage rights and review process",
          "A budget reviewed against actual results",
        ],
      },
    ],
    [
      {
        number: "01",
        title: "Vietinė istorija",
        sub: "Idėja, turinti savo vietą.",
        points: [
          "Konkreti auditorija ir viena aiški žinutė",
          "Kūrėjas, kurio darbai dera su idėja",
          "Paprastas įrašas ar rajono istorija",
        ],
      },
      {
        number: "02",
        title: "Bendras pristatymas",
        sub: "Viena idėja. Keli skirtingi balsai.",
        points: [
          "Keli kūrėjai ir bendra užduotis",
          "Aiškus pristatymo laikas ir darbai",
          "Erdvė kiekvieno kūrėjo požiūriui",
        ],
      },
      {
        number: "03",
        title: "Ilgalaikė partnerystė",
        sub: "Augink atpažįstamumą laikui bėgant.",
        points: [
          "Pasikartojantis publikavimo planas",
          "Sutartos naudojimo teisės ir peržiūra",
          "Biudžetas, vertinamas pagal rezultatus",
        ],
      },
    ],
  );
  return (
    <div className={`${shared.page} ${styles.page}`}>
      <div className={styles.blueTop}>
        <CreatorHeader locale={locale} active="brands" dark />
        <section className={styles.hero}>
          <span className={styles.cityLabel}>
            <MapPin size={13} />
            Vilnius, {copy(locale, "Lithuania", "Lietuva")}
          </span>
          <h1>
            {copy(
              locale,
              <>
                Your next big thing.
                <br />
                Their kind of <em>story.</em>
              </>,
              <>
                Tavo nauja idėja.
                <br />
                Jų kuriama <em>istorija.</em>
              </>,
            )}
          </h1>
          <p>
            {copy(
              locale,
              "Plan a creator campaign with a Vilnius point of view. Define the idea, find the right voice, and make the numbers clear.",
              "Suplanuok kūrėjų kampaniją iš Vilniaus perspektyvos. Apibrėžk idėją, rask tinkamą balsą ir aiškiai susidėliok skaičius.",
            )}
          </p>
          <div className={styles.heroButtons}>
            <button className={shared.smallButton} onClick={scrollToForm}>
              {copy(
                locale,
                "Talk about a campaign",
                "Pasikalbėkime apie kampaniją",
              )}
              <ArrowRight size={16} />
            </button>
            <a href="#planner">
              {copy(
                locale,
                "Try the budget planner",
                "Išbandyk biudžeto planą",
              )}{" "}
              ↓
            </a>
          </div>
          <span className={styles.floatingEuro} aria-hidden="true">
            €
          </span>
          <span className={styles.floatingEuro2} aria-hidden="true">
            €
          </span>
        </section>
        <Image
          width={1440}
          height={200}
          unoptimized
          className={styles.skyline}
          src="/vilnius-skyline.svg"
          alt={copy(
            locale,
            "Pixel illustration of Vilnius landmarks",
            "Vilniaus įžymybių pikselinė iliustracija",
          )}
        />
      </div>
      <main className={styles.main}>
        <section className={styles.plans}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={shared.eyebrow}>
                {copy(
                  locale,
                  "Start with the shape of the idea",
                  "Pradėk nuo idėjos",
                )}
              </span>
              <h2>{copy(locale, "What are you planning?", "Ką planuoji?")}</h2>
            </div>
            <p>
              {copy(
                locale,
                "Planning examples, not service packages. Availability, deliverables and fees are agreed separately with creators.",
                "Planavimo pavyzdžiai, o ne paslaugų paketai. Prieinamumas, darbai ir įkainiai derinami su kūrėjais atskirai.",
              )}
            </p>
          </div>
          <div className={styles.planGrid}>
            {plans.map((plan, index) => (
              <article key={plan.number} className={styles.plan}>
                <span className={styles.planNumber}>{plan.number}</span>
                <h3>{plan.title}</h3>
                <p>{plan.sub}</p>
                <ul>
                  {plan.points.map((point) => (
                    <li key={point}>
                      <Check size={14} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setCreators(index === 0 ? 1 : index === 1 ? 3 : 5);
                    setPosts(index === 2 ? 4 : index === 1 ? 2 : 1);
                    document.getElementById("planner")?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "auto"
                        : "smooth",
                    });
                  }}
                >
                  {copy(locale, "Explore this plan", "Išbandyti šį planą")}
                  <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>
        </section>
        <section id="planner" className={styles.planner}>
          <div className={styles.plannerIntro}>
            <span className={shared.eyebrow}>
              {copy(
                locale,
                "A budget you can understand",
                "Suprantamas biudžetas",
              )}
            </span>
            <h2>
              {copy(
                locale,
                <>
                  Make the
                  <br />
                  numbers work.
                </>,
                <>
                  Sudėliok
                  <br />
                  skaičius.
                </>,
              )}
            </h2>
            <p>
              {copy(
                locale,
                "Move the sliders. Build a starting point for a real conversation. Every amount here is your assumption, not a quoted rate.",
                "Keisk slankiklius. Pasiruošk tikram pokalbiui. Kiekviena suma čia – tavo prielaida, o ne pateiktas kainos pasiūlymas.",
              )}
            </p>
            <div className={styles.localNote}>
              <MapPin size={18} />
              <p>
                {copy(
                  locale,
                  "A local lens, a global audience. From Naujamiestis and Užupis to a community anywhere.",
                  "Vietinis požiūris, pasaulinė auditorija. Nuo Naujamiesčio ir Užupio iki bendruomenės bet kur.",
                )}
              </p>
            </div>
          </div>
          <div className={styles.budgetCard}>
            <div className={styles.sliderField}>
              <label htmlFor="creators-range">
                {copy(locale, "Creators", "Kūrėjai")}
                <strong>{creators}</strong>
              </label>
              <input
                disabled={sending}
                id="creators-range"
                type="range"
                min={1}
                max={20}
                value={creators}
                onChange={(event) => setCreators(Number(event.target.value))}
              />
              <div>
                <span>1</span>
                <span>20</span>
              </div>
            </div>
            <div className={styles.sliderField}>
              <label htmlFor="posts-range">
                {copy(locale, "Posts per creator", "Įrašai vienam kūrėjui")}
                <strong>{posts}</strong>
              </label>
              <input
                disabled={sending}
                id="posts-range"
                type="range"
                min={1}
                max={12}
                value={posts}
                onChange={(event) => setPosts(Number(event.target.value))}
              />
              <div>
                <span>1</span>
                <span>12</span>
              </div>
            </div>
            <div className={styles.numberFields}>
              <label>
                {copy(locale, "Rate per post (€)", "Įrašo įkainis (€)")}
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={10}
                  disabled={sending}
                  value={rateText}
                  onChange={(event) => setRateText(event.target.value)}
                  aria-describedby={!budget ? "budget-error" : undefined}
                />
              </label>
              <label>
                {copy(locale, "Production budget (€)", "Kūrybos biudžetas (€)")}
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={10}
                  disabled={sending}
                  value={productionText}
                  onChange={(event) => setProductionText(event.target.value)}
                  aria-describedby={!budget ? "budget-error" : undefined}
                />
              </label>
            </div>
            {!budget && (
              <p id="budget-error" className={shared.error} role="status">
                {copy(
                  locale,
                  "Enter both amounts from €0 to €1,000,000, using at most two decimal places.",
                  "Įvesk abi sumas nuo 0 iki 1 000 000 €, naudodamas ne daugiau kaip du skaitmenis po kablelio.",
                )}
              </p>
            )}
            <div className={styles.total}>
              <div>
                <span>
                  {copy(
                    locale,
                    "Illustrative campaign budget",
                    "Pavyzdinis kampanijos biudžetas",
                  )}
                </span>
                <strong aria-live="polite">
                  {budget ? euro(budget.total, locale) : "—"}
                </strong>
              </div>
              <Sparkles size={26} />
            </div>
            <p className={styles.formula}>
              {creators} × {posts} × {budget ? euro(budget.rate, locale) : "—"}{" "}
              + {budget ? euro(budget.production, locale) : "—"}
              <br />
              {copy(
                locale,
                "Before any taxes or separately agreed fees. No availability or results are guaranteed.",
                "Neįskaičiuoti mokesčiai ar atskirai sutartos išlaidos. Prieinamumas ir rezultatai negarantuojami.",
              )}
            </p>
            <div className={styles.budgetActions}>
              <button
                className={shared.primaryButton}
                disabled={!budget || sending}
                onClick={scrollToForm}
              >
                {copy(locale, "Discuss this plan", "Aptarti šį planą")}
                <ArrowRight size={15} />
              </button>
              <button
                className={shared.textButton}
                disabled={!budget || sending}
                onClick={exportPlan}
              >
                <Download size={14} />
                {copy(locale, "Export", "Eksportuoti")}
              </button>
            </div>
          </div>
        </section>
        <section className={styles.process}>
          <h2>
            {copy(
              locale,
              "Clear from the first conversation.",
              "Aišku nuo pirmojo pokalbio.",
            )}
          </h2>
          <div>
            {copy(
              locale,
              [
                {
                  title: "Define the audience",
                  text: "City, language and interests are a starting point. Decide who you need to reach and why.",
                },
                {
                  title: "Agree the creative scope",
                  text: "Specify the number of posts, approval process, usage rights, dates and payment terms.",
                },
                {
                  title: "Review the actual results",
                  text: "Use real campaign metrics. Compare them with the assumptions you started with.",
                },
              ],
              [
                {
                  title: "Apibrėžk auditoriją",
                  text: "Miestas, kalba ir pomėgiai – pradžia. Nuspręsk, ką ir kodėl nori pasiekti.",
                },
                {
                  title: "Sutark kūrybos apimtį",
                  text: "Nurodyk įrašų skaičių, peržiūros procesą, naudojimo teises, datas ir apmokėjimo sąlygas.",
                },
                {
                  title: "Įvertink tikrus rezultatus",
                  text: "Naudok tikrus kampanijos duomenis. Palygink juos su pradinėmis prielaidomis.",
                },
              ],
            ).map((step, index) => (
              <article key={step.title}>
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section ref={contact} id="contact" className={styles.contact}>
          <div>
            <span className={shared.eyebrow}>
              {copy(
                locale,
                "Your next idea starts here",
                "Čia prasideda kita tavo idėja",
              )}
            </span>
            <h2>
              {copy(
                locale,
                <>
                  Planning a launch?
                  <br />
                  Let’s talk.
                </>,
                <>
                  Planuoji pristatymą?
                  <br />
                  Pasikalbėkime.
                </>,
              )}
            </h2>
            <p>
              {copy(
                locale,
                "Tell us what you have in mind. This form saves a campaign enquiry; it does not book a meeting or send an email confirmation.",
                "Papasakok savo idėją. Forma išsaugo kampanijos užklausą; ji nerezervuoja susitikimo ir nesiunčia patvirtinimo el. paštu.",
              )}
            </p>
            <p className={styles.contactSmall}>
              {copy(
                locale,
                "English or Lithuanian. Local times use Europe/Vilnius.",
                "Anglų arba lietuvių kalba. Vietinis laikas – Europe/Vilnius.",
              )}
            </p>
            <Link className={shared.textButton} href={`/${locale}/creators`}>
              {copy(
                locale,
                "Are you a creator? Start here.",
                "Esi kūrėjas? Pradėk čia.",
              )}
              <ArrowRight size={14} />
            </Link>
          </div>
          {saved ? (
            <div
              ref={success}
              className={styles.success}
              role="status"
              tabIndex={-1}
            >
              <CheckCircle2 size={34} />
              <h3>
                {copy(
                  locale,
                  "Your request is saved.",
                  "Tavo užklausa išsaugota.",
                )}
              </h3>
              <p>
                {copy(
                  locale,
                  "Your campaign enquiry has been stored. No appointment is booked and no email has been sent.",
                  "Kampanijos užklausa įrašyta. Susitikimas nerezervuotas, el. laiškas neišsiųstas.",
                )}
              </p>
              <span>
                {copy(locale, "Reference", "Numeris")}: {saved.id}
              </span>
              <p>
                {copy(locale, "Submitted budget", "Pateiktas biudžetas")}:{" "}
                <strong>{euro(saved.budget, locale)}</strong>
              </p>
              <button
                className={shared.secondaryButton}
                onClick={() => {
                  setSaved(null);
                  setError("");
                  requestAnimationFrame(() => nameInput.current?.focus());
                  setForm({ name: "", email: "", company: "", message: "" });
                }}
              >
                {copy(locale, "Start another enquiry", "Kurti kitą užklausą")}
              </button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className={styles.contactForm}
              aria-busy={sending}
            >
              <fieldset disabled={sending} className={styles.formFields}>
                <div className={styles.contactFields}>
                  <label>
                    {copy(locale, "Your name", "Tavo vardas")}
                    <input
                      ref={nameInput}
                      autoComplete="name"
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {copy(locale, "Work email", "Darbo el. paštas")}
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  {copy(locale, "Company / project", "Įmonė / projektas")}
                  <input
                    autoComplete="organization"
                    required
                    maxLength={120}
                    value={form.company}
                    onChange={(event) =>
                      setForm({ ...form, company: event.target.value })
                    }
                  />
                </label>
                <label>
                  {copy(
                    locale,
                    "Tell us about the idea",
                    "Papasakok apie idėją",
                  )}
                  <textarea
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={4}
                    value={form.message}
                    onChange={(event) =>
                      setForm({ ...form, message: event.target.value })
                    }
                    placeholder={copy(
                      locale,
                      "Audience, timeline, creative idea, and what success looks like…",
                      "Auditorija, laikas, kūrybinė idėja ir kaip vertinsi sėkmę…",
                    )}
                  />
                </label>
                <div className={styles.enquiryBudget}>
                  <span>
                    {copy(
                      locale,
                      "Budget from your plan",
                      "Biudžetas iš tavo plano",
                    )}
                  </span>
                  <strong>{budget ? euro(budget.total, locale) : "—"}</strong>
                  <a href="#planner">{copy(locale, "Edit", "Keisti")}</a>
                </div>
                <p className={styles.privacyNote}>
                  {copy(
                    locale,
                    "Your contact details and brief are stored so this request can be reviewed. Read our",
                    "Tavo kontaktiniai duomenys ir užduotis saugomi, kad užklausą būtų galima peržiūrėti. Skaityk",
                  )}{" "}
                  <Link href={`/${locale}/privacy`}>
                    {copy(locale, "privacy notice", "privatumo informaciją")}
                  </Link>
                  .
                </p>
                {error && (
                  <p className={shared.error} role="alert">
                    {error}
                  </p>
                )}
                <button
                  className={shared.primaryButton}
                  disabled={sending || !budget}
                >
                  {copy(
                    locale,
                    sending ? "Saving request…" : "Save campaign enquiry",
                    sending
                      ? "Užklausa saugoma…"
                      : "Išsaugoti kampanijos užklausą",
                  )}
                  <ArrowRight size={16} />
                </button>
              </fieldset>
            </form>
          )}
        </section>
      </main>
      <CreatorFooter locale={locale} />
    </div>
  );
}
