import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const season = new Date().getUTCFullYear();

/** Core pages for phase 1 across languages. */
const PAGES = [
  "/es",
  "/en",
  `/es/races/${season}`,
  `/en/races/${season}`,
  `/es/races/${season}/1`,
  `/es/standings/${season}`,
  "/es/about",
  "/en/accessibility",
  // Phase 2: Historical archive
  "/de/compare",
  "/es/learn/circuits",
  "/de/learn/circuits",
  "/es/drivers/russell",
  "/en/constructors/mercedes",
  "/es/circuits/albert_park",
  "/es/circuits/rodriguez",
  "/es/circuits/interlagos",
  "/en/circuits/interlagos",
  "/es/circuits/vegas",
  "/es/circuits/americas",
  "/es/circuits/losail",
  "/en/circuits/yas_marina",
  "/es/compare?a=russell&b=antonelli",
  "/es/search?q=ham",
  // Phase 5: Learn
  "/es/learn",
  "/en/learn/undercut-overcut",
  "/es/learn/points",
  "/es/learn/glossary",
  "/en/learn/glossary/delta",
  "/es/analysis",
  // Phase 4: Account-less interactive features
  "/es/quiz",
  "/en/simulator",
  "/es/account",
  "/es/newsletter",
  "/es/notes",
  "/es/notes/2026-mexico",
  "/en/notes/2026-mexico",
  "/es/standings/2026/current-points",
  "/en/newsletter",
  "/es/newsletter/confirm?token=nope",
  "/en/predictions",
  "/de",
  "/de/races/2026",
  "/de/standings/2026",
  "/de/learn/undercut-overcut",
  "/de/learn/glossary",
  "/de/notes/2026-mexico",
];

