import { notFound } from "next/navigation";
import { FIRST_SEASON, isLang, type Lang } from "@paddock/shared";

/** Validación de los segmentos de ruta: cualquier valor fuera de lo esperado es un 404. */

export function parseLang(value: string): Lang {
  if (!isLang(value)) notFound();
  return value;
}

export function parseSeason(value: string): number {
  if (!/^\d{4}$/.test(value)) notFound();
  const season = Number(value);
  if (season < FIRST_SEASON || season > new Date().getUTCFullYear() + 1) notFound();
  return season;
}

export function parseRound(value: string): number {
  if (!/^\d{1,2}$/.test(value)) notFound();
  const round = Number(value);
  if (round < 1) notFound();
  return round;
}
