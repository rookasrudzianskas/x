export type Locale = "en" | "lt";

const en = {
  brands: "For brands",
  creators: "Become a creator",
  badge: "Made for creators in Vilnius",
  heroOne: "How much €€€ you could earn",
  heroTwo: "with your X account",
  handlePlaceholder: "Enter your X handle",
  calculate: "Calculate",
  handleLabel: "X username or profile URL",
  introTitle: "Your voice in Vilnius. Your value everywhere.",
  introOne:
    "From a studio in Užupis to a startup in Naujamiestis, good ideas travel. Your experience, your perspective and the people who trust you are worth something.",
  introTwo:
    "Explore what your X account could earn through brand partnerships. A little Vilnius ambition, a global audience — and a transparent estimate in euros.",
  invalidHandle: "Use 1–15 letters, numbers or underscores.",
  loading: "Reading your profile…",
  loadingDetail: "Checking your audience and recent posts.",
  leaderboard: "Leaderboard",
  recent: "Recent",
  top: "Top",
  account: "Account",
  followers: "Followers",
  medianViews: "Median views",
  aYear: "A year",
  worth: "Worth",
  showMore: "Show more",
  showLess: "Show less",
  sample: "Example",
  manual: "Self-reported",
  x: "Metrics from X",
  sampleNote:
    "Sample profiles are fictional examples, not real people, claimed accounts or paid campaigns.",
  boardPageUnavailable:
    "Couldn’t load more profiles. Your current results are still here; try again.",
  boardUnavailable:
    "Showing example profiles. The saved profile directory is temporarily unavailable.",
  cityBandTop: "A small city. A world of possibility.",
  cityBandTitle: "Built in Vilnius.\nPriced in euros.",
  cityBandBottom: "Local roots. An audience without borders.",
  launchTitle: "Planning a launch?",
  launchName: "Make some noise.",
  launchLabel: "Vilnius → everywhere",
  launchBody:
    "Bring your next idea to the people who will care. Plan a creator campaign with a clear brief, a real budget and transparent expectations.",
  launchButton: "Plan your campaign",
  launchFeature1: "Find the right voices for your audience",
  launchFeature2: "Set your deliverables and budget in euros",
  launchFeature3: "Keep your campaign brief in one place",
  launchNote: "Every collaboration starts with a conversation.",
  calculator: "Calculator",
  privacy: "Privacy",
  terms: "Terms",
  footerNote:
    "An independent Vilnius adaptation. Illustrative estimates, not guaranteed income.",
  reportTitle: "Your audience has value.",
  reportSubtitle: "Explore what a brand partnership could look like.",
  reportWorth: "Illustrative five-year sponsorship value",
  perMonth: "per month",
  perYear: "Per year",
  perPost: "Per sponsored post",
  estimateLabel: "Estimated sponsorship value",
  source: "Data source",
  copyLink: "Copy link",
  copied: "Link copied",
  saveImage: "Save image",
  saving: "Saving…",
  postOnX: "Post on X",
  compare: "Compare",
  compareHandle: "Compare with another X handle",
  compareError: "Choose a different account to compare.",
  shareComparisonText:
    "Two X audiences, side by side. Explore an illustrative sponsorship comparison, made in Vilnius.",
  shareText:
    "What could my X audience earn? My illustrative sponsorship estimate, made in Vilnius.",
  copyError:
    "Couldn’t copy the link. You can copy the address from your browser.",
  imageError: "Couldn’t save the image. Please try again.",
  adjust: "Adjust your estimate",
  manualTitle: "Let’s put a number on it.",
  manualIntro: "Enter your own metrics to explore a sponsorship scenario for",
  name: "Display name (optional)",
  viewsLabel: "Median impressions per post",
  frequency: "Sponsored posts per week",
  cpm: "Rate per 1,000 impressions (€ CPM)",
  cpmHelp: "An editable assumption, not a verified Vilnius market rate.",
  publish: "Include this self-reported profile in the public directory",
  publishHelp:
    "Anyone with your report link can view the metrics. The directory is optional.",
  recalculate: "Calculate my estimate",
  formError:
    "Check your numbers. Use non-negative values and no more than 7 sponsored posts per week.",
  saveRateLimit:
    "Too many reports were saved at once. Please wait a minute and try again.",
  insufficientMetrics:
    "There aren’t enough recent posts with impression data for an estimate. Enter your own metrics below.",
  saveError: "We couldn’t save this report. Please try again.",
  notConfigured:
    "Live X lookup is not connected yet. You can still calculate an estimate with your own metrics below.",
  notFound:
    "We couldn’t find that X account. Check the handle, or enter your metrics below.",
  rateLimited:
    "Too many requests. Please wait a moment, or enter your metrics below.",
  lookupFailed:
    "We couldn’t load this profile right now. Enter your metrics below to continue.",
  reportMissing:
    "This saved report could not be found. You can create a new estimate below.",
  assumptions: "Illustrative assumptions",
  projection: "Your year, in perspective.",
  projectionDescription:
    "Cumulative sponsorship revenue at a constant monthly pace.",
  lowScenario: "Lower CPM scenario",
  highScenario: "Higher CPM scenario",
  months: "Months",
  methodology: "How this is calculated",
  methodologyOne:
    "Per post = median impressions ÷ 1,000 × your chosen CPM. Annual revenue = per-post value × sponsored posts per week × 52.",
  methodologyTwo:
    "Five-year value adds five years of unchanged annual revenue, each discounted by 10%: Σ annual revenue ÷ 1.1ⁿ for years 1–5. Followers provide context and do not multiply the estimate.",
  methodologyThree:
    "The lower and higher scenarios use 50% and 150% of your selected CPM. These are illustrations, not a statistical confidence interval or verified local rates.",
  disclosure:
    "An illustration, not guaranteed income. Assumes every planned sponsored post is booked at your selected rate. Before fees, costs and taxes. This is not an account sale price or an estimate of X revenue-sharing payouts.",
  viewProfile: "View on X",
  createProfile: "Build your creator page",
  comparison: "Side by side.",
  comparisonSub: "Two audiences. The same transparent assumptions.",
  metric: "Metric",
  another: "Calculate another account",
  missingComparison: "Add metrics for this account to complete the comparison.",
  help: "Help",
  faq: "A few good questions.",
  close: "Close",
  faq1: "Does this estimate X revenue-sharing payments?",
  answer1:
    "No. It models sponsorship value from your selected reach, rate and frequency. It does not calculate payments from X.",
  faq2: "Are the rates verified for Vilnius?",
  answer2:
    "No. Rates are editable assumptions. Actual terms depend on your audience, topic, campaign and the agreement with a brand.",
  faq3: "Does my audience need to live in Lithuania?",
  answer3:
    "No. Vilnius is the local focus of this tool; your audience can be anywhere.",
  faq4: "Do I need to give you my X password?",
  answer4:
    "Never. This calculator only uses public metrics or the numbers you enter yourself.",
  faq5: "Are the leaderboard examples real creators?",
  answer5:
    "Profiles marked Example are fictional illustrations. Self-reported profiles contain numbers supplied by their submitter, which have not been independently verified.",
  noResults: "No profiles yet.",
  retry: "Try again",
  saved: "Report saved",
  lowerEstimate: "Lower estimate",
  higherEstimate: "Higher estimate",
  annualLabel: "Annual sponsorship revenue",
  fiveYear: "Five-year value",
  exampleDefaults:
    "The starting values below are examples. Replace them with your own metrics.",
  language: "Language",
  sampleSize: "recent posts sampled",
  local: "Vilnius, Lithuania",
} as const;