/** Collects console and page errors, including CSP violations and hydration errors. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

for (const path of PAGES) {
  test(`${path}: loads without errors and satisfies WCAG 2.2 AA`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", path.slice(1, 3));
    // No broken internal links on the page (TRA-04): all internal hrefs return 200.
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    for (const href of hrefs.filter((h) => !h.endsWith(".ics")).slice(0, 15)) {
      const res = await page.request.get(href);
      expect(res.status(), href).toBe(200);
    }

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("the root redirects to the visitor's language (TRA-11, D-36)", async ({ browser, baseURL }) => {
  // Locally there is no Cloudflare country: the browser's Accept-Language decides, English by default.
  for (const [locale, lang] of [
    ["en-GB", "en"],
    ["es-ES", "es"],
    ["de-DE", "de"],
    ["it-IT", "en"],
  ]) {
    const context = await browser.newContext({ baseURL, locale });
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe(`/${lang}`);
    await context.close();
  }
  // With a country, the country decides: Switzerland reads German even with a French browser.
  for (const [country, locale, lang] of [
    ["CH", "fr-CH", "de"],
    ["ES", "en-GB", "es"],
    ["MX", "es-MX", "en"],
  ] as const) {
    const context = await browser.newContext({ baseURL, locale, extraHTTPHeaders: { "cf-ipcountry": country } });
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe(`/${lang}`);
    await context.close();
  }
});

test("language selector preserves current page path (TRA-12)", async ({ page, isMobile }) => {
  await page.goto(`/es/standings/${season}`);
  // On mobile, language switcher is inside the slide-out menu.
  if (isMobile) await page.locator(".menu-toggle").click();
  // Header dropdown: open summary and select target language.
  const select = page.locator(".site-header .lang-switch:visible").first();
  await select.locator("summary").click();
  await select.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/standings/${season}$`));
});

test("skip link is first focusable element with keyboard (TRA-20)", async ({ page, isMobile }) => {
  test.skip(isMobile, "No physical keyboard on mobile");
  await page.goto("/es");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
});

test("season selector works without JavaScript (TRA-34)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/es/races/${season}`);
  await page.getByLabel("Temporada", { exact: true }).selectOption(String(season - 1));
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page).toHaveURL(new RegExp(`/es/races/${season - 1}$`));
  await expect(page.locator("h1")).toHaveText(`Calendario ${season - 1}`);
  await context.close();
});

test("CSP emits distinct nonces on each request (security.md §4.1)", async ({ request }) => {
  const nonceOf = async () => {
    const res = await request.get("/es");
    const csp = res.headers()["content-security-policy"] ?? res.headers()["content-security-policy-report-only"] ?? "";
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["cache-control"]).toContain("no-store");
    return /'nonce-([^']+)'/.exec(scriptSrc)?.[1];
  };
  const [a, b] = [await nonceOf(), await nonceOf()];
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
});

test("non-existent pages return 404 in the URL locale (TRA-14)", async ({ page }) => {
  for (const path of ["/es/no-existe", "/es/races/1900", "/es/races/2026/99", "/es/standings/abc"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  await page.goto("/es/no-existe");
  await expect(page.locator("h1")).toHaveText("No encontramos esta página.");
  await page.goto("/en/no-such-page");
  await expect(page.locator("h1")).toHaveText("We couldn't find this page.");
});

test("calendar downloads in .ics format (NUC-16)", async ({ request }) => {
  const res = await request.get(`/es/races/${season}/calendar.ics`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  expect(await res.text()).toContain("BEGIN:VEVENT");
});

test("security.txt published (.well-known/security.txt, security.md §19)", async ({ request }) => {
  const res = await request.get("/.well-known/security.txt");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("Contact:");
});

test("standings progression chart has equivalent table and works without JS (NUC-33)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/es/standings/${season}`);
  // Two geometries are drawn (D-37); only the one that fits the column is shown, without JavaScript.
  await expect(page.locator("figure.chart svg[role='img']")).toHaveCount(2);
  await expect(page.locator("figure.chart svg[role='img']:visible")).toHaveCount(1);
  await expect(page.getByText("Tabla con los mismos datos del gráfico")).toBeVisible();
  await page.getByRole("checkbox").first().uncheck();
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(page).toHaveURL(/[?&]d=/);
  await context.close();
});

test("forward slash shortcut opens search modal (TRA-03)", async ({ page, isMobile }) => {
  test.skip(isMobile, "No physical keyboard on mobile");
  await page.goto("/es");
  // Shortcut registers once React hydrates.
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/es\/search$/);
  await expect(page.getByRole("searchbox")).toBeFocused();
});

test("invalid or non-existent IDs return 404", async ({ page }) => {
  for (const path of ["/es/drivers/no_existe", "/es/drivers/Bad%20Id", "/es/records", "/es/records/wins", "/es/circuits/x"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("each analysis tool loads without errors and satisfies WCAG (TEC-01 to TEC-09)", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/es/analysis");
  const race = page.locator("main .an-latest-title a").first();
  test.skip((await race.count()) === 0, "No analyzed races available in this environment");
  await race.click();
  await page.waitForURL(/\/analysis\/\d{4}\/\d+$/);
  const tools = await page.locator("main .an-tools a.tile").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(tools.length).toBeGreaterThanOrEqual(4);
  for (const href of tools) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator("main details summary").first()).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${href} ${v.id}: ${v.nodes.length}`)).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("telemetry comparison can be navigated with keyboard (TEC-04)", async ({ page, isMobile }) => {
  test.skip(isMobile, "No physical keyboard on mobile");
  await page.goto("/es/analysis");
  const race = page.locator("main .an-latest-title a").first();
  test.skip((await race.count()) === 0, "No analyzed races available in this environment");
  const href = await race.getAttribute("href");
  await page.goto(`${href}/telemetry`);
  const chart = page.locator("svg.telemetry-svg:visible");
  await chart.focus();
  const before = await page.locator(".readout span").first().textContent();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator(".readout span").first()).not.toHaveText(before ?? "");
});

test("glossary filters terms dynamically while typing (CON-02)", async ({ page }) => {
  await page.goto("/es/learn/glossary");
  await page.getByRole("searchbox").fill("undercut");
  await expect(page.locator(".gx-grid dt")).toHaveCount(1);
  await expect(page.locator(".gx-grid dt")).toHaveText("Undercut");
});

test("title simulator computes scenario and encodes state in URL (COM-09)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/simulator");
  const selects = page.locator("form select");
  test.skip((await selects.count()) === 0, "No remaining races available in this environment");
  await selects.first().selectOption("1");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page).toHaveURL(/r\d+_[a-z0-9_-]+=1/);
  await expect(page.locator(".sim-champion")).toContainText("sería campeón");
  await context.close();
});

test("quiz grades answers without JavaScript (COM-08)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/quiz");
  const questions = page.locator("fieldset.quiz-question");
  test.skip((await questions.count()) === 0, "No quiz data available");
  for (const q of await questions.all()) await q.locator(".quiz-option").first().click();
  await page.getByRole("button", { name: "Comprobar" }).click();
  await expect(page.getByRole("status")).toContainText(/Has acertado \d de \d/);
  await context.close();
});

test("community pages protect authenticated resources when unauthenticated (COM-01, security.md §10)", async ({ page, request }) => {
  await page.goto("/es/account");
  await expect(page.locator("input[type=email]")).toBeVisible();
  expect((await page.goto("/es/leagues/00000000-0000-4000-8000-000000000000"))?.status()).toBe(404);
  // Cross-origin form submission is rejected (CSRF protection).
  const forged = await request.post("/es/forms/profile", { headers: { origin: "https://evil.example" }, form: { name: "x" } });
  expect(forged.status()).toBe(403);
});

test("newsletter is a portfolio demo and clarifies no data is stored (NUC-10, D-33)", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") sent.push(r.url());
  });
  await page.goto("/es");
  await expect(page.locator("script[data-turnstile]")).toHaveCount(0);
  const form = page.locator("form[action$='/forms/newsletter']").first();
  await form.locator("input[name=email]").fill("prueba@example.com");
  await form.locator("input[name=consent]").check();
  await form.getByRole("button", { name: "Apuntarme" }).click();
  const dialog = page.getByRole("dialog", { name: "Esto es un proyecto de portfolio" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("no se ha guardado en ningún sitio");
  expect(sent).toEqual([]);
  await expect(form.locator("input[name=email]")).toHaveValue("");
  await dialog.getByRole("button", { name: "Entendido" }).click();
  await expect(dialog).toBeHidden();
});

test("without JavaScript, newsletter also displays demo notice (D-33)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/newsletter");
  const form = page.locator("form[action$='/forms/newsletter']").first();
  await form.locator("input[name=email]").fill("prueba@example.com");
  await form.locator("input[name=consent]").check();
  await form.getByRole("button", { name: "Apuntarme" }).click();
  await expect(page).toHaveURL(/\/es\/newsletter\?msg=newsletter%3Aok/);
  await expect(page.getByRole("status")).toContainText("no se ha guardado en ningún sitio");
  await context.close();
});

test("homepage race report columns adapt cleanly to viewport (NUC-05)", async ({ page, isMobile }) => {
  await page.goto("/es");
  const points = page.locator(".rr-points");
  test.skip((await points.count()) === 0, "No scored race available in this environment");
  const width = await points.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(isMobile ? 250 : 300);
});

test("history route redirects to current season head-to-head (D-35)", async ({ page }) => {
  await page.goto("/es/history");
  await expect(page).toHaveURL(/\/es\/compare$/);
  await expect(page.getByText(/Solo la temporada \d{4}/)).toBeVisible();
  await expect(page.locator(".cmp-duel")).toBeVisible();
});

test("head-to-head comparison selects from grid and bounds to current season (D-35)", async ({ browser, baseURL }) => {
  // Without JavaScript: dropdown radios submit through form.
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/compare");
  const b = page.locator(".dp.is-b");
  await b.locator("summary").click();
  const option = b.locator(".dp-option").nth(3);
  const id = await option.locator("input").getAttribute("value");
  await option.click();
  // Without JavaScript: manually close details disclosure.
  await b.locator("summary").click();
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page).toHaveURL(new RegExp(`b=${id}`));
  await expect(page.locator(".cmp-duel-kicker")).toContainText(String(new Date().getUTCFullYear()));
  await context.close();
});

test("suggested explainer displayed for upcoming GP (NUC-09)", async ({ page }) => {
  await page.goto("/es");
  await expect(page.getByText("Para entender este GP", { exact: true })).toBeVisible();
});

test("confirmation and unsubscribe require button click rather than bare link hit (D-16)", async ({ page }) => {
  const token = "0".repeat(48);
  for (const path of [`/es/newsletter/confirm?token=${token}`, `/es/newsletter/unsubscribe?token=${token}`]) {
    await page.goto(path);
    await expect(page.locator("form button[type=submit]")).toBeVisible();
  }
});

test("season map links each venue pin to circuit profile (NUC-17)", async ({ page }) => {
  await page.goto("/es/races/2026");
  const pins = page.locator("#season-map ~ * a.map-pin, .season-map a.map-pin");
  expect(await pins.count()).toBeGreaterThan(5);
  await expect(pins.first()).toHaveAttribute("href", /\/es\/circuits\//);
  await expect(pins.first()).toHaveAttribute("aria-label", /Ronda \d+/);
});

test("recalculated standings under modern system is explicitly labeled (HIS-06)", async ({ page }) => {
  await page.goto("/es/standings/2026");
  await page.getByRole("link", { name: /sistema actual/ }).click();
  await expect(page.getByText("Recálculo, no es la clasificación oficial").first()).toBeVisible();
});

test("web serves /api through Service Binding with CSRF protection (D-26)", async ({ request, baseURL }) => {
  const health = await request.get("/api/v1/health");
  expect(health.status()).toBe(200);
  // External origin cannot mutate even if attempting to spoof internal origin header.
  const forged = await request.post("/api/v1/newsletter", {
    headers: { origin: "https://evil.example", "x-paddock-origin": baseURL!, "content-type": "application/json" },
    data: { email: "x@example.com", lang: "es", consent: true },
  });
  expect(forged.status()).toBe(403);
});

test("hero weekend schedule displays race session prominently (NUC-03)", async ({ page }) => {
  await page.goto("/es");
  expect(await page.locator(".cal-block").count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator(".cal-race")).toHaveCount(1);
  // Timings also accessible in text for screen readers.
  expect(await page.locator(".sheet-sessions .sessions li").count()).toBeGreaterThanOrEqual(3);
});

test("mobile navigation menu opens full-screen without JavaScript (TRA-01)", async ({ browser, baseURL, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport only");
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/es");
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".menu-sheet").getByRole("link", { name: /Clasificación/ })).toBeVisible();
  await context.close();
});

test("no page is wider than a 320 px phone and charts use their narrow geometry (D-37)", async ({ browser, baseURL, isMobile }) => {
  test.skip(!isMobile, "Mobile project only: it opens its own 320 px context");
  test.setTimeout(120_000);
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  // The latest analysed race and its tools carry the widest tables and every chart.
  await page.goto("/es/analysis");
  const race = await page.locator("main .an-latest-title a").first().getAttribute("href").catch(() => null);
  const extra = race
    ? [race.replace("/analysis/", "/races/"), ...["strategy", "pace", "telemetry", "replay"].map((tool) => `${race}/${tool}`)]
    : [];
  for (const path of [...PAGES, ...extra]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is ${overflow} px wider than the screen`).toBe(0);
    for (const chart of await page.locator(".chart-duo").all()) {
      await expect(chart.locator(".chart-wide").first(), path).toBeHidden();
      await expect(chart.locator(".chart-narrow").first(), path).toBeVisible();
    }
  }
  await context.close();
});

test("ticker lead highlights current event and alternates with facts", async ({ page }) => {
  await page.goto("/es");
  // Live or next event is fixed; ticker alternates between data and event pills.
  await expect(page.locator(".ticker-lead")).toBeVisible();
  const items = page.locator(".ticker-group").first().locator(".ticker-item");
  await expect(items.nth(0)).not.toHaveClass(/ticker-event/);
  await expect(items.nth(1)).toHaveClass(/ticker-event/);
});
