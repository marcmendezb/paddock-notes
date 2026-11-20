import type { Lang } from "./constants";

/**
 * Grand Prix and country names in Spanish and German. Jolpica publishes them in English.
 * If a name is not in the table, it is shown as is (it is data, not an invented translation).
 */

/** "Australian" → "de Australia". Includes the preposition for the cases with an article. */
const GP_ES: Record<string, string> = {
  "70th Anniversary": "del 70.º Aniversario",
  "Abu Dhabi": "de Abu Dabi",
  Argentine: "de Argentina",
  Australian: "de Australia",
  Austrian: "de Austria",
  Azerbaijan: "de Azerbaiyán",
  Bahrain: "de Baréin",
  Barcelona: "de Barcelona",
  Belgian: "de Bélgica",
  Brazilian: "de Brasil",
  British: "de Gran Bretaña",
  "Caesars Palace": "de Caesars Palace",
  Canadian: "de Canadá",
  Chinese: "de China",
  Dallas: "de Dallas",
  Detroit: "de Detroit",
  Dutch: "de los Países Bajos",
  Eifel: "de Eifel",
  "Emilia Romagna": "de Emilia-Romaña",
  European: "de Europa",
  French: "de Francia",
  German: "de Alemania",
  Hungarian: "de Hungría",
  Indian: "de la India",
  Italian: "de Italia",
  Japanese: "de Japón",
  Korean: "de Corea",
  "Las Vegas": "de Las Vegas",
  Luxembourg: "de Luxemburgo",
  Madrid: "de Madrid",
  Malaysian: "de Malasia",
  Mexican: "de México",
  "Mexico City": "de la Ciudad de México",
  Miami: "de Miami",
  Monaco: "de Mónaco",
  Moroccan: "de Marruecos",
  Pacific: "del Pacífico",
  Pescara: "de Pescara",
  Portuguese: "de Portugal",
  Qatar: "de Catar",
  Russian: "de Rusia",
  Sakhir: "de Sakhir",
  "San Marino": "de San Marino",
  "São Paulo": "de São Paulo",
  "Saudi Arabian": "de Arabia Saudí",
  Singapore: "de Singapur",
  "South African": "de Sudáfrica",
  Spanish: "de España",
  Styrian: "de Estiria",
  Swedish: "de Suecia",
  Swiss: "de Suiza",
  Turkish: "de Turquía",
  Tuscan: "de la Toscana",
  "United States": "de Estados Unidos",
  "United States Grand Prix West": "del Oeste de Estados Unidos",
};

const SPECIAL_ES: Record<string, string> = {
  "Indianapolis 500": "500 Millas de Indianápolis",
  "United States Grand Prix West": "Gran Premio del Oeste de Estados Unidos",
};

/** "Australian" → "von Australien". Includes the preposition or article each name needs. */
const GP_DE: Record<string, string> = {
  "70th Anniversary": "zum 70. Jubiläum",
  "Abu Dhabi": "von Abu Dhabi",
  Argentine: "von Argentinien",
  Australian: "von Australien",
  Austrian: "von Österreich",
  Azerbaijan: "von Aserbaidschan",
  Bahrain: "von Bahrain",
  Barcelona: "von Barcelona",
  Belgian: "von Belgien",
  Brazilian: "von Brasilien",
  British: "von Großbritannien",
  "Caesars Palace": "von Caesars Palace",
  Canadian: "von Kanada",
  Chinese: "von China",
  Dallas: "von Dallas",
  Detroit: "von Detroit",
  Dutch: "der Niederlande",
  Eifel: "der Eifel",
  "Emilia Romagna": "der Emilia-Romagna",
  European: "von Europa",
  French: "von Frankreich",
  German: "von Deutschland",
  Hungarian: "von Ungarn",
  Indian: "von Indien",
  Italian: "von Italien",
  Japanese: "von Japan",
  Korean: "von Korea",
  "Las Vegas": "von Las Vegas",
  Luxembourg: "von Luxemburg",
  Madrid: "von Madrid",
  Malaysian: "von Malaysia",
  Mexican: "von Mexiko",
  "Mexico City": "von Mexiko-Stadt",
  Miami: "von Miami",
  Monaco: "von Monaco",
  Moroccan: "von Marokko",
  Pacific: "des Pazifiks",
  Pescara: "von Pescara",
  Portuguese: "von Portugal",
  Qatar: "von Katar",
  Russian: "von Russland",
  Sakhir: "von Sakhir",
  "San Marino": "von San Marino",
  "São Paulo": "von São Paulo",
  "Saudi Arabian": "von Saudi-Arabien",
  Singapore: "von Singapur",
  "South African": "von Südafrika",
  Spanish: "von Spanien",
  Styrian: "der Steiermark",
  Swedish: "von Schweden",
  Swiss: "der Schweiz",
  Turkish: "der Türkei",
  Tuscan: "der Toskana",
  "United States": "der USA",
};

