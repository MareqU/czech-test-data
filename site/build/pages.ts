// Static HTML of every page: the home page and one page per identifier, all from src/catalog.ts. The Vite plugin
// (build/plugin.ts) writes them before the dev server or the build starts; they are generated, never edited.
// Titles, descriptions, headings and intro texts are in the HTML itself, so search engines see them without JS.
// Links are relative (./ico/, ../), so the site works from any path; canonical URLs point to SITE.
import { createCz } from 'czech-test-data';
import { IDENTIFIERS } from '../src/catalog.js';
import { buildOverview } from '../src/overview.js';
import type { Cell } from '../src/overview.js';
import { czHtml } from '../src/typography.js';
import type { IdentifierInfo } from '../src/catalog.js';

export interface Page {
  /** Rollup input name. */
  readonly name: string;
  /** Path of the HTML file relative to site/, e.g. `ico/index.html`. */
  readonly path: string;
  readonly title: string;
  readonly h1: string;
  /** Canonical address, e.g. `https://testovacidata.cz/ico/`. */
  readonly url: string;
  readonly html: string;
}

/** Where the site is deployed (GitHub Pages with a custom domain, .github/workflows/pages.yml). */
export const SITE = 'https://testovacidata.cz/';
const REPOSITORY = 'https://github.com/MareqU/czech-test-data';
const NPM = 'https://www.npmjs.com/package/czech-test-data';
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2311457e'/%3E%3Cpath d='M9 17l4.5 4.5L23 11' stroke='white' stroke-width='3.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

/** Escapes text for HTML element content and double-quoted attributes. */
export function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

interface Layout {
  /** `./` on the home page, `../` on an identifier page: the way back to the site root. */
  readonly root: string;
  /** Canonical address of the page. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly current?: IdentifierInfo;
  readonly main: string;
  /** Entry script: the overview on the home page, the generator on identifier pages. */
  readonly script: 'home' | 'main';
}

function header(root: string, current: IdentifierInfo | undefined): string {
  const links = IDENTIFIERS.map((info) => {
    const here = info === current ? ' aria-current="page"' : '';
    return `<a href="${root}${info.slug}/"${here}>${escapeHtml(info.short)}</a>`;
  }).join('');
  // The home page lists every identifier in its table, so it needs no nav row.
  const nav = current === undefined ? '' : `\n      <nav class="wrap nav" aria-label="Generátory">${links}</nav>`;
  return `<header class="top">
      <div class="wrap top-row">
        <a class="brand" href="${root}">czech-test-data</a>
        <span class="top-links"><a href="${NPM}">npm</a><a href="${REPOSITORY}">GitHub</a></span>
      </div>${nav}
    </header>`;
}

function footer(root: string): string {
  return `<footer class="foot">
      <div class="wrap">
        <p>Vše běží ve vašem prohlížeči, nic se neodesílá. Data jsou jen pro testovací systémy: platné rodné číslo nebo
        telefon může patřit skutečnému člověku, tak na vygenerovaná čísla nevolejte.</p>
        <p>Pravidla podle oficiálních zdrojů (zákon o evidenci obyvatel, ČNB, ČTÚ, OTE, ENTSO-E),
        <a href="${REPOSITORY}/tree/main/docs/rules">přehled pravidel</a>. Knihovna pro testy:
        <a href="${NPM}">npm</a>, <a href="${REPOSITORY}">GitHub</a>. Licence MIT.
        Pro AI agenty: <a href="${root}llms.txt">llms.txt</a>.</p>
        <p><a href="${root}">Úvod</a></p>
      </div>
    </footer>`;
}

function layout({ root, url, title, description, current, main, script }: Layout): string {
  const dataId = current === undefined ? '' : ` data-id="${current.id}"`;
  // Czech typography for every text of the page (not attributes, not code): see src/typography.ts.
  return czHtml(`<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="cs_CZ" />
    <meta property="og:site_name" content="Česká testovací data" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="${ICON}" />
    <script type="module" src="/src/${script}.ts"></script>
  </head>
  <body${dataId}>
    <a class="skip" href="#generator">Přeskočit na generátor</a>
    ${header(root, current)}
    <main class="wrap">
${main}
    </main>
    ${footer(root)}
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  </body>
</html>
`);
}

