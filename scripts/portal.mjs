#!/usr/bin/env node
// vos-portal — App-Links + APK-Downloads (KEIN Dashboard).
// Keine Abhängigkeiten; schreibt docs/ bzw. portal/ (+ docs/apps.html als Pages-Spiegel; docs/dev-dashboard.html leitet weiter).
//
//   node scripts/vos-portal.mjs                  Repo = cwd → docs/apps.json + docs/apps.html
//   node scripts/vos-portal.mjs --repo <dir>     dasselbe für ein anderes Repo
//   node scripts/vos-portal.mjs --all [<root>]   alle Repos aus portal/repos.json (Default ~/dev):
//                                                je Repo docs/apps.*; Meta: portal/{registry,index}.html
//                                                + docs/apps.html (GitHub-Pages-Spiegel) + docs/dev-dashboard.html (Weiterleitung)
//   --check                                      schreibt nichts, Exit 1 wenn veraltet (CI / CTO-Runde)
//
// Quellen je Repo (nichts doppelt pflegen):
//   scripts/miniapps.json  Solo-Apps: id, site, (target)
//   mini-app.json          apps.<id>: name, short, description, accent
//   .firebaserc            hosting-Targets → Site-Namen
//   firebase.json          Fallback ohne Targets
//   firebase.config.js | src/**/firebase.config.js → authDomain (auto)
// Overlay (kuratiert, CTO/PM):
//   portal/dev-status.json  by site|id|repo → { authMode, loginGate, note, rot }
//
// Ownership: CTO hält App-Links + APK-Downloads aktuell (`vos-portal --all` / `--check`).
// PM liest als Surface-Inventar (PRODUCT.md). Echte Org-Dashboards: vos-dev-dashboards.web.app
// Skript-Kopie je Repo: scripts/portal.mjs (verteilt von ~/vitalos/bin/vos-portal).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const CHECK = flag("--check");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const readText = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const url = (site) => `https://${site}.web.app`;
const repoPages = (repo) => `https://nimmsel23.github.io/${repo}/`;
let stale = 0;

function write(file, content) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (old === content) return;
  if (CHECK) { stale++; console.error(`veraltet: ${file}`); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`geschrieben: ${file}`);
}

