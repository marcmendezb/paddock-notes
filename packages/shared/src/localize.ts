import type { Lang } from "./constants";

/**
 * Nombres de Grandes Premios y países en español. Jolpica los publica en inglés.
 * Si un nombre no está en la tabla, se muestra tal cual (es un dato, no una traducción inventada).
 */

/** "Australian" → "de Australia". Incluye la preposición para los casos con artículo. */
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

/** Nombre del GP en el idioma de la página: "Brazilian Grand Prix" → "Gran Premio de Brasil". */
export function gpName(lang: Lang, name: string): string {
  if (lang === "en") return name;
  const special = SPECIAL_ES[name];
  if (special) return special;
  const match = /^(.+) Grand Prix$/.exec(name);
  const of = match ? GP_ES[match[1]!] : undefined;
  return of ? `Gran Premio ${of}` : name;
}

/** País de Jolpica → código ISO 3166, para que Intl ponga el nombre en cada idioma. */
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

/** País de Jolpica → código ISO 3166-1 alfa-2, o null si no lo conocemos. */
export function countryCode(country: string): string | null {
  return COUNTRY_CODES[country] ?? null;
}

export function countryName(lang: Lang, country: string): string {
  const code = COUNTRY_CODES[country];
  return (code && regionName(lang, code)) || country;
}

/** Nacionalidades de Jolpica ("British") → nombre del país en el idioma de la página. */
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