/**
 * The generator: mode switch, then what to generate (variant chips, or the generator options for valid values),
 * then one big value with "next" and "link". Seed and reference date are the only folded-away part; the address bar
 * always carries the state, so copying it is the way to share these exact values.
 */
function generator(): string {
  return `      <section id="generator" class="generator" aria-label="Generátor">
        <div id="modes" class="seg" role="radiogroup" aria-label="Druh hodnot"></div>
        <div id="picker" class="picker"></div>
        <div class="stage" aria-live="polite">
          <button id="big-value" class="big-value" type="button" title="Kliknutím zkopírujete"></button>
          <p id="big-verdict" class="verdict"></p>
          <p id="big-text" class="explain"></p>
        </div>
        <div class="stage-actions">
          <button id="next" class="button primary" type="button">Další</button>
          <span id="big-pos" class="pos"></span>
        </div>
        <p class="in-tests">V testech: <code id="big-code"></code>
          <a href="#code-title">jak na to ↓</a></p>
        <p id="warning" class="warning" hidden></p>
        <p id="error" class="error" role="alert" hidden></p>
        <details class="advanced">
          <summary>Pokročilé: seed a referenční datum</summary>
          <p class="hint">Adresa stránky obsahuje seed – kdo ji otevře, uvidí stejné hodnoty.</p>
          <div id="advanced" class="fields"></div>
        </details>${KIT_CALLOUT}
      </section>`;
}

/** The kit offer right under the generator (home and identifier pages); the kit itself is further down (#kit). */
const KIT_CALLOUT = `
        <div id="kit-callout" class="kit-callout">
          <p><strong>Testujete jedno pole formuláře?</strong> Sada připraví všechno najednou: platné, hraniční
          i chybné hodnoty a u každé, jestli ji má formulář přijmout, nebo odmítnout.</p>
          <button id="kit-open" class="button primary" type="button">Připravit sadu</button>
        </div>`;

/** The form-check kit for the selected identifier; hidden until the visitor asks for it (or kit=1). */
const KIT_SECTION = `      <section id="kit" class="block" aria-labelledby="kit-title" hidden>
        <h2 id="kit-title">Sada pro ověření formuláře</h2>
        <p class="hint">Každou hodnotu vyzkoušejte v poli formuláře a porovnejte se sloupcem Očekáváno. Sporné varianty
        sada vynechává. Adresa stránky obsahuje seed, takže stejný odkaz dá stejnou sadu.</p>
        <div class="kit-actions">
          <button id="kit-json-copy" class="button primary" type="button">Kopírovat JSON</button>
          <button id="kit-json" class="button" type="button">Stáhnout JSON</button>
          <span id="kit-summary" class="pos"></span>
        </div>
        <p class="kit-excel">JSON je pro testy řízené daty: hodnoty beze změny, <code>valid</code> říká, jestli je má
          formulář přijmout. Pro Excel nebo Jiru:
          <button id="kit-copy" class="link-button" type="button">kopírovat tabulku</button> ·
          <button id="kit-csv" class="link-button" type="button">stáhnout CSV</button></p>
        <details class="kit-values">
          <summary id="kit-toggle">Zobrazit hodnoty</summary>
          <div class="kit-scroll">
            <table class="kit-table">
              <thead><tr><th scope="col">Hodnota</th><th scope="col">Varianta</th><th scope="col">Co testuje</th>
                <th scope="col">Očekáváno</th></tr></thead>
              <tbody id="kit-rows"></tbody>
            </table>
          </div>
        </details>
      </section>`;

