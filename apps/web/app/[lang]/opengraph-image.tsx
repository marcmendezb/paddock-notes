import { dict } from "@/lib/i18n";
import { OG_SIZE, ogImage } from "@/lib/og";
import { parseLang } from "@/lib/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Paddock Notes";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  return ogImage({
    eyebrow: "Paddock Notes",
    title: t.tagline,
    subtitle: t.analysis.lede,
    footer: t.footer.disclaimer,
  });
}