function findAuthDomain(dir) {
  const candidates = [
    "firebase.config.js",
    "src/client/lib/firebase.config.js",
    "src/lib/firebase.config.js",
    "src/firebase.config.js",
    "web/src/lib/firebaseClient.js",
  ];
  for (const rel of candidates) {
    const text = readText(path.join(dir, rel));
    const m = text.match(/authDomain\s*:\s*["'`]([^"'`]+)["'`]/);
    if (m) return m[1];
  }
  return null;
}

function statusFor(metaStatus, app, repo) {
  const by = metaStatus?.by ?? {};
  return by[app.site] || by[`${repo}/${app.id}`] || by[app.id] || by[repo] || {};
}

// ---- Repo einlesen -------------------------------------------------------------------------------------------------
export function scanRepo(dir, metaStatus = null) {
  const repo = path.basename(path.resolve(dir));
  const solo = readJson(path.join(dir, "scripts/miniapps.json"))?.apps ?? [];
  const meta = readJson(path.join(dir, "mini-app.json"))?.apps ?? {};
  const rc = readJson(path.join(dir, ".firebaserc"));
  const rcTargets = Object.values(rc?.targets ?? {})[0]?.hosting ?? {};
  const fb = readJson(path.join(dir, "firebase.json"))?.hosting;
  const fbList = Array.isArray(fb) ? fb : fb ? [fb] : [];
  const fbSites = fbList.map((h) => h.site || h.target).filter(Boolean);
  const bundledAuthDomain = findAuthDomain(dir);

  const entries = [];
  const soloTargets = new Set();
  for (const a of solo) {
    soloTargets.add(a.target ?? a.id);
    const m = { ...(meta[a.id] ?? {}), ...Object.fromEntries(["name", "short", "description", "accent"].filter((k) => a[k]).map((k) => [k, a[k]])) };
    const base = {
      id: a.id, kind: "solo", name: m.name ?? a.id, short: m.short ?? m.name ?? a.id,
      description: m.description ?? "", accent: m.accent ?? "#888",
      site: a.site ?? null, url: a.site && !a.planned ? url(a.site) + (a.path ?? "") : null,
      tab: a.tab ?? a.defaultTab ?? null, planned: Boolean(a.planned),
      bundledAuthDomain,
    };
    entries.push({ ...base, ...statusFor(metaStatus, base, repo) });
  }
  const mainSites = Object.entries(rcTargets).filter(([t]) => !soloTargets.has(t)).flatMap(([t, sites]) => sites.map((s) => [t, s]));
  if (!mainSites.length && !solo.length) for (const s of fbSites) if (!entries.some((e) => e.site === s)) mainSites.push([s, s]);
  for (const [t, site] of mainSites) {
    const m = meta[t] ?? meta[repo.replace(/-dev$/, "")] ?? Object.values(meta).find((x) => !x.id || x.id === t) ?? {};
    const base = {
      id: t, kind: "main", name: m.name ?? site, short: m.short ?? m.name ?? site,
      description: m.description ?? "", accent: m.accent ?? "#888", site, url: url(site), tab: null,
      bundledAuthDomain,
    };
    entries.unshift({ ...base, ...statusFor(metaStatus, base, repo) });
  }
  return { repo, apps: entries, pages: repoPages(repo), bundledAuthDomain };
}

// ---- HTML ----------------------------------------------------------------------------------------------------------
const CSS = `
:root{--bg:#0b0d12;--fg:#e8eaf0;--mut:#8b93a7;--card:#141822;--line:#232a3a;--ok:#34d399;--warn:#fbbf24;--bad:#f87171}
@media(prefers-color-scheme:light){:root{--bg:#f5f6fa;--fg:#161a24;--mut:#5d667a;--card:#fff;--line:#dde1ea}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:24px 16px 48px}
main{max-width:1100px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:28px 0 10px}
p.sub{color:var(--mut);margin:0 0 12px}nav.links{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
nav.links a{font-size:12px;color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:4px 10px;text-decoration:none}
nav.links a:hover{color:var(--fg);border-color:var(--fg)}
input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);font:inherit}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
a.card{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:12px 14px}
a.card:hover{border-color:var(--accent)}b{display:block}small{color:var(--mut);display:block;margin-top:2px}
.tag{display:inline-block;font-size:11px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:0 6px;margin-top:6px;margin-right:4px}
.tag.ok{color:var(--ok);border-color:color-mix(in oklab,var(--ok) 40%,var(--line))}
.tag.warn{color:var(--warn);border-color:color-mix(in oklab,var(--warn) 40%,var(--line))}
.tag.bad{color:var(--bad);border-color:color-mix(in oklab,var(--bad) 40%,var(--line))}
a.planned{opacity:.6;border-style:dashed;cursor:default}
.hide{display:none}
.legend{font-size:12px;color:var(--mut);margin:8px 0 0;line-height:1.45}
`;

function tagClass(kind, value) {
  if (!value) return "";
  if (kind === "rot" && value) return " bad";
  if (kind === "loginGate") {
    if (value === "hard") return " bad";
    if (value === "soft" || value === "optional") return " ok";
    if (value === "local-first") return " ok";
  }
  if (kind === "authMode") {
    if (value === "same-origin") return " warn";
    if (value === "project-domain") return " ok";
  }
  return "";
}

function card(a, withRepo) {
  const q = [a.name, a.description, a.site, a.repo, a.authMode, a.loginGate, a.note, a.rot, a.bundledAuthDomain].filter(Boolean).join(" ").toLowerCase();
  const open = a.url ? `<a class="card" href="${esc(a.url)}" target="_blank" rel="noopener"` : `<a class="card planned"`;
  const note = a.note || a.rot ? `<small>${esc(a.rot ? `ROT: ${a.rot}` : a.note)}</small>` : "";
  const auth = a.authMode || a.bundledAuthDomain
    ? `<span class="tag${tagClass("authMode", a.authMode)}">${esc(a.authMode ? `auth:${a.authMode}` : `authDomain:${a.bundledAuthDomain}`)}</span>`
    : "";
  const gate = a.loginGate ? `<span class="tag${tagClass("loginGate", a.loginGate)}">${esc(`gate:${a.loginGate}`)}</span>` : "";
  const rot = a.rot ? `<span class="tag${tagClass("rot", a.rot)}">rot</span>` : "";
  return `${open} style="--accent:${esc(a.accent)}" data-q="${esc(q)}">
  <b>${esc(a.name)}</b><small>${esc(a.description || "–")}</small>${note}
  ${a.site ? `<span class="tag">${esc(a.site)}</span>` : ""}${a.planned ? ' <span class="tag">geplant</span>' : ""}${a.kind === "main" ? ' <span class="tag">Haupt-App</span>' : ""}${a.tab ? ` <span class="tag">Tab ${esc(a.tab)}</span>` : ""}${withRepo ? ` <span class="tag">${esc(a.repo)}</span>` : ""}${auth}${gate}${rot}
</a>`;
}

const SEARCH = `<script>const q=document.getElementById("q");q&&q.addEventListener("input",()=>{const v=q.value.toLowerCase();document.querySelectorAll("a.card").forEach(c=>c.classList.toggle("hide",!c.dataset.q.includes(v)));document.querySelectorAll("section").forEach(s=>s.classList.toggle("hide",!s.querySelector("a.card:not(.hide)")))})</script>`;

const REDIRECT = `<!doctype html><meta charset="utf-8"><title>VitalOS App-Links</title><meta http-equiv="refresh" content="0; url=./apps.html"><link rel="canonical" href="./apps.html"><p>Umgezogen: <a href="./apps.html">VitalOS App-Links &amp; APKs</a></p>\n`;

function navLinks(extra = []) {
  const links = [
    ["Produkt (PRODUCT.md)", "https://github.com/nimmsel23/vitalos/blob/master/prod/coordination/PRODUCT.md"],
    ["Koordination", "https://github.com/nimmsel23/vitalos/blob/master/prod/coordination/README.md"],
    ["Backlog", "https://github.com/nimmsel23/vitalos/blob/master/prod/coordination/PRODUKT-BACKLOG.md"],
    ["CTO", "https://github.com/nimmsel23/vitalos/blob/master/prod/coordination/CTO.md"],
    ["Entwicklungsdashboard", "https://nimmsel23.github.io/vitalos/"],
    ["App-Links & APKs", "https://nimmsel23.github.io/vitalos/apps.html"],
    ["Org-Dashboards", "https://vos-dev-dashboards.web.app"],
    ...extra,
  ];
  return `<nav class="links">${links.map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("")}</nav>`;
}

function page(title, sub, sections, { withRepo = false, extraNav = [], legend = "" } = {}) {
  const generated = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = sections.map((s) => `<section><h2>${esc(s.title)}</h2><div class="grid">${s.apps.map((a) => card(a, withRepo)).join("\n")}</div></section>`).join("\n");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head><body><main>
<h1>${esc(title)}</h1>
<p class="sub">${esc(sub)} · erzeugt ${esc(generated)} · Quelle: vos-portal (nicht von Hand editieren; Status-Overlay: portal/dev-status.json)</p>
${navLinks(extraNav)}
<input id="q" type="search" placeholder="Suchen (Name, Site, auth, gate, rot) …" autocomplete="off">
${legend ? `<p class="legend">${esc(legend)}</p>` : ""}
${body}
</main>${SEARCH}</body></html>
`;
}

// ---- Ausgabe -------------------------------------------------------------------------------------------------------
function emitRepo(dir, metaStatus = null) {
  const r = scanRepo(dir, metaStatus);
  write(path.join(dir, "docs/apps.json"), JSON.stringify(r, null, 2) + "\n");
  const main = r.apps.filter((a) => a.kind === "main");
  const solo = r.apps.filter((a) => a.kind === "solo");
  const sections = [main.length && { title: "Haupt-App", apps: main }, solo.length && { title: "Mini-Apps", apps: solo }].filter(Boolean);
  write(
    path.join(dir, "docs/apps.html"),
    page(
      `${r.repo} — App-Links`,
      `${r.apps.length} Hosting-Apps / Surfaces (kein Dashboard — nur Links)`,
      sections,
      {
        extraNav: [["Repo Pages", r.pages], ["apps.json", "./apps.json"]],
        legend: "Tags: auth:* = Login-Domain-Modell · gate:hard sperrt Offline · gate:local-first/soft = App ohne Login nutzbar · rot = offener Betriebsblocker",
      },
    ),
  );
  return r;
}

const metaRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const metaStatus = readJson(path.join(metaRoot, "portal/dev-status.json"));

if (flag("--all")) {
  const root = args[args.indexOf("--all") + 1]?.startsWith("--") || !args[args.indexOf("--all") + 1]
    ? path.join(os.homedir(), "dev")
    : args[args.indexOf("--all") + 1];
  const repos = readJson(path.join(metaRoot, "portal/repos.json")) ?? [];
  const all = [];
  for (const name of repos) {
    const dir = path.join(root, name);
    if (!fs.existsSync(dir)) { console.error(`übersprungen (fehlt): ${dir}`); continue; }
    const r = emitRepo(dir, metaStatus);
    all.push({ ...r, apps: r.apps.map((a) => ({ ...a, repo: r.repo })) });
  }
  const generatedAt = new Date().toISOString();
  write(path.join(metaRoot, "portal/registry.json"), JSON.stringify({ generatedAt, repos: all }, null, 2) + "\n");
  const total = all.reduce((n, r) => n + r.apps.length, 0);
  const rotCount = all.reduce((n, r) => n + r.apps.filter((a) => a.rot).length, 0);
  const dash = page(
    "VitalOS App-Links",
    `${total} Apps in ${all.length} Repos · ${rotCount} mit ROT-Vermerk · Portal = App-Links + APK-Downloads (kein Dashboard) · Org-Boards: vos-dev-dashboards.web.app`,
    all.map((r) => ({ title: `${r.repo} (${r.pages})`, apps: r.apps })),
    {
      withRepo: true,
      legend: "Kartentags aus portal/dev-status.json (kuratiert) + authDomain aus firebase.config. Nach Hosting-/Auth-Änderungen: vos-portal --all. --check in der CTO-Runde.",
      extraNav: [
        ["Registry JSON", "./registry.json"],
        ["Status-Overlay", "./dev-status.json"],
        ...all.map((r) => [`${r.repo} apps`, repoPages(r.repo) + "apps.html"]),
      ],
    },
  );
  write(path.join(metaRoot, "portal/index.html"), dash);
  // GitHub Pages publiziert nur /docs — stabiler Spiegel + Raw-Links aufs Overlay.
  const pagesDash = dash
    .replaceAll('href="./registry.json"', 'href="https://github.com/nimmsel23/vitalos/blob/master/portal/registry.json"')
    .replaceAll('href="./dev-status.json"', 'href="https://github.com/nimmsel23/vitalos/blob/master/portal/dev-status.json"');
  write(path.join(metaRoot, "docs/apps.html"), pagesDash);
  // Alter Pfad bleibt als Weiterleitung, damit bestehende Links nicht brechen.
  write(path.join(metaRoot, "docs/dev-dashboard.html"), REDIRECT);
} else {
  emitRepo(val("--repo") ?? process.cwd(), metaStatus);
}
if (CHECK && stale) process.exit(1);