const SPECIAL_DE: Record<string, string> = {
  "Indianapolis 500": "Indianapolis 500",
  "United States Grand Prix West": "Großer Preis der USA West",
};

/** The Grand Prix name in the page's language: "Brazilian Grand Prix" → "Gran Premio de Brasil" / "Großer Preis von Brasilien". */
export function gpName(lang: Lang, name: string): string {
  if (lang === "en") return name;
  const special = (lang === "de" ? SPECIAL_DE : SPECIAL_ES)[name];
  if (special) return special;
  const match = /^(.+) Grand Prix$/.exec(name);
  const of = match ? (lang === "de" ? GP_DE : GP_ES)[match[1]!] : undefined;
  if (!of) return name;
  return lang === "de" ? `Großer Preis ${of}` : `Gran Premio ${of}`;
}

/** The short Grand Prix name, without "Gran Premio de" / "Grand Prix" / "Großer Preis von": "Brasil", "Brazilian", "Brasilien". */
export function gpShortName(lang: Lang, name: string): string {
  return gpName(lang, name)
    .replace(/^Gran Premio (?:de la |de los |de las |del |de )?/, "")
    .replace(/^Großer Preis (?:von |der |des |zum )?/, "")
    .replace(/ Grand Prix$/, "");
}

/** Jolpica country → ISO 3166 code, so Intl gives the name in each language. */
const COUNTRY_CODES: Record<string, string> = {
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  China: "CN",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  India: "IN",
  Italy: "IT",
  Japan: "JP",
  Korea: "KR",
  Malaysia: "MY",
  Mexico: "MX",
  Monaco: "MC",
  Morocco: "MA",
  Netherlands: "NL",
  Portugal: "PT",
  Qatar: "QA",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  "South Africa": "ZA",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Turkey: "TR",
  UAE: "AE",
  UK: "GB",
  USA: "US",
};

const displayNames = new Map<Lang, Intl.DisplayNames>();

function regionName(lang: Lang, code: string): string | undefined {
  let names = displayNames.get(lang);
  if (!names) {
    names = new Intl.DisplayNames([lang], { type: "region" });
    displayNames.set(lang, names);
  }
  return names.of(code);
}

/** Jolpica country → ISO 3166-1 alpha-2 code, or null if we do not know it. */
export function countryCode(country: string): string | null {
  return COUNTRY_CODES[country] ?? null;
}

export function countryName(lang: Lang, country: string): string {
  const code = COUNTRY_CODES[country];
  return (code && regionName(lang, code)) || country;
}

/** Jolpica nationalities ("British") → the country's name in the page's language. */
const NATIONALITY_CODES: Record<string, string> = {
  American: "US",
  Argentine: "AR",
  Argentinian: "AR",
  Australian: "AU",
  Austrian: "AT",
  Belgian: "BE",
  Brazilian: "BR",
  British: "GB",
  Canadian: "CA",
  Chilean: "CL",
  Chinese: "CN",
  Colombian: "CO",
  Czech: "CZ",
  Danish: "DK",
  Dutch: "NL",
  "East German": "DE",
  Finnish: "FI",
  French: "FR",
  German: "DE",
  Hungarian: "HU",
  Indian: "IN",
  Indonesian: "ID",
  Irish: "IE",
  Italian: "IT",
  Japanese: "JP",
  Liechtensteiner: "LI",
  Malaysian: "MY",
  Mexican: "MX",
  Monegasque: "MC",
  "New Zealander": "NZ",
  Polish: "PL",
  Portuguese: "PT",
  Rhodesian: "ZW",
  Russian: "RU",
  "South African": "ZA",
  Spanish: "ES",
  Swedish: "SE",
  Swiss: "CH",
  Thai: "TH",
  Uruguayan: "UY",
  Venezuelan: "VE",
};

export function nationalityCountry(lang: Lang, nationality: string | null): string | null {
  if (!nationality) return null;
  const code = NATIONALITY_CODES[nationality];
  return (code && regionName(lang, code)) || nationality;
}
