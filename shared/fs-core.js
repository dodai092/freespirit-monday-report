/* ════════════════════════════════════════════════════════════
   fs-core.js — shared FreeSpirit report utilities
   Load after Chart.js and before any report-specific script.
   Used by: monday, recap
   ════════════════════════════════════════════════════════════ */

/* ── FORMATTERS ── */

function fmt(v)     { return v >= 1000 ? (v / 1000).toFixed(0) + 'k€' : v + '€'; }
function fmtFull(v) { return Math.round(v).toLocaleString('hr-HR') + '€'; }
function fmtN(v)    { return Math.round(v).toLocaleString('hr-HR'); }

/* ── CHART.JS CONFIG HELPERS (read CSS vars at call time) ── */

function axisDefaults() {
  const textColor   = getComputedStyle(document.body).getPropertyValue('--text3').trim();
  const gridColor   = getComputedStyle(document.body).getPropertyValue('--border').trim();
  const borderColor = getComputedStyle(document.body).getPropertyValue('--border-dark').trim() + '14';
  return {
    x: {
      ticks: { font: { size: 12, family: 'Inconsolata' }, color: textColor, maxRotation: 45 },
      grid: { color: gridColor },
      border: { color: borderColor },
    },
    y: {
      ticks: { callback: (v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v), font: { size: 12, family: 'Inconsolata' }, color: textColor },
      grid: { color: gridColor },
      border: { color: borderColor },
    },
  };
}

function tooltipDefaults() {
  const textColor   = getComputedStyle(document.body).getPropertyValue('--text').trim();
  const text2Color  = getComputedStyle(document.body).getPropertyValue('--text2').trim();
  const bgColor     = getComputedStyle(document.body).getPropertyValue('--white').trim();
  const borderColor = getComputedStyle(document.body).getPropertyValue('--border-dark').trim();
  return {
    backgroundColor: bgColor,
    borderColor,
    borderWidth: 1,
    titleColor: textColor,
    bodyColor: text2Color,
    footerColor: textColor,
    padding: 10,
    callbacks: {
      label: (ctx) => `${ctx.dataset.label}: ${ctx.raw != null ? ctx.raw.toLocaleString('hr-HR') + '€' : '—'}`,
    },
  };
}

/* ── DATA HELPERS ── */

function makeCum(arr) {
  let cr = 0, cv = 0, cc = 0;
  return arr.map((d) => { cr += d.ruc; cv += d.val; cc += d.cnt; return { ...d, cr: Math.round(cr), cv: Math.round(cv), cc }; });
}

/* ── RENDERING HELPERS ── */

function makeBars(containerId, data, color, key = 'ruc') {
  const max = Math.max(...data.map((d) => d[key]));
  const isCount = key === 'cnt' || key === 'tura' || key === 'pax';
  document.getElementById(containerId).innerHTML = data
    .map((d) => `<div class="bar-row"><div class="bar-lbl">${d.m}</div><div class="bar-track"><div class="bar-fill" style="width:${((d[key] / max) * 100).toFixed(1)}%;background:${typeof color === 'function' ? color(d) : color}"></div></div><div class="bar-val">${isCount ? fmtN(d[key]) : fmt(d[key])}</div></div>`)
    .join('');
}

function makeOwners(containerId, donutId, legId, owners, rucColor) {
  const max = owners[0].ruc;
  document.getElementById(containerId).innerHTML = owners
    .map((o) => {
      const init = o.name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
      return `<div class="owner-item">
        <div class="owner-hd"><div class="avatar" style="background:${o.col}18;color:${o.col};border:1px solid ${o.col}30">${init}</div>
        <span class="owner-name">${o.name}</span><span class="owner-cnt">${o.cnt} deals</span></div>
        <div class="owner-bar" style="width:${((o.ruc / max) * 100).toFixed(1)}%;background:${o.col}"></div>
        <div class="owner-stats">
          <div class="stat"><span class="val" style="color:${rucColor}">${fmtFull(o.ruc)}</span> <span class="lbl">RUC</span></div>
          <div class="stat"><span class="val" style="color:var(--blue)">${fmtFull(o.val)}</span> <span class="lbl">value</span></div>
          <div class="stat"><span class="val" style="color:var(--text2)">${Math.round((o.ruc / o.val) * 100)}%</span> <span class="lbl">margin</span></div>
        </div></div>`;
    })
    .join('');
  new Chart(document.getElementById(donutId), {
    type: 'doughnut',
    data: {
      labels: owners.map((o) => o.name),
      datasets: [{ data: owners.map((o) => o.ruc), backgroundColor: owners.map((o) => o.col), borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults(), callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString('hr-HR')}€` } },
      },
    },
  });
  document.getElementById(legId).innerHTML = owners
    .map((o) => `<div class="leg-item"><div class="leg-dot" style="background:${o.col}"></div>${o.name.split(' ')[0]}</div>`)
    .join('');
}

function makeAgencies(containerId, agencies, rucColor, valColor, totalRuc) {
  const sorted = [...agencies].sort((a, b) => b.ruc - a.ruc);
  const maxR = sorted[0].ruc, maxV = Math.max(...sorted.map((a) => a.val));
  document.getElementById(containerId).innerHTML = sorted
    .map((a, i) => {
      const pct = ((a.ruc / totalRuc) * 100).toFixed(1);
      const pctColor = parseFloat(pct) > 20 ? 'var(--amber)' : parseFloat(pct) > 5 ? rucColor : 'var(--text3)';
      return `<div class="ag-row">
        <div class="ag-rank">${String(i + 1).padStart(2, '0')}</div>
        <div class="ag-name">${a.name} <span class="ag-cnt">${a.cnt}x</span></div>
        <div class="ag-bars">
          <div class="ag-track"><div class="ag-fill" style="width:${((a.ruc / maxR) * 100).toFixed(1)}%;background:${rucColor}"></div></div>
          <div class="ag-track"><div class="ag-fill" style="width:${((a.val / maxV) * 100).toFixed(1)}%;background:${valColor}"></div></div>
        </div>
        <div class="ag-vals">
          <div class="ag-v" style="color:${rucColor}">${fmt(a.ruc)}</div>
          <div class="ag-v" style="color:${valColor}">${fmt(a.val)}</div>
        </div>
        <div class="ag-pct" style="color:${pctColor}">${pct}%</div>
      </div>`;
    })
    .join('');
}

/* ── THEME ── */

function updateThemeButton() {
  /* SVG icons handle visibility via CSS opacity — no DOM update needed */
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.documentElement.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeButton();
  Object.values(Chart.instances).forEach((chart) => {
    const options = chart.config.options;
    if (options.scales) {
      if (options.scales.x) Object.assign(options.scales.x, axisDefaults().x);
      if (options.scales.y) Object.assign(options.scales.y, axisDefaults().y);
    }
    if (options.plugins && options.plugins.tooltip) {
      Object.assign(options.plugins.tooltip, tooltipDefaults());
    }
    chart.update();
  });
}
