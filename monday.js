/* ── COLOR CONSTANTS ── */
const GREEN        = '#5b95de';   /* TY2025 series (theme --y25) */
const PURPLE       = '#2a78d6';   /* TY2026 series (theme --y26) */
const AMBER        = '#BA7517';
const BLUE         = '#8c8c8c';   /* Deal Value series: neutral gray */
const PURPLE_LIGHT = '#8fb8ea';
const GREEN_LIGHT  = '#b3cff0';   /* lighter TY2025 shade */

/* Euro symbol in front, comma thousands ("€112,192"). Overrides fs-core's versions for this report only,
   recap loads the same fs-core.js and keeps its own format. */
window.fmt = (v) => (v >= 1000 ? "€" + (v / 1000).toFixed(0) + "k" : "€" + v);
window.fmtN = (v) => Math.round(v).toLocaleString("en-US");
window.fmtFull = (v) => (v < 0 ? "-" : "") + "€" + Math.abs(Math.round(v)).toLocaleString("en-US");
{
  const baseTooltipDefaults = window.tooltipDefaults;
  window.tooltipDefaults = () => {
    const o = baseTooltipDefaults();
    o.callbacks = { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw != null ? "€" + ctx.raw.toLocaleString("en-US") : "—"}` };
    return o;
  };
}

/* ════════════════════════════════════════════════════════════
   monday.js — rendering logic
   Depends on monday-data.js being loaded first.
   ════════════════════════════════════════════════════════════ */

/* ── DERIVED — computed from data arrays, do not edit ── */

const hhMonths = m26.map((d26) => {
  const short = d26.m.slice(0, 3);
  const d25 = m25.find((d) => d.m.startsWith(short));
  return { m: short, r25: d25 ? d25.ruc : 0, r26: d26.ruc };
});

const calMonths = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const ruc25cal = calMonths.map((m) => { const d = m25.find((d) => d.m.startsWith(m)); return d ? d.ruc : 0; });
const ruc26cal = calMonths.map((m) => { const d = m26.find((d) => d.m.startsWith(m)); return d ? d.ruc : 0; });

const rbHhMonths = rbClosed26.map((d) => d.m.slice(0, 3));
const rbRuc26hh = rbClosed26.map((d) => d.ruc);
const rbCnt26hh = rbClosed26.map((d) => d.cnt);
const rbRuc25hh = rbClosed.slice(0, rbClosed26.length).map((d) => d.ruc);
const rbCnt25hh = rbClosed.slice(0, rbClosed26.length).map((d) => d.cnt);

const cmpOwnerLabels = owners25.map((o) => o.name);
const cmpOwner25ruc  = owners25.map((o) => o.ruc);
const cmpOwner26ruc  = cmpOwnerLabels.map((name) => { const o = owners26.find((o) => o.name === name); return o ? o.ruc : 0; });

/* ── KPI TOTALS — computed from data ── */

const tot25 = {
  ruc: m25.reduce((s, d) => s + d.ruc, 0),
  val: m25.reduce((s, d) => s + d.val, 0),
  cnt: m25.reduce((s, d) => s + d.cnt, 0),
};
const tot26 = {
  ruc: m26.reduce((s, d) => s + d.ruc, 0),
  val: m26.reduce((s, d) => s + d.val, 0),
  cnt: m26.reduce((s, d) => s + d.cnt, 0),
};

/* ── CHART DEFAULTS (axisDualDefaults — monday only) ── */

function axisDualDefaults(yTitle, y1Title, y1Color) {
  const textColor = getComputedStyle(document.body).getPropertyValue("--text3").trim();
  const gridColor = getComputedStyle(document.body).getPropertyValue("--border").trim();
  return {
    x: {
      ticks: { font: { size: 12, family: "Inconsolata" }, color: textColor, maxRotation: 45 },
      grid: { color: gridColor },
    },
    y: {
      ticks: { font: { size: 12, family: "Inconsolata" }, color: textColor },
      grid: { color: gridColor },
      title: { display: true, text: yTitle, color: textColor, font: { size: 11 } },
    },
    y1: {
      position: "right",
      ticks: { font: { size: 12, family: "Inconsolata" }, color: y1Color },
      grid: { display: false },
      title: { display: true, text: y1Title, color: y1Color, font: { size: 11 } },
    },
  };
}

function sortRows(rows, key, dir) {
  if (key === "idx") return dir === "desc" ? [...rows].reverse() : [...rows];
  const val = (d) => (key === "margin" ? d.ruc / d.val : d[key]);
  return [...rows].sort((a, b) => (dir === "asc" ? val(a) - val(b) : val(b) - val(a)));
}

function makeTable(tbodyId, cum, rucClass, yr2024check = false) {
  const tb = document.getElementById(tbodyId);
  const ths = tb.closest("table").querySelectorAll("th.sort-hdr");
  let sortKey = null, sortDir = "desc";

  function draw() {
    const rows = sortKey ? sortRows(cum, sortKey, sortDir) : cum;
    const chronological = !sortKey;
    let shown = false;
    tb.innerHTML = rows.map((d) => {
      let html = "";
      if (chronological && yr2024check && d.yr === 2025 && !shown) {
        html += `<tr class="divider div-green"><td colspan="8">── 2025 closed ──</td></tr>`;
        shown = true;
      }
      html += `<tr${yr2024check && d.yr === 2024 ? ' class="yr24"' : ""}>
      <td><strong>${d.m}</strong></td><td class="num">${d.cnt}</td>
      <td class="num ${rucClass}">${fmtFull(d.ruc)}</td><td class="num val-b">${fmtFull(d.val)}</td>
      <td class="num">${d.cc}</td><td class="num ${rucClass}">${fmtFull(d.cr)}</td>
      <td class="num val-b">${fmtFull(d.cv)}</td>
      <td class="num" style="color:var(--text3)">${Math.round((d.ruc / d.val) * 100)}%</td>
    </tr>`;
      return html;
    }).join("");
    ths.forEach((th) => {
      const on = th.dataset.key === sortKey;
      th.classList.toggle("sorted-desc", on && sortDir === "desc");
      th.classList.toggle("sorted-asc", on && sortDir === "asc");
      th.setAttribute("aria-sort", on ? (sortDir === "desc" ? "descending" : "ascending") : "none");
    });
  }

  ths.forEach((th) => {
    th.tabIndex = 0;
    const toggle = () => {
      const k = th.dataset.key;
      if (sortKey !== k) { sortKey = k; sortDir = "desc"; }
      else if (sortDir === "desc") sortDir = "asc";
      else { sortKey = null; sortDir = "desc"; }   /* third click: back to chronological */
      draw();
    };
    th.addEventListener("click", toggle);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });
  draw();
}

function lineChart(canvasId, labels, datasets) {
  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipDefaults() },
      scales: axisDefaults(),
    },
  });
}

/* Tooltip footer for two-year comparison charts (same idea as evidencija's yearDeltaFooter):
   hovered items are one per year, returns "2026 vs 2025: +N (+P%)". */
function yearDeltaFooter(unit) {
  return (items) => {
    const v25 = items.find((i) => /2025/.test(i.dataset.label))?.raw;
    const v26 = items.find((i) => /2026/.test(i.dataset.label))?.raw;
    if (v25 == null || v26 == null) return "";
    const delta = v26 - v25;
    const sign = delta >= 0 ? "+" : "";
    const pct = v25 !== 0 ? ` (${sign}${Math.round((delta / v25) * 100)}%)` : "";
    return `2026 vs 2025: ${sign}${unit}${Math.abs(Math.round(delta)).toLocaleString("en-US")}${pct}`;
  };
}

/* Text under the x axis of two-year bar charts (ported from evidencija's delta-labels.js):
   "v25 / v26" and "▼ change (pct)". Falls back to just the arrow and pct when the slot is too narrow. */
const yearDeltaLabels = {
  id: "yearDeltaLabels",
  afterDraw(chart) {
    const { ctx, scales: { x } } = chart;
    const [d0, d1] = [chart.data.datasets[0].data, chart.data.datasets[1].data];
    const items = chart.data.labels.map((_, i) => ({ a: d0[i] || 0, b: d1[i] || 0 }));
    const slot = items.length > 1 ? Math.abs(x.getPixelForValue(1) - x.getPixelForValue(0)) : x.width;
    const text3 = getComputedStyle(document.body).getPropertyValue("--text3").trim();
    const info = ({ a, b }) => {
      const d = b - a;
      return {
        arrow: d > 0 ? "▲" : d < 0 ? "▼" : "=",
        color: d > 0 ? "#1D9E75" : d < 0 ? "#D4545A" : "#999",
        pct: a > 0 ? Math.round((d / a) * 100) : b > 0 ? "∞" : 0,
        d,
      };
    };
    ctx.save();
    ctx.font = "bold 10px 'IBM Plex Sans',sans-serif";
    const full = items.map((it) => {
      const { arrow, color, pct, d } = info(it);
      return { line1: `${fmtN(it.a)} / ${fmtN(it.b)}`, line2: `${arrow} ${fmtN(Math.abs(d))} (${d > 0 ? "+" : ""}${pct}%)`, color };
    });
    const widest = (ls) => Math.max(0, ...ls.flatMap((l) => [l.line1, l.line2]).filter(Boolean).map((t) => ctx.measureText(t).width));
    let labels = full, step = 1;
    if (widest(full) > slot - 4) {
      labels = items.map((it) => {
        const { arrow, color, pct } = info(it);
        return { line1: null, line2: `${arrow}${pct === "∞" ? "∞" : Math.abs(pct) + "%"}`, color };
      });
      const w = widest(labels);
      step = w <= slot - 4 ? 1 : Math.ceil(w / (slot - 4));
    }
    ctx.textAlign = "center";
    labels.forEach((l, i) => {
      if (i % step) return;
      const px = x.getPixelForValue(i);
      const y = x.bottom + 12;
      if (l.line1) {
        ctx.fillStyle = text3;
        ctx.font = "500 10px 'IBM Plex Sans',sans-serif";
        ctx.fillText(l.line1, px, y);
      }
      ctx.fillStyle = l.color;
      ctx.font = "bold 10px 'IBM Plex Sans',sans-serif";
      ctx.fillText(l.line2, px, l.line1 ? y + 13 : y);
    });
    ctx.restore();
  },
};

/* ── KPI RENDERING — computed from data ── */

function renderKPIs() {
  const margin25 = ((tot25.ruc / tot25.val) * 100).toFixed(1);
  const margin26 = ((tot26.ruc / tot26.val) * 100).toFixed(1);
  const avg25 = Math.round(tot25.ruc / tot25.cnt);
  const avg26 = Math.round(tot26.ruc / tot26.cnt);
  const pace  = ((tot26.ruc / tot25.ruc) * 100).toFixed(1);
  const dealPace = ((tot26.cnt / tot25.cnt) * 100).toFixed(1);


  setText("kpi-ruc25",    fmtFull(tot25.ruc));
  setText("kpi-val25",    fmtFull(tot25.val));
  setText("kpi-cnt25",    tot25.cnt);
  setText("kpi-margin25", margin25 + "%");
  setText("kpi-sub-margin25", "€" + avg25 + " avg per deal");
  setText("kpi-ruc26",    fmtFull(tot26.ruc));
  setText("kpi-val26",    fmtFull(tot26.val));
  setText("kpi-cnt26",    tot26.cnt);
  setText("kpi-margin26", margin26 + "%");
  setText("kpi-sub-margin26", "€" + avg26 + " avg per deal");
  /* Same-period comparison: 2026 YTD vs the first m26.length closing months of 2025 (same slice as cmp-chart) */
  const same25 = makeCum(m25)[m26.length - 1];
  const sp = (a, b) => (a > 0 ? Math.round(((b - a) / a) * 100) : null);
  const signed = (v, unit) => (v >= 0 ? "+" : "−") + unit + Math.abs(Math.round(v)).toLocaleString("en-US");
  const setSamePeriod = (key, v25, v26, unit) => {
    const d = v26 - v25, p = sp(v25, v26), cls = d >= 0 ? "pos" : "neg";
    document.getElementById(`kd-${key}-abs`).innerHTML = `<span class="${cls}">${signed(d, unit)}</span>`;
    document.getElementById(`kd-${key}-pct`).innerHTML = p === null ? "—" : `<span class="${cls}">${(p >= 0 ? "+" : "−") + Math.abs(p)}%</span>`;
    setText(`kv-${key}25`, unit + fmtN(v25));
    setText(`kv-${key}26`, unit + fmtN(v26));
  };
  setSamePeriod("ruc", same25.cr, tot26.ruc, "€");
  setSamePeriod("cnt", same25.cc, tot26.cnt, "");

  const phrase = (a, b) => {
    const p = sp(a, b);
    return p === null ? "n/a" : p === 0 ? "flat" : `${Math.abs(p)}% ${b > a ? "up" : "down"}`;
  };
  setText("takeaway-cmp",
    `RUC is ${phrase(same25.cr, tot26.ruc)} on the same period of 2025 (${fmtFull(tot26.ruc)} vs ${fmtFull(same25.cr)}): ` +
    `deals are ${phrase(same25.cc, tot26.cnt)} (${tot26.cnt} vs ${same25.cc}), ` +
    `average RUC per deal is ${phrase(same25.cr / same25.cc, tot26.ruc / tot26.cnt)} ` +
    `(${fmtFull(tot26.ruc / tot26.cnt)} vs ${fmtFull(same25.cr / same25.cc)}).`);

  setText("kpi-cmp-ruc25",   fmtFull(tot25.ruc));
  setText("kpi-cmp-cnt25",   tot25.cnt + " deals · full year closed");
  setText("kpi-cmp-ruc26",   fmtFull(tot26.ruc));
  setText("kpi-cmp-cnt26",   tot26.cnt + " deals · still running");
  setText("kpi-pace",    pace + "%");
  setText("kpi-dealpace", dealPace + "%");
  setText("kpi-dealpace-sub", tot26.cnt + " vs " + tot25.cnt + " deals");

  // Header stats
  setText("hdr-stat25",   tot25.cnt + " deals · RUC & Deal Value Analytics");
  setText("hdr-stat26",   tot26.cnt + " deals · RUC & Deal Value Analytics · In progress");

  // Roundabout KPIs
  const rb25 = { ruc: rbClosed.reduce((s, d) => s + d.ruc, 0), val: rbClosed.reduce((s, d) => s + d.val, 0), cnt: rbClosed.reduce((s, d) => s + d.cnt, 0) };
  const rb26 = { ruc: rbClosed26.reduce((s, d) => s + d.ruc, 0), val: rbClosed26.reduce((s, d) => s + d.val, 0), cnt: rbClosed26.reduce((s, d) => s + d.cnt, 0) };
  const rbAvgRuc25 = Math.round(rb25.ruc / rb25.cnt), rbAvgRuc26 = Math.round(rb26.ruc / rb26.cnt);
  const rbAvgVal25 = Math.round(rb25.val / rb25.cnt), rbAvgVal26 = Math.round(rb26.val / rb26.cnt);
  const rbMargin25 = ((rb25.ruc / rb25.val) * 100).toFixed(1);
  const rbValVs = (((rb26.val - rb25.val) / rb25.val) * 100).toFixed(1);
  const rbAvgVs = (((rbAvgRuc26 - rbAvgRuc25) / rbAvgRuc25) * 100).toFixed(1);
  const rbAvgValVs = (((rbAvgVal26 - rbAvgVal25) / rbAvgVal25) * 100).toFixed(1);

  setText("kpi-rb-ruc25",     fmtFull(rb25.ruc));
  setText("kpi-rb-cnt25",     rb25.cnt + " deals · closed");
  setText("kpi-rb-val25",     fmtFull(rb25.val));
  setText("kpi-rb-valpct25",  ((rb25.val / tot25.val) * 100).toFixed(1) + "% of portfolio value");
  setText("kpi-rb-avg25",     "€" + rbAvgRuc25);
  setText("kpi-rb-avgval25",  "Avg Value: €" + rbAvgVal25.toLocaleString("en-US"));
  setText("kpi-rb-margin25",  rbMargin25 + "%");
  setText("kpi-rb-margin25-sub", "portfolio avg: " + margin25 + "%");
  setText("kpi-rb-ruc26",     fmtFull(rb26.ruc));
  setText("kpi-rb-cnt26",     rb26.cnt + " deals · in progress");
  setText("kpi-rb-val26",     fmtFull(rb26.val));
  setDelta("kpi-rb-val26-vs", rbValVs, (rbValVs >= 0 ? "↑ +" : "↓ ") + rbValVs + "% vs 2025 value");
  setText("kpi-rb-avg26",     "€" + rbAvgRuc26);
  setDelta("kpi-rb-avg26-vs", rbAvgVs, (rbAvgVs >= 0 ? "↑ +" : "↓ ") + rbAvgVs + "% vs €" + rbAvgRuc25 + " (2025)");
  setText("kpi-rb-avgval26",  "€" + rbAvgVal26.toLocaleString("en-US"));
  setDelta("kpi-rb-avgval26-vs", rbAvgValVs, (rbAvgValVs >= 0 ? "↑ +" : "↓ ") + rbAvgValVs + "% vs €" + rbAvgVal25.toLocaleString("en-US") + " (2025)");
}

/* Delta text with the evidencija colors: green when up, red when down. Text stays as before. */
function setDelta(id, value, text) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<span class="${value >= 0 ? "pos" : "neg"}">${text}</span>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── NAVIGATION & THEME ── */

function showPage(id, tab) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-tabs .nav-tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
  });
  document.getElementById(id).classList.add("active");
  tab.classList.add("active");
  tab.setAttribute("aria-selected", "true");
  tab.setAttribute("tabindex", "0");

  const tabName = tab.textContent.trim();
  document.title = `${tabName} · Production Report · FreeSpirit`;
  updateStickyBar();
}
/* ── STICKY KPI BAR ── */

/* [label, element id] per page; ids are the headline KPI values in index.html */
const STICKY_KPIS = {
  p25:  [["RUC", "kpi-ruc25"], ["Value", "kpi-val25"], ["Deals", "kpi-cnt25"], ["Margin", "kpi-margin25"]],
  p26:  [["RUC", "kpi-ruc26"], ["Value", "kpi-val26"], ["Deals", "kpi-cnt26"], ["Margin", "kpi-margin26"]],
  pcmp: [["RUC 2025", "kpi-cmp-ruc25"], ["RUC 2026", "kpi-cmp-ruc26"], ["Pace", "kpi-pace"], ["Deals pace", "kpi-dealpace"]],
  prb:  [["RUC 2025", "kpi-rb-ruc25"], ["Value 2025", "kpi-rb-val25"], ["RUC 2026", "kpi-rb-ruc26"], ["Value 2026", "kpi-rb-val26"]],
};

let stickyObserver = null;

function updateStickyBar() {
  const bar = document.getElementById("sticky-kpi-bar");
  const page = document.querySelector(".page.active");
  if (!bar || !page) return;
  const defs = STICKY_KPIS[page.id] || [];
  bar.innerHTML = defs
    .map(([label, id]) => `<span class="skpi-label">${label}</span><span>${document.getElementById(id)?.textContent ?? "—"}</span>`)
    .join('<span class="skpi-sep">·</span>');
  if (stickyObserver) stickyObserver.disconnect();
  const grid = page.querySelector(".kpi-grid, .grid-rb-kpis");
  if (!grid || !defs.length) { bar.classList.remove("visible"); return; }
  stickyObserver = new IntersectionObserver(
    ([entry]) => bar.classList.toggle("visible", !entry.isIntersecting),
    { rootMargin: `-${document.querySelector(".nav").offsetHeight}px 0px 0px 0px` }
  );
  stickyObserver.observe(grid);
}

/* ── KEYBOARD SHORTCUTS: 1-4 switch tabs ── */

let overlayPreviousFocus = null;

function overlayTrapFocus(e) {
  if (e.key === "Escape") { toggleShortcutOverlay(); return; }
  if (e.key !== "Tab") return;
  e.preventDefault();
  document.querySelector("#shortcut-overlay .overlay-close")?.focus();
}

/* Same behavior as evidencija: focus moves into the dialog, Tab stays on the close button, Esc closes. */
function toggleShortcutOverlay() {
  const el = document.getElementById("shortcut-overlay");
  if (!el) return;
  if (el.style.display === "block") {
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
    el.removeEventListener("keydown", overlayTrapFocus);
    overlayPreviousFocus?.focus();
    overlayPreviousFocus = null;
  } else {
    overlayPreviousFocus = document.activeElement;
    el.style.display = "block";
    el.setAttribute("aria-hidden", "false");
    el.addEventListener("keydown", overlayTrapFocus);
    el.querySelector(".overlay-close")?.focus();
  }
}

function initKeyboardShortcuts() {
  const order = ["tab-p25", "tab-p26", "tab-pcmp", "tab-prb"];
  document.querySelector("#shortcut-overlay .overlay-close")?.addEventListener("click", toggleShortcutOverlay);
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i !== -1) { document.getElementById(order[i])?.click(); e.preventDefault(); return; }
    if (e.key === "t") { toggleTheme(); e.preventDefault(); }
    else if (e.key === "?") { toggleShortcutOverlay(); e.preventDefault(); }
  });
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    document.documentElement.classList.add("dark-mode");
  }
  updateThemeButton();

  // Mobile hamburger menu
  const nav = document.querySelector(".nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      if (window.innerWidth <= 640) {
        if (!e.target.closest(".nav > div:first-child") && !e.target.closest(".nav-actions") && !e.target.closest(".nav-tab")) {
          nav.classList.toggle("menu-open");
        }
      }
    });
    document.querySelectorAll(".nav-tab, .theme-toggle, .print-btn").forEach((el) => {
      el.addEventListener("click", () => nav.classList.remove("menu-open"));
    });
  }

  // Wire tab event listeners (replacing onclick attributes)
  const TAB_MAP = { "tab-p25": "p25", "tab-p26": "p26", "tab-pcmp": "pcmp", "tab-prb": "prb" };
  Object.entries(TAB_MAP).forEach(([tabId, pageId]) => {
    const el = document.getElementById(tabId);
    if (el) el.addEventListener("click", () => showPage(pageId, el));
  });
  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
  document.querySelector(".print-btn")?.addEventListener("click", () => window.print());

  // Arrow-key navigation for tabs
  const tabs = Array.from(document.querySelectorAll(".nav-tabs .nav-tab"));
  tabs.forEach((tab, i) => {
    tab.addEventListener("keydown", (e) => {
      let next;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End")  next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); next.focus(); next.click(); }
    });
  });

  // Date stamp
  const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  ["date-25", "date-26", "footer-date"].forEach((id) => setText(id, now));

  // Render KPIs from data
  renderKPIs();
  updateStickyBar();
  initKeyboardShortcuts();

  /* ── CHARTS — TRAVEL YEAR 2025 ── */

  const cum25 = makeCum(m25);
  const pc25  = m25.map((d) => (d.yr === 2024 ? "#cccccc" : GREEN));

  lineChart("ytd25", m25.map((d) => d.m), [
    {
      label: "Cumulative RUC",
      data: cum25.map((d) => d.cr),
      borderColor: GREEN,
      backgroundColor: "rgba(91,149,222,0.06)",
      borderWidth: 2, pointRadius: 4, pointBackgroundColor: pc25, fill: true, tension: 0.4,
      segment: { borderColor: (ctx) => m25[ctx.p0DataIndex]?.yr === 2024 ? "#cccccc" : GREEN },
    },
    {
      label: "Cumulative Value",
      data: cum25.map((d) => d.cv),
      borderColor: "rgba(140,140,140,0.6)", backgroundColor: "transparent",
      borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.4, borderDash: [4, 3],
    },
  ]);

  makeBars("ruc25-bars", m25, (d) => (d.yr === 2024 ? "#cccccc" : GREEN));
  makeBars("cnt25-bars", m25, (d) => (d.yr === 2024 ? "#dddddd" : PURPLE), "cnt");
  makeOwners("owner25-list", "donut25", "donut25-leg", owners25, GREEN);
  makeAgencies("ag25-list", ag25, GREEN, BLUE, tot25.ruc);
  makeBars("travel25-bars", travel25, AMBER, "cnt");
  makeTable("tbl25", cum25, "ruc-g", true);

  /* ── CHARTS — TRAVEL YEAR 2026 ── */

  const cum26 = makeCum(m26);

  lineChart("ytd26", m26.map((d) => d.m), [
    {
      label: "Cumulative RUC",
      data: cum26.map((d) => d.cr),
      borderColor: PURPLE, backgroundColor: "rgba(42,120,214,0.07)",
      borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4,
    },
    {
      label: "Cumulative Value",
      data: cum26.map((d) => d.cv),
      borderColor: "rgba(140,140,140,0.6)", backgroundColor: "transparent",
      borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.4, borderDash: [4, 3],
    },
  ]);

  makeBars("ruc26-bars", m26, PURPLE);
  makeBars("cnt26-bars", m26, PURPLE_LIGHT, "cnt");
  makeOwners("owner26-list", "donut26", "donut26-leg", owners26, PURPLE);
  makeAgencies("ag26-list", ag26, PURPLE, BLUE, tot26.ruc);
  makeBars("travel26-bars", travel26, PURPLE, "cnt");
  makeTable("tbl26", cum26, "ruc-p");

  // TY2026 created date — dual-axis bar+line
  let cc26 = 0;
  const cr26cum = created26.map((d) => { cc26 += d.cnt; return { ...d, cum: cc26 }; });
  new Chart(document.getElementById("created26"), {
    type: "bar",
    data: {
      labels: cr26cum.map((d) => d.m),
      datasets: [
        { label: "Monthly", data: cr26cum.map((d) => d.cnt), backgroundColor: "rgba(42,120,214,0.35)", borderColor: PURPLE, borderWidth: 1, borderRadius: 2, yAxisID: "y" },
        { label: "Cumulative", data: cr26cum.map((d) => d.cum), type: "line", borderColor: PURPLE_LIGHT, backgroundColor: "transparent", borderWidth: 2, pointRadius: 4, tension: 0.4, yAxisID: "y1" },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipDefaults() },
      scales: axisDualDefaults("Monthly", "Cumulative", PURPLE),
    },
  });

  /* ── CHARTS — 2025 vs 2026 COMPARISON ── */

  new Chart(document.getElementById("cmp-chart"), {
    type: "line",
    data: {
      labels: m26.map((d) => d.m),
      datasets: [
        { label: "2025 Cum RUC", data: cum25.slice(0, m26.length).map((d) => d.cr), borderColor: GREEN, backgroundColor: "rgba(91,149,222,0.05)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 },
        { label: "2026 Cum RUC", data: cum26.map((d) => d.cr), borderColor: PURPLE, backgroundColor: "rgba(42,120,214,0.05)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4, borderDash: [6, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults(),
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw != null ? "€" + ctx.raw.toLocaleString("en-US") : "—"}`,
            afterBody: (ctx) => {
              const i = ctx[0].dataIndex;
              const v25 = cum25[i]?.cr, v26 = cum26[i]?.cr;
              if (!v25 || !v26) return "";
              const pct = (((v26 - v25) / v25) * 100).toFixed(1);
              return `2026 vs 2025: ${pct >= 0 ? "+" : ""}${pct}%`;
            },
          },
        },
      },
      scales: axisDefaults(),
    },
  });

  new Chart(document.getElementById("cmp-bar"), {
    type: "bar",
    data: {
      labels: calMonths,
      datasets: [
        { label: "2025", data: ruc25cal, backgroundColor: GREEN + "99", borderRadius: 4 },
        { label: "2026", data: ruc26cal, backgroundColor: PURPLE, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { bottom: 30 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults(), callbacks: { label: (ctx) => `${ctx.dataset.label}: €${ctx.raw.toLocaleString("en-US")}`, footer: yearDeltaFooter("€") } },
      },
      scales: axisDefaults(),
    },
    plugins: [yearDeltaLabels],
  });

  // Head-to-head dumbbell rows: one shared axis, 2025 and 2026 dot per month
  const eurFull = (n) => "€" + Math.round(n).toLocaleString("en-US");
  const axStep = Math.ceil(Math.max(...hhMonths.flatMap((d) => [d.r25, d.r26])) / 4 / 1000) * 1000;
  const axMax = axStep * 4;
  const axPos = (v) => (v / axMax) * 100;
  document.getElementById("cmp-ticks").innerHTML = [0, 1, 2, 3, 4]
    .map((i) => `<span style="left:${i * 25}%">${(i * axStep) / 1000}k</span>`).join("");
  document.getElementById("cmp-rows").innerHTML = hhMonths
    .map((d) => {
      const delta = d.r26 - d.r25;
      const pct = d.r25 > 0 ? Math.abs(Math.round((delta / d.r25) * 100)) + "%" : null;
      const sign = delta >= 0 ? "+" : "−";
      const dc = delta >= 0 ? "up" : "down";
      const lo = Math.min(d.r25, d.r26);
      const hi = Math.max(d.r25, d.r26);
      return `<div class="db-row">
        <span class="db-month">${d.m}</span>
        <div class="db-axis">
          <div class="db-line ${dc}" style="left:${axPos(lo)}%;width:${axPos(hi) - axPos(lo)}%"></div>
          <div class="db-pt y25" style="left:${axPos(d.r25)}%" title="2025: ${eurFull(d.r25)}"></div>
          <div class="db-pt y26" style="left:${axPos(d.r26)}%" title="2026: ${eurFull(d.r26)}"></div>
        </div>
        <div class="db-vals"><span>${eurFull(d.r25)} → ${eurFull(d.r26)}</span><br><span class="delta ${dc}">${sign}${eurFull(Math.abs(delta))}${pct ? " · " + sign + pct : ""}</span></div>
      </div>`;
    })
    .join("");

  new Chart(document.getElementById("cmp-owner"), {
    type: "bar",
    data: {
      labels: cmpOwnerLabels,
      datasets: [
        { label: "2025 RUC", data: cmpOwner25ruc, backgroundColor: GREEN + "99", borderRadius: 4 },
        { label: "2026 RUC", data: cmpOwner26ruc, backgroundColor: PURPLE, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { bottom: 30 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults(), callbacks: { label: (ctx) => `${ctx.dataset.label}: €${ctx.raw.toLocaleString("en-US")}`, footer: yearDeltaFooter("€") } },
      },
      scales: axisDefaults(),
    },
    plugins: [yearDeltaLabels],
  });

  /* ── CHARTS — ROUNDABOUT ── */

  const rbCum   = makeCum(rbClosed);
  const rbCum26 = makeCum(rbClosed26);
  const maxLen  = Math.max(rbCum.length, rbCum26.length);

  new Chart(document.getElementById("rb-cmp-ytd"), {
    type: "line",
    data: {
      labels: Array.from({ length: maxLen }, (_, i) => `M${i + 1}`),
      datasets: [
        { label: "Travel 2025 Cum RUC", data: rbCum.map((d) => d.cr), borderColor: GREEN, backgroundColor: "rgba(91,149,222,0.06)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 },
        {
          label: "Travel 2026 Cum RUC",
          data: [...rbCum26.map((d) => d.cr), ...Array(Math.max(0, rbCum.length - rbCum26.length)).fill(null)],
          borderColor: PURPLE, backgroundColor: "rgba(42,120,214,0.06)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4, borderDash: [6, 3],
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults(), callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw != null ? "€" + ctx.raw.toLocaleString("en-US") : "—"}`, footer: yearDeltaFooter("€") } },
      },
      scales: axisDefaults(),
    },
  });

  new Chart(document.getElementById("rb-cmp-bar"), {
    type: "bar",
    data: {
      labels: rbHhMonths,
      datasets: [
        { label: "Travel 2025", data: rbRuc25hh, backgroundColor: GREEN + "99", borderRadius: 4 },
        { label: "Travel 2026", data: rbRuc26hh, backgroundColor: PURPLE, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { bottom: 30 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults(),
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: €${ctx.raw.toLocaleString("en-US")}`,
            afterBody: (ctx) => {
              const i = ctx[0].dataIndex;
              const v25 = rbRuc25hh[i], v26 = rbRuc26hh[i];
              if (v25 === 0 || v26 === 0) return "";
              const pct = (((v26 - v25) / v25) * 100).toFixed(1);
              return `${pct >= 0 ? "↑ +" : "↓ "}${pct}% vs 2025`;
            },
          },
        },
      },
      scales: axisDefaults(),
    },
    plugins: [yearDeltaLabels],
  });

  new Chart(document.getElementById("rb-cmp-cnt"), {
    type: "bar",
    data: {
      labels: rbHhMonths,
      datasets: [
        { label: "Travel 2025", data: rbCnt25hh, backgroundColor: GREEN + "99", borderRadius: 4 },
        { label: "Travel 2026", data: rbCnt26hh, backgroundColor: PURPLE, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { bottom: 30 } },
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults(), callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString("en-US")}`, footer: yearDeltaFooter("") } } },
      scales: axisDefaults(),
    },
    plugins: [yearDeltaLabels],
  });

  lineChart("rb-ytd", rbClosed.map((d) => d.m), [
    { label: "Cumulative RUC",   data: rbCum.map((d) => d.cr), borderColor: GREEN, backgroundColor: "rgba(91,149,222,0.07)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 },
    { label: "Cumulative Value", data: rbCum.map((d) => d.cv), borderColor: "rgba(140,140,140,0.6)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.4, borderDash: [4, 3] },
  ]);

  makeBars("rb-ruc-bars", rbClosed, GREEN);
  makeBars("rb-cnt-bars", rbClosed, GREEN_LIGHT, "cnt");
  makeTable("rb-tbl", rbCum, "ruc-g");

  let rcc = 0;
  const rbCreatedCum = rbCreated.map((d) => { rcc += d.cnt; return { ...d, cum: rcc }; });
  new Chart(document.getElementById("rb-created"), {
    type: "bar",
    data: {
      labels: rbCreatedCum.map((d) => d.m),
      datasets: [
        { label: "Monthly", data: rbCreatedCum.map((d) => d.cnt), backgroundColor: "rgba(91,149,222,0.35)", borderColor: GREEN, borderWidth: 1, borderRadius: 2, yAxisID: "y" },
        { label: "Cumulative", data: rbCreatedCum.map((d) => d.cum), type: "line", borderColor: GREEN_LIGHT, backgroundColor: "transparent", borderWidth: 2, pointRadius: 4, tension: 0.4, yAxisID: "y1" },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipDefaults() },
      scales: axisDualDefaults("Monthly", "Cumulative", GREEN),
    },
  });

  lineChart("rb26-ytd", rbClosed26.map((d) => d.m), [
    { label: "Cumulative RUC",   data: rbCum26.map((d) => d.cr), borderColor: PURPLE, backgroundColor: "rgba(42,120,214,0.07)", borderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 },
    { label: "Cumulative Value", data: rbCum26.map((d) => d.cv), borderColor: "rgba(140,140,140,0.6)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.4, borderDash: [4, 3] },
  ]);

  makeBars("rb26-ruc-bars", rbClosed26, PURPLE);
  makeBars("rb26-cnt-bars", rbClosed26, PURPLE_LIGHT, "cnt");
  makeTable("rb26-tbl", rbCum26, "ruc-p");
});

/* ── PRINT ── */

window.addEventListener("beforeprint", () => {
  document.querySelectorAll(".page").forEach((p) => (p.style.display = "block"));
  Object.values(Chart.instances).forEach((c) => c.resize());
});

window.addEventListener("afterprint", () => {
  document.querySelectorAll(".page").forEach((p) => { p.style.display = ""; });
  const active = document.querySelector(".page.active");
  if (active) active.style.display = "block";
});
