import { redirect } from "next/navigation";
import { parseLang } from "@/lib/params";

/**
 * The History section was removed (D-35): with the history half loaded it was not historical. Anyone
 * arriving through an old link goes to the current season's head to head.
 */
export default async function HistoryPage({ params }: { params: Promise<{ lang: string }> }) {
  redirect(`/${parseLang((await params).lang)}/compare`);
}
