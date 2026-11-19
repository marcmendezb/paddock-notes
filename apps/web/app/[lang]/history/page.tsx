import { redirect } from "next/navigation";
import { parseLang } from "@/lib/params";

/**
 * La sección Histórico se retiró (D-35): con el histórico a medio cargar no era histórica. Quien llegue
 * por un enlace antiguo va al cara a cara de la temporada en curso.
 */
export default async function HistoryPage({ params }: { params: Promise<{ lang: string }> }) {
  redirect(`/${parseLang((await params).lang)}/compare`);
}