function identifierSections(): string {
  // The form-check kit sits between "more values" and the validator; hidden until the visitor asks for it.
  return `
      <section class="block" aria-labelledby="more-title">
        <h2 id="more-title">Víc hodnot najednou</h2>
        <div class="list-head">
          <label class="field small" for="count"><span id="count-label">Počet</span>
            <input id="count" type="number" inputmode="numeric" min="1" max="100" /></label>
          <button id="copy-all" class="button" type="button">Kopírovat vše</button>
        </div>
        <ol id="results" class="list"></ol>
      </section>

${KIT_SECTION}
      <section class="block" aria-labelledby="validate-title">
        <h2 id="validate-title">Ověřit hodnotu</h2>
        <p class="hint">Vložte jednu nebo víc hodnot, každou na řádek. Mezery se neořezávají, mezera navíc je také chyba.</p>
        <label class="visually-hidden" for="validate-input">Hodnoty k ověření</label>
        <textarea id="validate-input" rows="3" spellcheck="false" autocomplete="off"></textarea>
        <ol id="validate-results" class="list"></ol>
      </section>

      <section class="block" aria-labelledby="code-title">
        <h2 id="code-title">V automatických testech</h2>
        <p class="hint">Stejný seed dává v knihovně i v příkazové řádce stejné hodnoty jako tady.
        Instalace: <code>npm install --save-dev czech-test-data</code></p>
        <div class="snippet"><div class="snippet-head"><span>TypeScript</span>
          <button class="button small" type="button" data-copy="code">Kopírovat</button></div>
          <pre><code id="code"></code></pre></div>
        <div class="snippet"><div class="snippet-head"><span>Příkazová řádka</span>
          <button class="button small" type="button" data-copy="cli">Kopírovat</button></div>
          <pre><code id="cli"></code></pre></div>
      </section>`;
}

/** The seed of the values written into the home page's HTML; src/home.ts draws its own on load. */
const PRERENDER_SEED = 1;

/** A cell's content, the same markup src/home.ts renders; the value is in <code>, out of the Czech typography. */
export function cellHtml(cell: Cell): string {
  const title = cell.title === '' ? '' : `<span class="cell-title">${escapeHtml(cell.title)}</span>`;
  return `<button type="button" class="cell-value" title="Kliknutím zkopírujete"><code>${escapeHtml(cell.value || '—')}</code></button>${title}`;
}

/**
 * Home page: every identifier with a valid, an edge and an invalid value. The values are in the HTML already, so
 * an agent or a search engine that does not run JavaScript sees real data; src/home.ts replaces them on load.
 */
function overview(referenceDate: string): string {
  const values = new Map(buildOverview(PRERENDER_SEED, referenceDate).map((row) => [row.id, row.cells]));
  const rows = IDENTIFIERS.map((info) => {
    const [valid, edge, invalid] = values.get(info.id) ?? [];
    const content = (cell: Cell | undefined): string => (cell === undefined ? '' : cellHtml(cell));
    return `<tr>
            <th scope="row"><a href="./${info.slug}/">${escapeHtml(info.short)}</a></th>
            <td id="cell-${info.id}-valid" class="cell ok" data-label="Platné">${content(valid)}</td>
            <td id="cell-${info.id}-edge" class="cell edge" data-label="Hraniční">${content(edge)}</td>
            <td id="cell-${info.id}-invalid" class="cell bad" data-label="Chybné">${content(invalid)}</td>
            <td class="cell-kit"><button class="button small" type="button" data-kit="${info.id}"
              aria-controls="kit">Sada</button></td>
          </tr>`;
  }).join('\n          ');
  return `
      <section class="overview" aria-label="Hodnoty ke zkopírování">
        <div class="overview-head">
          <p class="hint">Kliknutím na hodnotu ji zkopírujete.</p>
          <button id="new-values" class="button" type="button">Nové hodnoty</button>
        </div>
        <table class="overview-table">
          <thead><tr><th scope="col">Údaj</th><th scope="col">Platné</th><th scope="col">Hraniční <span>projde</span></th><th scope="col">Chybné <span>neprojde</span></th>
            <th scope="col"><span class="visually-hidden">Sada pro ověření formuláře</span></th></tr></thead>
          <tbody>
          ${rows}
          </tbody>
        </table>
        <p class="hint"><strong>Sada</strong> připraví všechno, co vyzkoušet v jednom poli formuláře: platné, hraniční
        i chybné hodnoty a u každé, jestli ji má formulář přijmout, nebo odmítnout. Konkrétní variantu, volby jako pohlaví
        nebo kód banky a validátor najdete na stránce údaje: stačí kliknout na jeho název.</p>
      </section>

${KIT_SECTION}`;
}

