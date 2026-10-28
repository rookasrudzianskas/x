import Link from "next/link";
import type { Locale } from "@/lib/locale";
import styles from "./InfoPage.module.css";

type Kind = "privacy" | "terms" | "methodology";
const copy = {
  en: {
    privacy: {
      title: "Your data, clearly.",
      subtitle: "Privacy information for this application",
      sections: [
        [
          "Calculations",
          "A saved calculation contains a handle, an optional display name, the metrics and assumptions you enter, and its creation time. Its unique report link can be opened by anyone who has the link. Reports appear on the public board only when you explicitly select that option.",
        ],
        [
          "Creator drafts",
          "Without signing in, your media-kit draft stays in this browser’s local storage. Clearing site data removes it. After email sign-in is configured, drafts can also be stored with your account. Publishing makes the profile fields visible to visitors; your sign-in email is not included in the public profile.",
        ],
        [
          "Sign-in and requests",
          "When email sign-in is enabled, your email and a one-way hash of a temporary verification code are stored. A necessary HTTP-only session cookie keeps you signed in. Booking forms store the contact details and message you submit. A saved request is not a confirmed appointment.",
        ],
        [
          "External services",
          "Live profile lookups, when enabled by the operator, send the entered handle to X. Email verification uses Resend when configured. Sharing to X opens X’s own composer. No X password is requested. There is no advertising or analytics tracker in this application.",
        ],
        [
          "Control",
          "You can clear a local draft from the dashboard and sign out to end your session. Before a public service is launched, its operator must provide a contact address, retention rules, and a process for requests about stored reports and booking data. This repository does not supply an operated commercial service.",
        ],
      ],
    },
    terms: {
      title: "A useful estimate. Clear limits.",
      subtitle: "Application information and use",
      sections: [
        [
          "What the calculator does",
          "This tool models potential gross sponsorship income from the impressions, CPM and sponsored-post frequency you select. It is not an offer, a guaranteed payment, an account sale price, tax advice, or an estimate of X revenue-sharing payments.",
        ],
        [
          "Examples and profiles",
          "Profiles marked Example are fictional and demonstrate the product. Self-reported metrics have not been verified by X. Email sign-in verifies access to an email address; it does not prove ownership of an X handle. Published creator profiles are marked unverified.",
        ],
        [
          "Your inputs",
          "Use accurate information, publish only information you intend to make public, and do not impersonate another person. Public report links include the selected inputs. A five-year scenario assumes unchanged annual sponsorship revenue and a 10% annual discount rate.",
        ],
        [
          "Campaign planning",
          "Illustrated campaigns and budget plans are examples. No payment is taken by this application. Submitting a booking request stores an inquiry; pricing, deliverables and appointments need a separate agreement with an actual service operator.",
        ],
        [
          "About this adaptation",
          "This is an independent Vilnius adaptation of the public Unfair calculator design, built for this repository. It is not operated by or affiliated with unfair.so or X. Third-party assets retain their respective ownership; asset source URLs are documented in the repository.",
        ],
      ],
    },
    methodology: {
      title: "Show the math.",
      subtitle: "Transparent assumptions, in euros",
      sections: [
        [
          "One sponsored post",
          "Price per post = median impressions ÷ 1,000 × your chosen CPM. Annual revenue = price per post × sponsored posts per week × 52. Monthly revenue = annual revenue ÷ 12. Followers provide context but do not multiply the estimate.",
        ],
        [
          "Five-year sponsorship value",
          "We add annual revenue ÷ 1.1¹, annual revenue ÷ 1.1², and so on through year five. This uses a 10% annual discount rate and assumes annual revenue stays unchanged. It is an illustrative present value of sponsorship income, not the price of an account.",
        ],
        [
          "Scenarios, not market benchmarks",
          "The default €10 CPM is an editable illustration. The low and high scenarios use half and one-and-a-half times your selected CPM; they are not statistical confidence intervals. We have not asserted a verified Vilnius creator-rate benchmark. Estimates assume every selected sponsored slot is sold, before costs, fees and taxes.",
        ],
        [
          "Data provenance",
          "Example profiles are fictional. Manual reports contain self-reported inputs. If a live X connection is configured, the tool uses public account metrics and median impressions from eligible recent original posts, displaying the sample size. A public profile location is not proof of residence or audience location.",
        ],
        [
          "A Vilnius edition",
          "Lithuania uses the euro. The pixel panorama is an artistic illustration of Vilnius, featuring Gediminas’ Tower, the Cathedral and Bell Tower, the Hill of Three Crosses, and the TV Tower. It is not a geographically exact view. The interface is available in English and Lithuanian.",
        ],
      ],
    },
  },
  lt: {
    privacy: {
      title: "Apie tavo duomenis – aiškiai.",
      subtitle: "Šios programėlės privatumo informacija",
      sections: [
        [
          "Skaičiavimai",
          "Išsaugotame skaičiavime yra naudotojo vardas, pasirinktinai rodomas vardas, tavo įvesti duomenys, prielaidos ir sukūrimo laikas. Ataskaitą gali atidaryti visi, turintys unikalią nuorodą. Viešame sąraše ji rodoma tik tada, kai aiškiai pasirenki šią parinktį.",
        ],
        [
          "Kūrėjo juodraščiai",
          "Neprisijungus kūrėjo pristatymo juodraštis saugomas tik šios naršyklės vietinėje saugykloje. Išvalius svetainės duomenis jis pašalinamas. Kai sukonfigūruotas prisijungimas el. paštu, juodraštį galima išsaugoti ir paskyroje. Paskelbus profilį jo laukai tampa vieši, tačiau prisijungimo el. paštas viešai nerodomas.",
        ],
        [
          "Prisijungimas ir užklausos",
          "Kai įjungtas prisijungimas el. paštu, saugomas el. paštas ir laikino patvirtinimo kodo vienkryptė maiša. Būtinas HTTP-only sesijos slapukas palaiko prisijungimą. Susitikimo formoje saugomi tavo pateikti kontaktai ir žinutė. Išsaugota užklausa nėra patvirtintas susitikimas.",
        ],
        [
          "Išorinės paslaugos",
          "Kai operatorius įjungia tiesioginę profilio paiešką, įvestas naudotojo vardas siunčiamas X. El. pašto patvirtinimui naudojama Resend, jei ji sukonfigūruota. Dalijantis atidaromas paties X įrašo kūrimo langas. X slaptažodžio neprašome. Programėlėje nėra reklamos ar analitikos sekimo priemonių.",
        ],
        [
          "Valdymas",
          "Vietinį juodraštį gali pašalinti valdymo skydelyje, o sesiją baigti atsijungdamas. Prieš teikdamas viešą paslaugą operatorius turi pateikti kontaktinį adresą, duomenų saugojimo taisykles ir užklausų dėl saugomų duomenų tvarką. Ši saugykla pati neteikia veikiančios komercinės paslaugos.",
        ],
      ],
    },
    terms: {
      title: "Naudingas skaičiavimas. Aiškios ribos.",
      subtitle: "Informacija apie programėlę ir jos naudojimą",
      sections: [
        [
          "Ką skaičiuoja įrankis",
          "Pagal pasirinktus parodymus, CPM ir reklaminių įrašų dažnį modeliuojamos galimos reklaminio bendradarbiavimo pajamos. Tai nėra pasiūlymas, garantuota išmoka, paskyros pardavimo kaina, mokesčių konsultacija ar X pajamų dalijimosi išmokų prognozė.",
        ],
        [
          "Pavyzdžiai ir profiliai",
          "Žyma „Pavyzdys“ pažymėti profiliai yra išgalvoti ir skirti programėlei parodyti. Savarankiškai įvestų duomenų X nepatvirtino. Prisijungimas el. paštu patvirtina prieigą prie pašto dėžutės, o ne X paskyros nuosavybę. Paskelbti kūrėjų profiliai pažymėti kaip nepatvirtinti.",
        ],
        [
          "Tavo duomenys",
          "Pateik tikslią informaciją, skelbk tik tai, ką nori padaryti vieša, ir neapsimesk kitu asmeniu. Viešose ataskaitose matomos pasirinktos prielaidos. Penkerių metų scenarijuje numatomos nekintančios metinės pajamos ir taikoma 10 % metinė diskonto norma.",
        ],
        [
          "Kampanijų planavimas",
          "Rodomos kampanijos ir biudžeto planai yra pavyzdžiai. Programėlėje mokėjimai nepriimami. Pateikus susitikimo užklausą išsaugomas kreipimasis. Dėl kainų, darbų ir susitikimų reikia atskirai susitarti su paslaugos operatoriumi.",
        ],
        [
          "Apie šią versiją",
          "Tai nepriklausoma Vilniui pritaikyta viešo Unfair skaičiuoklės dizaino versija, sukurta šiai kodo saugyklai. Ji nėra valdoma unfair.so ar X ir nėra su jais susijusi. Trečiųjų šalių turto teisės priklauso jų savininkams; šaltinių nuorodos pateiktos saugykloje.",
        ],
      ],
    },
    methodology: {
      title: "Parodyk skaičiavimą.",
      subtitle: "Skaidrios prielaidos eurais",
      sections: [
        [
          "Vienas reklaminis įrašas",
          "Įrašo kaina = parodymų mediana ÷ 1 000 × pasirinktas CPM. Metinės pajamos = įrašo kaina × reklaminiai įrašai per savaitę × 52. Mėnesio pajamos = metinės pajamos ÷ 12. Sekėjų skaičius suteikia kontekstą, bet nėra pajamų daugiklis.",
        ],
        [
          "Penkerių metų bendradarbiavimo vertė",
          "Sudedame metines pajamas ÷ 1,1¹, metines pajamas ÷ 1,1² ir taip iki penktųjų metų. Taikoma 10 % metinė diskonto norma ir daroma prielaida, kad metinės pajamos nekinta. Tai pavyzdinė dabartinė reklaminio bendradarbiavimo pajamų vertė, o ne paskyros kaina.",
        ],
        [
          "Scenarijai, o ne rinkos vidurkiai",
          "Numatytasis 10 € CPM yra keičiama pavyzdinė prielaida. Mažame ir dideliame scenarijuose taikoma pusė ir pusantro tavo pasirinkto CPM. Tai nėra statistiniai pasikliautinieji intervalai. Patvirtinto Vilniaus kūrėjų įkainių vidurkio neteigiame. Daroma prielaida, kad visi pasirinkti reklaminiai įrašai bus užsakyti; išlaidos ir mokesčiai neatimami.",
        ],
        [
          "Duomenų kilmė",
          "Pavyzdiniai profiliai yra išgalvoti. Rankinėse ataskaitose naudojami savarankiškai įvesti duomenys. Jei sukonfigūruotas tiesioginis ryšys su X, naudojami vieši paskyros rodikliai ir tinkamų naujausių originalių įrašų parodymų mediana, nurodant imties dydį. Viešame profilyje įrašyta vieta nepatvirtina gyvenamosios ar auditorijos vietos.",
        ],
        [
          "Vilniaus versija",
          "Lietuvoje naudojamas euras. Pikselių panorama – meninė Vilniaus iliustracija su Gedimino pilies bokštu, katedra ir varpine, Trijų Kryžių kalnu bei televizijos bokštu. Tai nėra geografiškai tikslus vaizdas. Sąsaja pateikiama lietuvių ir anglų kalbomis.",
        ],
      ],
    },
  },
};