const lt: Record<keyof typeof en, string> = {
  brands: "Prekių ženklams",
  creators: "Tapk kūrėju",
  badge: "Vilniaus kūrėjams",
  heroOne: "Kiek €€€ galėtum uždirbti",
  heroTwo: "su savo X paskyra",
  handlePlaceholder: "Įvesk savo X vardą",
  calculate: "Skaičiuoti",
  handleLabel: "X naudotojo vardas arba profilio nuoroda",
  introTitle: "Tavo balsas Vilniuje. Tavo vertė – visur.",
  introOne:
    "Nuo studijos Užupyje iki startuolio Naujamiestyje – geros idėjos keliauja. Tavo patirtis, požiūris ir tavimi pasitikintys žmonės turi vertę.",
  introTwo:
    "Sužinok, kiek galėtum uždirbti su savo X paskyra bendradarbiaudamas su prekių ženklais. Vilnietiškos ambicijos, pasaulinė auditorija ir skaidrus skaičiavimas eurais.",
  invalidHandle: "Naudok 1–15 raidžių, skaitmenų arba apatinių brūkšnių.",
  loading: "Skaitome tavo profilį…",
  loadingDetail: "Tikriname auditoriją ir naujausius įrašus.",
  leaderboard: "Kūrėjų lentelė",
  recent: "Naujausi",
  top: "Geriausi",
  account: "Paskyra",
  followers: "Sekėjai",
  medianViews: "Parodymų mediana",
  aYear: "Per metus",
  worth: "Vertė",
  showMore: "Rodyti daugiau",
  showLess: "Rodyti mažiau",
  sample: "Pavyzdys",
  manual: "Pateikti duomenys",
  x: "Duomenys iš X",
  sampleNote:
    "Pavyzdiniai profiliai yra išgalvoti. Tai nėra tikri žmonės, patvirtintos paskyros ar apmokėtos kampanijos.",
  boardPageUnavailable:
    "Nepavyko įkelti daugiau profilių. Dabartiniai rezultatai išliko – bandyk dar kartą.",
  boardUnavailable:
    "Rodomi pavyzdiniai profiliai. Išsaugotų profilių sąrašas laikinai nepasiekiamas.",
  cityBandTop: "Mažas miestas. Didelės galimybės.",
  cityBandTitle: "Sukurta Vilniuje.\nVertė – eurais.",
  cityBandBottom: "Vietinės šaknys. Auditorija be sienų.",
  launchTitle: "Planuoji pristatymą?",
  launchName: "Tegu apie tave išgirsta.",
  launchLabel: "Vilnius → visas pasaulis",
  launchBody:
    "Pristatyk kitą savo idėją žmonėms, kuriems ji rūpės. Suplanuok kūrėjų kampaniją su aiškia užduotimi, realiu biudžetu ir skaidriais lūkesčiais.",
  launchButton: "Planuok kampaniją",
  launchFeature1: "Atrask tavo auditorijai tinkančius balsus",
  launchFeature2: "Numatyk darbus ir biudžetą eurais",
  launchFeature3: "Laikyk kampanijos užduotį vienoje vietoje",
  launchNote: "Kiekvienas bendradarbiavimas prasideda nuo pokalbio.",
  calculator: "Skaičiuoklė",
  privacy: "Privatumas",
  terms: "Sąlygos",
  footerNote:
    "Nepriklausoma Vilniui pritaikyta versija. Pavyzdiniai skaičiavimai, o ne garantuotos pajamos.",
  reportTitle: "Tavo auditorija turi vertę.",
  reportSubtitle:
    "Sužinok, kaip galėtų atrodyti bendradarbiavimas su prekių ženklais.",
  reportWorth: "Pavyzdinė penkerių metų bendradarbiavimo vertė",
  perMonth: "per mėnesį",
  perYear: "Per metus",
  perPost: "Už reklaminį įrašą",
  estimateLabel: "Preliminari bendradarbiavimo vertė",
  source: "Duomenų šaltinis",
  copyLink: "Kopijuoti nuorodą",
  copied: "Nuoroda nukopijuota",
  saveImage: "Išsaugoti vaizdą",
  saving: "Saugoma…",
  postOnX: "Skelbti X",
  compare: "Palyginti",
  compareHandle: "Palygink su kita X paskyra",
  compareError: "Palyginimui pasirink kitą paskyrą.",
  shareComparisonText:
    "Dvi X auditorijos greta. Pavyzdinis reklaminio bendradarbiavimo vertės palyginimas, sukurtas Vilniuje.",
  shareText:
    "Kiek galėtų uždirbti mano X auditorija? Mano pavyzdinis bendradarbiavimo vertės skaičiavimas, sukurtas Vilniuje.",
  copyError: "Nepavyko nukopijuoti nuorodos. Nukopijuok adresą iš naršyklės.",
  imageError: "Nepavyko išsaugoti vaizdo. Bandyk dar kartą.",
  adjust: "Patikslink skaičiavimą",
  manualTitle: "Paverskime tai skaičiais.",
  manualIntro:
    "Įvesk savo duomenis ir apskaičiuok reklaminio bendradarbiavimo scenarijų paskyrai",
  name: "Rodomas vardas (nebūtina)",
  viewsLabel: "Įrašo parodymų skaičiaus mediana",
  frequency: "Reklaminiai įrašai per savaitę",
  cpm: "Kaina už 1 000 parodymų (€ CPM)",
  cpmHelp: "Keičiama prielaida, o ne patvirtintas Vilniaus rinkos įkainis.",
  publish: "Įtraukti profilį su mano pateiktais duomenimis į viešą sąrašą",
  publishHelp:
    "Duomenis matys visi, turintys skaičiavimo nuorodą. Įtraukti į sąrašą nebūtina.",
  recalculate: "Apskaičiuoti mano pajamas",
  formError:
    "Patikrink skaičius. Įvesk neneigiamas reikšmes ir ne daugiau nei 7 reklaminius įrašus per savaitę.",
  saveRateLimit:
    "Per trumpą laiką išsaugota per daug skaičiavimų. Palauk minutę ir bandyk dar kartą.",
  insufficientMetrics:
    "Nepakanka naujausių įrašų su parodymų duomenimis. Žemiau gali įvesti savo duomenis.",
  saveError: "Nepavyko išsaugoti skaičiavimo. Bandyk dar kartą.",
  notConfigured:
    "Tiesioginė X duomenų paieška dar neprijungta. Žemiau gali apskaičiuoti pajamas pagal savo duomenis.",
  notFound:
    "Šios X paskyros rasti nepavyko. Patikrink vardą arba įvesk duomenis žemiau.",
  rateLimited: "Per daug užklausų. Trumpai palauk arba įvesk duomenis žemiau.",
  lookupFailed:
    "Dabar nepavyko įkelti profilio. Tęsk įvesdamas savo duomenis žemiau.",
  reportMissing:
    "Šio išsaugoto skaičiavimo rasti nepavyko. Žemiau gali sukurti naują.",
  assumptions: "Pavyzdinės prielaidos",
  projection: "Tavo metai skaičiais.",
  projectionDescription:
    "Sukauptos bendradarbiavimo pajamos, esant pastoviam mėnesio tempui.",
  lowScenario: "Mažesnio CPM scenarijus",
  highScenario: "Didesnio CPM scenarijus",
  months: "Mėnesiai",
  methodology: "Kaip tai apskaičiuojama",
  methodologyOne:
    "Vieno įrašo vertė = parodymų mediana ÷ 1 000 × tavo pasirinktas CPM. Metinės pajamos = įrašo vertė × reklaminių įrašų per savaitę skaičius × 52.",
  methodologyTwo:
    "Penkerių metų vertė – nekintančių metinių pajamų suma, kiekvieniems metams taikant 10 % diskonto normą: Σ metinės pajamos ÷ 1,1ⁿ (1–5 metai). Sekėjų skaičius pateikiamas kontekstui ir nedaugina pajamų.",
  methodologyThree:
    "Mažesnis ir didesnis scenarijai naudoja 50 % ir 150 % pasirinkto CPM. Tai pavyzdžiai, o ne statistinis pasikliautinasis intervalas ar patvirtinti vietiniai įkainiai.",
  disclosure:
    "Tai pavyzdinis skaičiavimas, o ne garantuotos pajamos. Daroma prielaida, kad visi suplanuoti reklaminiai įrašai bus užsakyti pagal pasirinktą įkainį. Neatskaičius mokesčių, išlaidų ir komisinių. Tai nėra paskyros pardavimo kaina ar X pajamų dalijimosi išmokų skaičiavimas.",
  viewProfile: "Peržiūrėti X",
  createProfile: "Sukurk kūrėjo puslapį",
  comparison: "Greta vienas kito.",
  comparisonSub: "Dvi auditorijos. Tos pačios skaidrios prielaidos.",
  metric: "Rodiklis",
  another: "Skaičiuoti kitai paskyrai",
  missingComparison: "Įvesk šios paskyros duomenis ir užbaik palyginimą.",
  help: "Pagalba",
  faq: "Keli geri klausimai.",
  close: "Uždaryti",
  faq1: "Ar skaičiuojamos X pajamų dalijimosi išmokos?",
  answer1:
    "Ne. Pagal pasirinktą pasiekiamumą, įkainį ir dažnį apskaičiuojama bendradarbiavimo vertė. X išmokos neskaičiuojamos.",
  faq2: "Ar įkainiai patvirtinti Vilniaus rinkai?",
  answer2:
    "Ne. Įkainiai yra keičiamos prielaidos. Tikrosios sąlygos priklauso nuo auditorijos, temos, kampanijos ir susitarimo su prekių ženklu.",
  faq3: "Ar mano auditorija turi gyventi Lietuvoje?",
  answer3:
    "Ne. Šis įrankis skirtas Vilniaus kūrėjams, tačiau tavo auditorija gali būti bet kur.",
  faq4: "Ar turiu pateikti X slaptažodį?",
  answer4:
    "Niekada. Skaičiuoklė naudoja tik viešus duomenis arba tavo paties įvestus skaičius.",
  faq5: "Ar lentelės pavyzdžiai yra tikri kūrėjai?",
  answer5:
    "Profiliai su žyma „Pavyzdys“ yra išgalvoti. Profiliuose su žyma „Pateikti duomenys“ yra naudotojų įvesti, nepriklausomai nepatikrinti skaičiai.",
  noResults: "Profilių dar nėra.",
  retry: "Bandyti dar kartą",
  saved: "Skaičiavimas išsaugotas",
  lowerEstimate: "Mažesnis scenarijus",
  higherEstimate: "Didesnis scenarijus",
  annualLabel: "Metinės bendradarbiavimo pajamos",
  fiveYear: "Penkerių metų vertė",
  exampleDefaults:
    "Pradinės reikšmės žemiau yra pavyzdinės. Pakeisk jas savo duomenimis.",
  language: "Kalba",
  sampleSize: "naujausių įrašų imtis",
  local: "Vilnius, Lietuva",
};

export const dictionaries = { en, lt };
export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
export function localizeProfileName(
  name: string,
  source: "sample" | "manual" | "x",
  locale: Locale,
) {
  if (locale !== "lt" || source !== "sample") return name;
  const roles: Record<string, string> = {
    design: "dizainas",
    tech: "technologijos",
    culture: "kultūra",
    startups: "startuoliai",
    food: "maistas",
    code: "programavimas",
    city: "miestas",
    product: "produktai",
    art: "menas",
    outdoors: "gamta",
    ideas: "idėjos",
    digital: "skaitmena",
  };
  const [person, role] = name.split(" · ");
  return role && roles[role] ? `${person} · ${roles[role]}` : name;
}
export function money(value: number, locale: Locale, compact = false) {
  return new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: compact ? 1 : value > 0 && value < 10 ? 2 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}
export function number(value: number, locale: Locale, compact = false) {
  return new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
    maximumFractionDigits: compact ? 1 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}