/** Home page only: why and how to use the same data in automated tests, with a link to the package on npm. */
function library(): string {
  return `
      <section class="block" aria-labelledby="library-title">
        <h2 id="library-title">Stejná data i v automatických testech</h2>
        <p>Automatizujete testy, nebo je za vás píšou vývojáři? Všechno z této stránky umí i knihovna
        <a class="package-name" href="${NPM}">czech-test-data</a> na npm, pro Playwright, Cypress, Vitest nebo Jest.</p>
        <ul class="reasons">
          <li><strong>Stejná data při každém běhu.</strong> Seed místo náhody, takže test nezačne padat sám od sebe.</li>
          <li><strong>Chyby se jménem.</strong> <code>cz.ico.invalid('badChecksum')</code> místo ručně vymyšlené hodnoty.</li>
          <li><strong>Bez závislostí, s typy.</strong> Pro TypeScript i JavaScript a s příkazovou řádkou
          (<code>npx czech-test-data ico --count 10</code>).</li>
        </ul>
        <div class="snippet"><div class="snippet-head"><span>Instalace</span>
          <button class="button small" type="button" data-copy="install">Kopírovat</button></div>
          <pre><code id="install">npm install --save-dev czech-test-data</code></pre></div>
        <div class="snippet"><div class="snippet-head"><span>Test formuláře (Playwright)</span>
          <button class="button small" type="button" data-copy="usage">Kopírovat</button></div>
          <pre><code id="usage">${escapeHtml(USAGE)}</code></pre></div>
      </section>`;
}

/** The usage example on the home page; tests check that its calls exist in the library. */
export const USAGE = `import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });
await page.fill('#ico', cz.ico.edge('leadingZeros'));`;

const HOME_TITLE = 'Testovací data pro české formuláře – rodné číslo, IČO, DIČ, účet, IBAN';
const HOME_H1 = 'Česká testovací data na jednom místě';
const HOME_LEAD = 'Rodné číslo, IČO, DIČ, číslo účtu, IBAN, telefon, PSČ, EAN a EIC. Platná, hraniční i schválně chybná, a u každého víte proč.';

function homePage(referenceDate: string): Page {
  const main = `      <div class="intro">
        <h1>${HOME_H1}</h1>
        <p class="lead">${HOME_LEAD}</p>
      </div>
${overview(referenceDate)}
${library()}`;
  const html = layout({
    root: './',
    url: SITE,
    script: 'home',
    title: HOME_TITLE,
    description:
      'Generátor českých testovacích dat: rodné číslo, IČO, DIČ, číslo účtu, IBAN, telefon, PSČ, EAN a EIC. Platné, hraniční i neplatné hodnoty s vysvětlením.',
    main,
  });
  return { name: 'index', path: 'index.html', title: HOME_TITLE, h1: HOME_H1, url: SITE, html };
}

function identifierPage(info: IdentifierInfo): Page {
  const main = `      <div class="intro">
        <h1>${escapeHtml(info.page.h1)}</h1>
        <p class="lead">${escapeHtml(info.page.intro)}</p>
      </div>
${generator()}
${identifierSections()}`;
  const url = `${SITE}${info.slug}/`;
  const html = layout({ root: '../', url, script: 'main', title: info.page.title, description: info.page.description, current: info, main });
  return { name: info.slug, path: `${info.slug}/index.html`, title: info.page.title, h1: info.page.h1, url, html };
}

/** Every page of the site; `referenceDate` ("today") dates the values written into the home page. */
export function renderPages(referenceDate = createCz().referenceDate): Page[] {
  return [homePage(referenceDate), ...IDENTIFIERS.map(identifierPage)];
}

/** /sitemap.xml: every page by its canonical address. */
export function renderSitemap(pages: readonly Page[]): string {
  const urls = pages.map((page) => `  <url><loc>${page.url}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** /robots.txt: everything may be crawled; points to the sitemap. */
export function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;
}