export default function InfoPage({
  locale,
  kind,
}: {
  locale: Locale;
  kind: Kind;
}) {
  const content = copy[locale][kind];
  const other = locale === "en" ? "lt" : "en";
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href={`/${locale}/worth`} className={styles.logo}>
          unfair<span>Vilnius</span>
        </Link>
        <Link href={`/${other}/${kind}`}>
          {other === "lt" ? "Lietuvių" : "English"}
        </Link>
      </nav>
      <main className={styles.main}>
        <Link href={`/${locale}/worth`} className={styles.back}>
          ← {locale === "en" ? "Back to calculator" : "Atgal į skaičiuoklę"}
        </Link>
        <p className={styles.eyebrow}>{content.subtitle}</p>
        <h1>{content.title}</h1>
        {content.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        {kind === "methodology" && (
          <section>
            <h2>
              {locale === "en" ? "Primary sources" : "Pirminiai šaltiniai"}
            </h2>
            <ul>
              <li>
                <a href="https://economy-finance.ec.europa.eu/euro/eu-countries-and-euro/lithuania-and-euro_en">
                  European Commission · Lithuania and the euro
                </a>
              </li>
              <li>
                <a href="https://www.govilnius.lt/visit-vilnius/places/the-gediminas-tower">
                  Go Vilnius · Gediminas’ Tower
                </a>
              </li>
              <li>
                <a href="https://www.govilnius.lt/visit-vilnius/places/the-hill-of-three-crosses">
                  Go Vilnius · Hill of Three Crosses
                </a>
              </li>
              <li>
                <a href="https://www.govilnius.lt/visit-vilnius/places/vilnius-cathedral-bell-tower">
                  Go Vilnius · Cathedral Bell Tower
                </a>
              </li>
              <li>
                <a href="https://www.govilnius.lt/visit-vilnius/places/television-tower">
                  Go Vilnius · Television Tower
                </a>
              </li>
              <li>
                <a href="https://docs.x.com/x-api/fundamentals/metrics">
                  X · Public metrics
                </a>
              </li>
            </ul>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        {(["methodology", "privacy", "terms"] as const).map((item) => (
          <Link key={item} href={`/${locale}/${item}`}>
            {copy[locale][item].subtitle}
          </Link>
        ))}
      </footer>
    </div>
  );
}
