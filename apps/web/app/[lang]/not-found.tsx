import { NotFoundView, requestLang } from "@/components/not-found-view";

export default async function LangNotFound() {
  return <NotFoundView lang={await requestLang()} />;
}
