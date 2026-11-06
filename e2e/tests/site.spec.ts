import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const season = new Date().getUTCFullYear();

/** Páginas núcleo de la fase 1, en los dos idiomas. */
const PAGES = [
  "/es",
  "/en",
  `/es/races/${season}`,
  `/en/races/${season}`,
  `/es/races/${season}/1`,
  `/es/standings/${season}`,
  "/es/about",
  "/en/accessibility",
  // Fase 2: histórico
  "/es/history",
  "/en/records",
  "/es/records/wins",
  "/es/drivers/russell",
  "/en/constructors/mercedes",
  "/es/circuits/albert_park",
  "/es/circuits/rodriguez",
  "/es/compare?a=russell&b=antonelli",
  "/es/search?q=ham",
  // Fase 5: Aprende
  "/es/learn",
  "/en/learn/undercut-overcut",
  "/es/learn/points",
  "/es/learn/glossary",
  "/en/learn/glossary/delta",
  "/es/analysis",
  // Fase 4: sin cuenta
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
];

/** Recoge errores de consola y de página: incluye violaciones de CSP y errores de hidratación. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

for (const path of PAGES) {
  test(`${path}: carga sin errores y cumple WCAG 2.2 AA`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", path.slice(1, 3));
    // Ningún enlace interno roto en la página (TRA-04): todos los href internos responden 200.
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

test("la raíz redirige al idioma preferido (TRA-11)", async ({ browser, baseURL }) => {
  // El navegador envía Accept-Language según su locale.
  for (const [locale, lang] of [
    ["en-GB", "en"],
    ["es-ES", "es"],
    ["de-DE", "es"],
  ]) {
    const context = await browser.newContext({ baseURL, locale });
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe(`/${lang}`);
    await context.close();
  }
});

test("el selector de idioma conserva la página (TRA-12)", async ({ page }) => {
  await page.goto(`/es/standings/${season}`);
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/standings/${season}$`));
});

test("el enlace para saltar al contenido es lo primero con el teclado (TRA-20)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Sin teclado en móvil");
  await page.goto("/es");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
});

test("el selector de temporada funciona sin JavaScript (TRA-34)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/es/races/${season}`);
  await page.getByLabel("Temporada", { exact: true }).selectOption(String(season - 1));
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page).toHaveURL(new RegExp(`/es/races/${season - 1}$`));
  await expect(page.locator("h1")).toHaveText(`Calendario ${season - 1}`);
  await context.close();
});

test("CSP con nonce distinto en cada petición (seguridad.md §4.1)", async ({ request }) => {
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

test("las páginas inexistentes dan 404 en el idioma de la URL (TRA-14)", async ({ page }) => {
  for (const path of ["/es/no-existe", "/es/races/1900", "/es/races/2026/99", "/es/standings/abc"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  await page.goto("/es/no-existe");
  await expect(page.locator("h1")).toHaveText("No encontramos esta página.");
  await page.goto("/en/no-such-page");
  await expect(page.locator("h1")).toHaveText("We couldn't find this page.");
});

test("el calendario se descarga en .ics (NUC-16)", async ({ request }) => {
  const res = await request.get(`/es/races/${season}/calendar.ics`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  expect(await res.text()).toContain("BEGIN:VEVENT");
});

test("security.txt publicado (seguridad.md §19)", async ({ request }) => {
  const res = await request.get("/.well-known/security.txt");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("Contact:");
});

test("el gráfico de evolución tiene tabla equivalente y se puede elegir pilotos sin JS (NUC-33)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/es/standings/${season}`);
  await expect(page.locator("figure.chart svg[role='img']")).toHaveCount(1);
  await expect(page.getByText("Tabla con los mismos datos del gráfico")).toBeVisible();
  await page.getByRole("checkbox").first().uncheck();
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(page).toHaveURL(/[?&]d=/);
  await context.close();
});

test("el atajo / abre la búsqueda (TRA-03)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Sin teclado en móvil");
  await page.goto("/es");
  // El atajo se registra al hidratar React.
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/es\/search$/);
  await expect(page.getByRole("searchbox")).toBeFocused();
});

test("los IDs inválidos o inexistentes dan 404", async ({ page }) => {
  for (const path of ["/es/drivers/no_existe", "/es/drivers/Bad%20Id", "/es/records/nada", "/es/circuits/x"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("cada herramienta de análisis carga sin errores y cumple WCAG (TEC-01 a TEC-09)", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/es/analysis");
  const race = page.locator("main h3 a").first();
  test.skip((await race.count()) === 0, "No hay carreras analizadas en este entorno");
  await race.click();
  await page.waitForURL(/\/analysis\/\d{4}\/\d+$/);
  const tools = await page.locator("main .cards h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(tools.length).toBeGreaterThanOrEqual(4);
  for (const href of tools) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator("details summary").first()).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${href} ${v.id}: ${v.nodes.length}`)).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("el comparador de telemetría se recorre con el teclado (TEC-04)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Sin teclado en móvil");
  await page.goto("/es/analysis");
  const race = page.locator("main h3 a").first();
  test.skip((await race.count()) === 0, "No hay carreras analizadas en este entorno");
  const href = await race.getAttribute("href");
  await page.goto(`${href}/telemetry`);
  const chart = page.locator("svg.telemetry-svg");
  await chart.focus();
  const before = await page.locator(".readout span").first().textContent();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator(".readout span").first()).not.toHaveText(before ?? "");
});

test("el glosario filtra al escribir (CON-02)", async ({ page }) => {
  await page.goto("/es/learn/glossary");
  await page.getByRole("searchbox").fill("undercut");
  await expect(page.locator(".glossary-list dt")).toHaveCount(1);
  await expect(page.locator(".glossary-list dt")).toHaveText("Undercut");
});

test("el simulador calcula un escenario y lo guarda en la URL (COM-09)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/simulator");
  const selects = page.locator("form select");
  test.skip((await selects.count()) === 0, "No quedan carreras en este entorno");
  await selects.first().selectOption("1");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page).toHaveURL(/r\d+_[a-z0-9_-]+=1/);
  await expect(page.locator(".auto-note")).toContainText("sería campeón");
  await context.close();
});

test("el quiz corrige las respuestas sin JavaScript (COM-08)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/quiz");
  const questions = page.locator("fieldset.quiz-question");
  test.skip((await questions.count()) === 0, "Sin datos para el quiz");
  for (const q of await questions.all()) await q.locator("input[type=radio]").first().check();
  await page.getByRole("button", { name: "Comprobar" }).click();
  await expect(page.getByRole("status")).toContainText(/Has acertado \d de \d/);
  await context.close();
});

test("las páginas de comunidad protegen los recursos sin sesión (COM-01, seguridad.md §10)", async ({ page, request }) => {
  await page.goto("/es/account");
  await expect(page.locator("input[type=email]")).toBeVisible();
  expect((await page.goto("/es/leagues/00000000-0000-4000-8000-000000000000"))?.status()).toBe(404);
  // Un formulario enviado desde otro origen se rechaza (CSRF).
  const forged = await request.post("/es/forms/profile", { headers: { origin: "https://evil.example" }, form: { name: "x" } });
  expect(forged.status()).toBe(403);
});

test("la newsletter de la home no carga Turnstile hasta tocar el formulario (NUC-10)", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("script[data-turnstile]")).toHaveCount(0);
  await page.locator("form[action$='/forms/newsletter'] input[name=email]").focus();
  await expect(page.locator("script[data-turnstile]")).toHaveCount(1);
});

test("explicador sugerido para el próximo GP (NUC-09)", async ({ page }) => {
  await page.goto("/es");
  await expect(page.getByText("Para entender este GP:")).toBeVisible();
});

test("confirmar y darse de baja piden pulsar un botón, no basta con abrir el enlace (D-16)", async ({ page }) => {
  const token = "0".repeat(48);
  for (const path of [`/es/newsletter/confirm?token=${token}`, `/es/newsletter/unsubscribe?token=${token}`]) {
    await page.goto(path);
    await expect(page.locator("form button[type=submit]")).toBeVisible();
  }
});

test("mapa de la temporada: cada punto enlaza a la ficha del circuito (NUC-17)", async ({ page }) => {
  await page.goto("/es/races/2026");
  const pins = page.locator("#season-map ~ * a.map-pin, .season-map a.map-pin");
  expect(await pins.count()).toBeGreaterThan(5);
  await expect(pins.first()).toHaveAttribute("href", /\/es\/circuits\//);
  await expect(pins.first()).toHaveAttribute("aria-label", /Ronda \d+/);
});

test("el recálculo con el sistema actual va rotulado como recálculo (HIS-06)", async ({ page }) => {
  await page.goto("/es/standings/2026");
  await page.getByRole("link", { name: /sistema actual/ }).click();
  await expect(page.getByText("Recálculo, no es la clasificación oficial").first()).toBeVisible();
});

test("la web sirve /api por Service Binding y conserva la protección CSRF (D-26)", async ({ request, baseURL }) => {
  const health = await request.get("/api/v1/health");
  expect(health.status()).toBe(200);
  // Un origen ajeno no puede escribir aunque intente colar la cabecera interna.
  const forged = await request.post("/api/v1/newsletter", {
    headers: { origin: "https://evil.example", "x-paddock-origin": baseURL!, "content-type": "application/json" },
    data: { email: "x@example.com", lang: "es" },
  });
  expect(forged.status()).toBe(403);
});
