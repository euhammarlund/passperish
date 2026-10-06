// All figures are drawn as SVG so that export is vector by default and the
// exported file matches what is on screen exactly.

import { fmtMyr, fmtSci, geomean, handoffState, arrhenius, tempAtAge, R_GAS } from "./engine.js";

const C = {
  teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7",
  mauve: "#944454", gold: "#ffc553", olive: "#848456", brown: "#6e522b",
  text: "#28251d", muted: "#6e6b63", faint: "#a8a49b", border: "#d9d5cc",
  light: "#f7f6f2", surface: "#fdfdfb", fail: "#a13544",
};
export const PALETTE = C;
const FONT = "Switzer, system-ui, sans-serif";
const MONO = "JetBrains Mono, ui-monospace, monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svgOpen(w, h, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}" font-family="${FONT}">
<rect width="${w}" height="${h}" fill="${C.surface}"/>`;
}
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.fill || C.text}" font-size="${o.size || 12}" font-weight="${o.weight || 400}"` +
  ` text-anchor="${o.anchor || "start"}"${o.mono ? ` font-family="${MONO}"` : ""}` +
  `${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ""}` +
  `${o.opacity ? ` opacity="${o.opacity}"` : ""}>${esc(s)}</text>`;

/* ============ 1. Envelope ============ */

export function envelopeSvg(env, model, params, w = 900) {
  const evs = model.envelope_events;
  const h = 168 + evs.length * 30;
  const m = { l: 215, r: 34, t: 78, b: 62 };
  const oldest = 4.60, youngest = 3.60;
  const x = (ga) => m.l + ((oldest - ga) / (oldest - youngest)) * (w - m.l - m.r);
  let s = svgOpen(w, h, "The envelope and its two ends");

  s += txt(m.l - 200, 24, "The envelope and its two ends", { size: 14, weight: 600 });
  s += txt(m.l - 200, 41, "Bands are reported ranges, not confidence intervals. Time runs older to younger, left to right. A triangle means the band continues past the axis.", { size: 10.5, fill: C.muted });

  // the chosen budget, drawn as a shaded band behind everything
  if (env.valid) {
    s += `<rect x="${x(env.nearGa)}" y="${m.t - 12}" width="${x(env.farGa) - x(env.nearGa)}" height="${h - m.t - m.b + 22}" fill="${C.cyan}" opacity="0.45"/>`;
    s += `<line x1="${x(env.nearGa)}" y1="${m.t - 12}" x2="${x(env.nearGa)}" y2="${h - m.b + 10}" stroke="${C.darkTeal}" stroke-width="1.6"/>`;
    s += `<line x1="${x(env.farGa)}" y1="${m.t - 12}" x2="${x(env.farGa)}" y2="${h - m.b + 10}" stroke="${C.darkTeal}" stroke-width="1.6"/>`;
  } else {
    s += txt(w / 2, m.t + 20, "The near end is younger than the far end, so there is no budget.", { size: 12, weight: 600, fill: C.fail, anchor: "middle" });
  }

  // grid
  for (let g = 4.6; g >= 3.6 - 1e-9; g -= 0.1) {
    const gx = x(g);
    s += `<line x1="${gx}" y1="${m.t - 12}" x2="${gx}" y2="${h - m.b + 6}" stroke="${C.border}" stroke-width="0.6" opacity="0.8"/>`;
    s += txt(gx, h - m.b + 22, g.toFixed(1), { size: 10, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 42, "Age, Ga", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });

  const colour = { planetary: C.darkTeal, biological: C.teal, contested: C.mauve, derived: C.terra };
  evs.forEach((e, i) => {
    const y = m.t + 10 + i * 30;
    const xL = m.l, xR = w - m.r;
    const clampX = (v) => Math.max(xL, Math.min(xR, v));
    const rawOld = x(e.age_old_ga), rawYoung = x(e.age_young_ga);
    const x1 = clampX(rawOld), x2 = clampX(rawYoung);
    const runsOff = rawYoung > xR + 1 || rawOld < xL - 1;
    const col = colour[e.type] || C.muted;
    s += txt(m.l - 10, y + 4, e.label, { size: 11, anchor: "end", weight: e.type === "derived" ? 600 : 400 });
    if (e.drawn_as === "band") {
      s += `<rect x="${Math.min(x1, x2)}" y="${y - 6}" width="${Math.max(3, Math.abs(x2 - x1))}" height="12" rx="2" fill="${col}" opacity="${e.type === "contested" ? 0.35 : 0.7}" stroke="${col}" stroke-width="${e.type === "contested" ? 1.2 : 0}" stroke-dasharray="${e.type === "contested" ? "3 2" : ""}"/>`;
    } else if (e.drawn_as === "arrow") {
      s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      s += `<polygon points="${x2},${y} ${x2 - 7},${y - 4} ${x2 - 7},${y + 4}" fill="${col}"/>`;
      s += `<polygon points="${x1},${y} ${x1 + 7},${y - 4} ${x1 + 7},${y + 4}" fill="${col}"/>`;
      const mid = (x1 + x2) / 2;
      s += txt(mid, y - 8, fmtMyr((e.age_old_ga - e.age_young_ga) * 1000) + " Myr", { size: 9.5, anchor: "middle", fill: col, weight: 600, mono: true });
    } else {
      s += `<circle cx="${x1}" cy="${y}" r="5" fill="${e.type === "contested" ? C.surface : col}" stroke="${col}" stroke-width="1.8"/>`;
    }
    if (runsOff && e.drawn_as === "band") {
      if (rawYoung > xR + 1) s += `<polygon points="${xR + 3},${y} ${xR - 4},${y - 6} ${xR - 4},${y + 6}" fill="${col}" opacity="0.7"/>`;
      if (rawOld < xL - 1) s += `<polygon points="${xL - 3},${y} ${xL + 4},${y - 6} ${xL + 4},${y + 6}" fill="${col}" opacity="0.7"/>`;
    }
  });

  // chosen ends, labelled on top
  if (env.valid) {
    const xn = x(env.nearGa), xf = x(env.farGa), bandW = xf - xn;
    const tight = bandW < 210;
    s += txt(tight ? xn - 6 : xn, m.t - 20, "near end " + env.nearGa.toFixed(3) + " Ga",
      { size: 10, anchor: tight ? "end" : "middle", weight: 600, fill: C.darkTeal, mono: true });
    s += txt(tight ? xf + 6 : xf, m.t - 20, "far end " + env.farGa.toFixed(3) + " Ga",
      { size: 10, anchor: tight ? "start" : "middle", weight: 600, fill: C.darkTeal, mono: true });
    const label = "budget " + fmtMyr(env.budgetMyr) + " Myr";
    const narrow = bandW < 130;
    s += txt(narrow ? xf + 8 : (xn + xf) / 2, h - m.b - 4, label,
      { size: 12.5, anchor: narrow ? "start" : "middle", weight: 700, fill: C.darkTeal, mono: true });
  }
  void params;
  return s + "</svg>";
}

/* ============ 2. Cooling curve ============ */

export function coolingSvg(params, env, w = 420) {
  const h = 250, m = { l: 52, r: 16, t: 30, b: 44 };
  const oldest = 4.55, youngest = 4.00;
  const x = (ga) => m.l + ((oldest - ga) / (oldest - youngest)) * (w - m.l - m.r);
  const tLo = 30, tHi = 2000;
  const y = (t) => h - m.b - ((Math.log10(Math.max(tLo, t)) - Math.log10(tLo)) / (Math.log10(tHi) - Math.log10(tLo))) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Illustrative Hadean cooling curve");
  s += txt(4, 17, "Cooling curve, Tier C and illustrative", { size: 11.5, weight: 600 });

  for (const t of [30, 100, 300, 1000, 2000]) {
    s += `<line x1="${m.l}" y1="${y(t)}" x2="${w - m.r}" y2="${y(t)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 6, y(t) + 3.5, String(t), { size: 9.5, anchor: "end", fill: C.muted, mono: true });
  }
  for (let g = 4.5; g >= 4.0 - 1e-9; g -= 0.1) {
    s += `<line x1="${x(g)}" y1="${m.t}" x2="${x(g)}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(g), h - m.b + 15, g.toFixed(1), { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt(14, m.t - 12, "Surface T, C", { size: 9.5, fill: C.muted });
  s += txt((m.l + w - m.r) / 2, h - 8, "Age, Ga", { size: 10, anchor: "middle", fill: C.muted });

  let d = "";
  for (let g = oldest; g >= youngest - 1e-9; g -= 0.005) {
    const t = tempAtAge(params.coolingAnchors, g);
    d += (d ? " L" : "M") + x(g).toFixed(1) + " " + y(t).toFixed(1);
  }
  s += `<path d="${d}" fill="none" stroke="${C.terra}" stroke-width="2"/>`;
  for (const a of params.coolingAnchors) {
    if (a.age > oldest || a.age < youngest) continue;
    s += `<circle cx="${x(a.age)}" cy="${y(a.t)}" r="3" fill="${C.surface}" stroke="${C.terra}" stroke-width="1.6"/>`;
  }
  // the threshold and where it lands
  const th = params.startTempC;
  s += `<line x1="${m.l}" y1="${y(th)}" x2="${w - m.r}" y2="${y(th)}" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  s += txt(w - m.r - 2, y(th) - 5, th + " C threshold", { size: 9.5, anchor: "end", fill: C.teal, weight: 600, mono: true });
  if (env.nearGa <= oldest && env.nearGa >= youngest) {
    s += `<line x1="${x(env.nearGa)}" y1="${m.t}" x2="${x(env.nearGa)}" y2="${h - m.b}" stroke="${C.darkTeal}" stroke-width="1.4"/>`;
    s += txt(x(env.nearGa) + 4, m.t + 12, env.nearGa.toFixed(3) + " Ga", { size: 9.5, fill: C.darkTeal, weight: 600, mono: true });
  }
  return s + "</svg>";
}

/* ============ 3. Audit ============ */

export function auditSvg(results, env, w = 900) {
  const h = 120 + results.length * 52;
  const m = { l: 266, r: 130, t: 62, b: 56 };
  const lo = -4, hi = 4; // log10 Myr
  const x = (v) => m.l + ((Math.log10(Math.max(1e-4, v)) - lo) / (hi - lo)) * (w - m.l - m.r);
  let s = svgOpen(w, h, "Time-budget audit");
  s += txt(10, 24, "Time-budget audit: required duration against the budget you chose", { size: 14, weight: 600 });
  s += txt(10, 41, "Each bar is T1 setting, T2 chemistry, T3 coincidence and T4 slow biology, stacked on a logarithmic axis.", { size: 10.5, fill: C.muted });

  for (let e = lo; e <= hi; e++) {
    s += `<line x1="${x(Math.pow(10, e))}" y1="${m.t - 8}" x2="${x(Math.pow(10, e))}" y2="${h - m.b + 6}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(Math.pow(10, e)), h - m.b + 21, "10^" + e, { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 40, "Required duration, Myr, logarithmic", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });

  if (env.valid && env.budgetMyr > 0) {
    const bx = x(env.budgetMyr);
    s += `<rect x="${m.l}" y="${m.t - 8}" width="${Math.max(0, bx - m.l)}" height="${h - m.t - m.b + 14}" fill="${C.cyan}" opacity="0.3"/>`;
    s += `<line x1="${bx}" y1="${m.t - 16}" x2="${bx}" y2="${h - m.b + 6}" stroke="${C.darkTeal}" stroke-width="2"/>`;
    s += txt(bx + 5, m.t - 20, "budget " + fmtMyr(env.budgetMyr) + " Myr", { size: 11, weight: 700, fill: C.darkTeal, mono: true });
  }

  const termCol = { T1: C.terra, T2: C.gold, T3: C.teal, T4: C.darkTeal };
  results.forEach((r, i) => {
    const y0 = m.t + 8 + i * 52;
    s += txt(m.l - 10, y0 + 11, r.scenario.name, { size: 11.5, anchor: "end", weight: 600 });
    s += txt(m.l - 10, y0 + 25, "dominant " + r.dominant, { size: 9.5, anchor: "end", fill: C.muted, mono: true });
    let acc = 0;
    for (const k of ["T1", "T2", "T3", "T4"]) {
      const v = r.terms[k];
      if (!(v > 0)) continue;
      const xa = x(Math.max(1e-4, acc || 1e-4)), xb = x(acc + v);
      acc += v;
      const width = Math.max(1.5, xb - (acc === v ? m.l : xa));
      const x0 = acc === v ? m.l : xa;
      s += `<rect x="${x0}" y="${y0}" width="${width}" height="17" fill="${termCol[k]}" opacity="0.9"><title>${esc(k + " = " + fmtMyr(v) + " Myr")}</title></rect>`;
      if (width > 26) s += txt(x0 + width / 2, y0 + 12, k, { size: 9.5, anchor: "middle", fill: k === "T2" ? C.text : "#fff", weight: 700 });
    }
    const tx = x(r.total);
    s += `<line x1="${tx}" y1="${y0 - 4}" x2="${tx}" y2="${y0 + 21}" stroke="${C.text}" stroke-width="1.5"/>`;
    const fits = env.valid && r.total <= env.budgetMyr;
    const near = env.valid && !fits && r.total <= env.budgetMyr * 3;
    s += txt(w - m.r + 8, y0 + 8, fmtMyr(r.total) + " Myr", { size: 11, weight: 700, mono: true, fill: fits ? C.teal : near ? "#c08a1e" : C.fail });
    s += txt(w - m.r + 8, y0 + 21, fits ? "fits" : near ? "fast end only" : "too slow", { size: 9.5, fill: C.muted });
    // workbook range for comparison
    const wa = x(r.workbookLow), wb = x(r.workbookHigh);
    s += `<line x1="${wa}" y1="${y0 + 28}" x2="${wb}" y2="${y0 + 28}" stroke="${C.faint}" stroke-width="3" stroke-linecap="round" opacity="0.8"><title>manuscript range</title></line>`;
    s += txt(wa - 4, y0 + 31.5, "ms", { size: 8.5, anchor: "end", fill: C.faint, mono: true });
  });
  return s + "</svg>";
}

/* ============ 4. Damkohler diagonal ============ */

export function damkohlerSvg(model, params, w = 640, selectedId = null) {
  const h = 520, m = { l: 62, r: 22, t: 46, b: 62 };
  const lo = -1, hi = 16;
  const sx = (v) => m.l + ((Math.log10(v) - lo) / (hi - lo)) * (w - m.l - m.r);
  const sy = (v) => h - m.b - ((Math.log10(v) - lo) / (hi - lo)) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Pass or perish, the handoff criterion");
  s += txt(8, 20, "Pass or perish: transfer time against loss time", { size: 13.5, weight: 600 });
  s += txt(8, 35, "Above the diagonal a species is handed on. Below it, it is destroyed first.", { size: 10.5, fill: C.muted });

  for (let e = 0; e <= 16; e += 2) {
    s += `<line x1="${sx(Math.pow(10, e))}" y1="${m.t}" x2="${sx(Math.pow(10, e))}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += `<line x1="${m.l}" y1="${sy(Math.pow(10, e))}" x2="${w - m.r}" y2="${sy(Math.pow(10, e))}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(sx(Math.pow(10, e)), h - m.b + 16, "10^" + e, { size: 9, anchor: "middle", fill: C.muted, mono: true });
    s += txt(m.l - 6, sy(Math.pow(10, e)) + 3, "10^" + e, { size: 9, anchor: "end", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 36, "tau transfer, s", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(16, (m.t + h - m.b) / 2, "tau loss, s", { size: 11, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });

  // diagonal and the pass region
  s += `<polygon points="${m.l},${m.t} ${w - m.r},${m.t} ${m.l},${sy(Math.pow(10, lo))}" fill="${C.cyan}" opacity="0.22"/>`;
  s += `<line x1="${sx(Math.pow(10, lo))}" y1="${sy(Math.pow(10, lo))}" x2="${sx(Math.pow(10, hi))}" y2="${sy(Math.pow(10, hi))}" stroke="${C.text}" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  s += txt(w - m.r - 6, m.t + 14, "pass", { size: 11, anchor: "end", weight: 700, fill: C.darkTeal });
  s += txt(w - m.r - 6, h - m.b - 8, "perish", { size: 11, anchor: "end", weight: 700, fill: C.fail });

  const catCol = { "small molecule and ion": C.teal, "carbon substrate": C.terra, polymer: C.mauve };
  for (const hd of model.handoffs) {
    const st = handoffState(hd, params.effectiveTempC, params.eaTransfer, params.eaLoss);
    const cx = sx(Math.min(1e16, Math.max(0.1, st.tauTransfer)));
    const cy = sy(Math.min(1e16, Math.max(0.1, st.tauLoss)));
    const col = catCol[hd.marker_category] || C.muted;
    const on = selectedId === hd.id;
    // low to high bars, at the working temperature
    const txLo = arrhenius(hd.tau_transfer_low_s, params.effectiveTempC, params.eaTransfer);
    const txHi = arrhenius(hd.tau_transfer_high_s, params.effectiveTempC, params.eaTransfer);
    const tlLo = arrhenius(hd.tau_loss_low_s, params.effectiveTempC, params.eaLoss);
    const tlHi = arrhenius(hd.tau_loss_high_s, params.effectiveTempC, params.eaLoss);
    s += `<line x1="${sx(Math.max(0.1, txLo))}" y1="${cy}" x2="${sx(Math.min(1e16, txHi))}" y2="${cy}" stroke="${col}" stroke-width="1" opacity="0.5"/>`;
    s += `<line x1="${cx}" y1="${sy(Math.max(0.1, tlLo))}" x2="${cx}" y2="${sy(Math.min(1e16, tlHi))}" stroke="${col}" stroke-width="1" opacity="0.5"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${on ? 8 : 5.5}" fill="${col}" stroke="${on ? C.text : C.surface}" stroke-width="${on ? 2 : 1.2}"><title>${esc(hd.species_and_handoff + ": Da = " + fmtSci(st.da) + ", p = " + st.p.toFixed(4))}</title></circle>`;
    s += txt(cx + (on ? 12 : 9), cy + 3.5, hd.id, { size: 9, fill: col, weight: 700, mono: true });
  }
  let lx = m.l + 6;
  for (const [k, v] of Object.entries(catCol)) {
    s += `<circle cx="${lx}" cy="${h - 12}" r="4.5" fill="${v}"/>`;
    s += txt(lx + 8, h - 8.5, k, { size: 9.5, fill: C.muted });
    lx += 13 + k.length * 5.2;
  }
  return s + "</svg>";
}

/* ============ 5. Ladder, S0 to S6 with per rung probability ============ */

export function ladderSvg(result, model, w = 900) {
  const rungs = model.rungs;
  const h = 300;
  const m = { l: 40, r: 40, t: 60, b: 90 };
  const cw = (w - m.l - m.r) / rungs.length;
  let s = svgOpen(w, h, "The ladder, S0 to S6");
  s += txt(10, 22, "The ladder, with the probability the model assigns to each rung", { size: 14, weight: 600 });
  s += txt(10, 39, "S6 sits after S5 and does not consume the budget. It decides what the rock record is allowed to show us.", { size: 10.5, fill: C.muted });

  rungs.forEach((r, i) => {
    const cx = m.l + i * cw + cw / 2;
    const active = result.rungs.find((x) => x.rung === r.id);
    const isS6 = r.id === "S6";
    const p = active ? active.p : null;
    const barH = 86;
    const col = isS6 ? C.mauve : p == null ? C.faint : p > 0.9 ? C.teal : p > 0.1 ? C.gold : C.terra;
    // box
    s += `<rect x="${cx - cw / 2 + 5}" y="${m.t}" width="${cw - 10}" height="${barH}" rx="4" fill="${isS6 ? "#f3e9ec" : C.light}" stroke="${col}" stroke-width="1.4" stroke-dasharray="${isS6 ? "5 3" : ""}"/>`;
    s += txt(cx, m.t + 19, r.id, { size: 15, anchor: "middle", weight: 700, fill: col, mono: true });
    const words = r.name.split(" ");
    let line = "", ln = 0;
    for (const wd of words) {
      if ((line + " " + wd).trim().length > 15) { s += txt(cx, m.t + 36 + ln * 12, line, { size: 10, anchor: "middle", fill: C.text }); line = wd; ln++; }
      else line = (line + " " + wd).trim();
    }
    s += txt(cx, m.t + 36 + ln * 12, line, { size: 10, anchor: "middle", fill: C.text });
    if (p != null && !isS6) {
      s += txt(cx, m.t + barH - 8, "p = " + (p > 0.001 ? p.toFixed(3) : fmtSci(p)), { size: 9.5, anchor: "middle", fill: C.muted, mono: true, weight: 600 });
    } else if (isS6) {
      s += txt(cx, m.t + barH - 8, "evidence filter", { size: 9, anchor: "middle", fill: C.mauve, mono: true, weight: 600 });
    }
    // arrow
    if (i < rungs.length - 1) {
      const ax = cx + cw / 2 - 5, bx = cx + cw / 2 + 5;
      const dash = rungs[i + 1].id === "S6" ? "4 3" : "";
      s += `<line x1="${ax}" y1="${m.t + barH / 2}" x2="${bx - 3}" y2="${m.t + barH / 2}" stroke="${C.muted}" stroke-width="1.3" stroke-dasharray="${dash}"/>`;
      s += `<polygon points="${bx},${m.t + barH / 2} ${bx - 5},${m.t + barH / 2 - 3.5} ${bx - 5},${m.t + barH / 2 + 3.5}" fill="${C.muted}"/>`;
    }
    // unit selected
    s += txt(cx, m.t + barH + 20, r.unit_selected.length > 22 ? r.unit_selected.slice(0, 21) + "." : r.unit_selected, { size: 9, anchor: "middle", fill: C.muted });
  });

  // brackets: filters vs selection proper vs preservation
  const y = m.t + 150;
  const bracket = (i0, i1, label, col) => {
    const a = m.l + i0 * cw + 5, b = m.l + (i1 + 1) * cw - 5;
    let o = `<path d="M${a} ${y} L${a} ${y + 7} L${b} ${y + 7} L${b} ${y}" fill="none" stroke="${col}" stroke-width="1.3"/>`;
    o += txt((a + b) / 2, y + 22, label, { size: 10.5, anchor: "middle", fill: col, weight: 600 });
    return o;
  };
  s += bracket(0, 3, "S0 to S3, filters. No copying, no inheritance.", C.terra);
  s += bracket(4, 5, "S4 to S5, selection proper", C.teal);
  s += bracket(6, 6, "S6, preservation", C.mauve);

  s += txt(m.l, h - 14, "joint probability across the active rungs, p = " + fmtSci(result.pJoint) + ",  which sets T3", { size: 10.5, fill: C.darkTeal, weight: 600, mono: true });
  return s + "</svg>";
}

/* ============ 6. Regimes with proportional duration arrows ============ */

export function regimeSvg(model, env, w = 900) {
  const rs = model.regimes;
  const h = 300, m = { l: 22, r: 22, t: 58, b: 74 };
  const cw = (w - m.l - m.r) / rs.length;
  const cols = [C.terra, C.gold, C.teal, C.darkTeal];
  let s = svgOpen(w, h, "Four regimes with duration arrows");
  s += txt(10, 22, "Four rate-gated regimes, with duration arrows drawn to scale", { size: 14, weight: 600 });
  const total = rs.reduce((a, r) => a + Math.sqrt(r.duration_low_myr * r.duration_high_myr), 0);
  s += txt(10, 39, "Geometric means sum to " + fmtMyr(total) + " Myr" + (env.valid ? ", against a budget of " + fmtMyr(env.budgetMyr) + " Myr." : "."), { size: 10.5, fill: C.muted });

  const maxLog = Math.log10(100);
  rs.forEach((r, i) => {
    const x0 = m.l + i * cw, cx = x0 + cw / 2;
    const col = cols[i % 4];
    s += `<rect x="${x0 + 6}" y="${m.t}" width="${cw - 12}" height="112" rx="4" fill="${C.light}" stroke="${col}" stroke-width="1.5"/>`;
    s += txt(cx, m.t + 20, r.id + ". " + r.name, { size: 13, anchor: "middle", weight: 700, fill: col });
    s += txt(cx, m.t + 36, r.rungs_covered, { size: 10, anchor: "middle", fill: C.muted, mono: true });
    // wrapped conditions
    const words = r.conditions.split(" ");
    let line = "", ln = 0;
    for (const wd of words) {
      if ((line + " " + wd).trim().length > 24) { s += txt(cx, m.t + 55 + ln * 12, line, { size: 9.5, anchor: "middle" }); line = wd; ln++; }
      else line = (line + " " + wd).trim();
    }
    s += txt(cx, m.t + 55 + ln * 12, line, { size: 9.5, anchor: "middle" });
    s += txt(cx, m.t + 104, r.unit_selected, { size: 9.5, anchor: "middle", fill: col, weight: 600 });

    // duration arrow, length proportional to log of the geometric mean
    const gm = Math.sqrt(r.duration_low_myr * r.duration_high_myr);
    const frac = Math.max(0.08, (Math.log10(gm) + 3) / (maxLog + 3));
    const availW = cw - 24;
    const ax = x0 + 12, ay = m.t + 140;
    s += `<line x1="${ax}" y1="${ay}" x2="${ax + availW * frac}" y2="${ay}" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<polygon points="${ax + availW * frac + 9},${ay} ${ax + availW * frac},${ay - 5.5} ${ax + availW * frac},${ay + 5.5}" fill="${col}"/>`;
    s += txt(ax, ay + 18, fmtMyr(r.duration_low_myr) + " to " + fmtMyr(r.duration_high_myr) + " Myr", { size: 10, fill: col, weight: 700, mono: true });
    s += txt(ax, ay + 32, r.why_that_long, { size: 9.5, fill: C.muted });
  });
  s += txt(m.l, h - 10, "Arrow length is proportional to the logarithm of the geometric mean duration, so R2 is visibly the quickest regime.", { size: 9.5, fill: C.faint });
  return s + "</svg>";
}

/* ============ 7. Preservation survival curves ============ */

export function preservationSvg(model, params, w = 640) {
  const h = 400, m = { l: 58, r: 252, t: 50, b: 56 };
  const tLo = 0, tHi = 300;
  const x = (t) => m.l + ((t - tLo) / (tHi - tLo)) * (w - m.l - m.r);
  const yLo = -6, yHi = 12; // log10 Myr
  const y = (v) => h - m.b - ((Math.min(yHi, Math.max(yLo, v)) - yLo) / (yHi - yLo)) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Survival time against burial temperature");
  s += txt(8, 20, "S6b: survival time against burial temperature", { size: 13.5, weight: 600 });
  s += txt(8, 35, "A class is readable only where its curve sits above the age of the rock.", { size: 10.5, fill: C.muted });

  for (let e = yLo; e <= yHi; e += 3) {
    s += `<line x1="${m.l}" y1="${y(e)}" x2="${w - m.r}" y2="${y(e)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 6, y(e) + 3, "10^" + e, { size: 9, anchor: "end", fill: C.muted, mono: true });
  }
  for (let t = 0; t <= 300; t += 50) {
    s += `<line x1="${x(t)}" y1="${m.t}" x2="${x(t)}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(t), h - m.b + 15, String(t), { size: 9, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 34, "Burial temperature, C", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(14, (m.t + h - m.b) / 2, "Survival time, Myr", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });

  // age of the rock
  const ay = y(Math.log10(params.rockAgeMyr));
  s += `<line x1="${m.l}" y1="${ay}" x2="${w - m.r}" y2="${ay}" stroke="${C.text}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  s += txt(m.l + 4, ay - 5, "age of the rock, " + fmtMyr(params.rockAgeMyr) + " Myr", { size: 9.5, fill: C.text, weight: 600, mono: true });

  // the oil window ceiling
  s += `<rect x="${x(150)}" y="${m.t}" width="${w - m.r - x(150)}" height="${h - m.t - m.b}" fill="${C.terra}" opacity="0.09"/>`;
  s += `<line x1="${x(150)}" y1="${m.t}" x2="${x(150)}" y2="${h - m.b}" stroke="${C.terra}" stroke-width="1.3" stroke-dasharray="3 3"/>`;
  s += txt(x(150) + 4, m.t + 12, "oil window closes", { size: 9, fill: C.terra, weight: 600 });

  const cols = [C.mauve, C.terra, C.brown, C.darkTeal, C.olive, C.teal, C.mauve, C.muted];
  const withData = model.preservation.molecule_classes.filter((mc) => mc.half_life_value != null && mc.half_life_temp_c != null);
  withData.forEach((mc, i) => {
    const halfYr = mc.half_life_unit.startsWith("Myr") ? mc.half_life_value * 1e6 : mc.half_life_value;
    const tauRefS = halfYr * 3.15576e7;
    const tauAt25 = tauRefS / Math.exp((params.eaDegradation * 1000 / R_GAS) * (1 / (mc.half_life_temp_c + 273.15) - 1 / 298.15));
    let d = "";
    for (let t = tLo; t <= tHi; t += 2) {
      const v = Math.log10(arrhenius(tauAt25, t, params.eaDegradation) / 3.15576e13);
      d += (d ? " L" : "M") + x(t).toFixed(1) + " " + y(v).toFixed(1);
    }
    s += `<path d="${d}" fill="none" stroke="${cols[i]}" stroke-width="2"/>`;
    s += `<circle cx="${x(params.burialTempC)}" cy="${y(Math.log10(arrhenius(tauAt25, params.burialTempC, params.eaDegradation) / 3.15576e13))}" r="4" fill="${cols[i]}" stroke="${C.surface}" stroke-width="1.2"/>`;
    s += txt(w - m.r + 8, m.t + 12 + i * 15, mc.name.length > 38 ? mc.name.slice(0, 37) + "." : mc.name, { size: 9, fill: cols[i], weight: 600 });
  });
  // classes with no measured half-life
  const noData = model.preservation.molecule_classes.filter((mc) => mc.half_life_value == null);
  s += txt(w - m.r + 8, m.t + 12 + withData.length * 15 + 8, "no measured half-life:", { size: 9, fill: C.muted, weight: 700 });
  noData.forEach((mc, i) => {
    s += txt(w - m.r + 8, m.t + 12 + withData.length * 15 + 22 + i * 13, mc.name.length > 38 ? mc.name.slice(0, 37) + "." : mc.name, { size: 8.5, fill: C.muted });
  });

  const bx = x(params.burialTempC);
  s += `<line x1="${bx}" y1="${m.t}" x2="${bx}" y2="${h - m.b}" stroke="${C.darkTeal}" stroke-width="1.4"/>`;
  s += txt(bx + 4, m.t - 6, "your burial T, " + params.burialTempC + " C", { size: 9.5, fill: C.darkTeal, weight: 700, mono: true });
  return s + "</svg>";
}

/* ============ 8. Element passage matrix ============ */

export function matrixSvg(model, w = 900) {
  const els = model.elements;
  const rungIds = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"];
  const m = { l: 96, r: 20, t: 92, b: 40 };
  const cw = (w - m.l - m.r) / rungIds.length, rh = 30;
  const h = m.t + els.length * rh + m.b;
  let s = svgOpen(w, h, "Elemental passage matrix");
  s += txt(10, 22, "Elemental passage matrix, now including the preservation rung", { size: 14, weight: 600 });
  s += txt(10, 39, "e is easy, m is moderate, h is hard and rate-limiting. The S6 column is new and is Tier C.", { size: 10.5, fill: C.muted });

  const gradeCol = { e: C.cyan, m: C.gold, h: C.terra };
  const gradeText = { e: C.darkTeal, m: C.text, h: "#fff" };
  rungIds.forEach((rid, j) => {
    const r = model.rungs.find((x) => x.id === rid);
    const cx = m.l + j * cw + cw / 2;
    s += txt(cx, m.t - 26, rid, { size: 12.5, anchor: "middle", weight: 700, fill: rid === "S6" ? C.mauve : C.darkTeal, mono: true });
    const nm = r ? r.name : "";
    s += txt(cx, m.t - 12, nm.length > 16 ? nm.slice(0, 15) + "." : nm, { size: 9, anchor: "middle", fill: C.muted });
  });
  els.forEach((el, i) => {
    const y0 = m.t + i * rh;
    s += `<rect x="${m.l}" y="${y0}" width="${w - m.l - m.r}" height="${rh}" fill="${i % 2 ? "#f5f4f0" : C.surface}"/>`;
    s += txt(m.l - 10, y0 + rh / 2 + 4, el.symbol + ", " + el.name, { size: 11, anchor: "end", weight: 600 });
    rungIds.forEach((rid, j) => {
      const g = el.rungs[rid];
      if (!g) return;
      const cx = m.l + j * cw + cw / 2;
      s += `<rect x="${cx - 15}" y="${y0 + 5}" width="30" height="${rh - 10}" rx="3" fill="${gradeCol[g]}" opacity="${rid === "S6" ? 0.75 : 1}"/>`;
      s += txt(cx, y0 + rh / 2 + 4, g, { size: 12, anchor: "middle", weight: 700, fill: gradeText[g], mono: true });
    });
  });
  let lx = m.l;
  for (const [g, lbl] of [["e", "easy"], ["m", "moderate"], ["h", "hard, rate-limiting"]]) {
    s += `<rect x="${lx}" y="${h - 26}" width="18" height="12" rx="2" fill="${gradeCol[g]}"/>`;
    s += txt(lx + 23, h - 16, lbl, { size: 9.5, fill: C.muted });
    lx += 40 + lbl.length * 5.4;
  }
  return s + "</svg>";
}

/* ============ export helpers ============ */

export function downloadSvg(svgString, filename) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

export async function downloadPng(svgString, filename, scale = 2) {
  try {
    const m = svgString.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    const w = m ? parseFloat(m[1]) : 900, h = m ? parseFloat(m[2]) : 600;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const cv = document.createElement("canvas");
    cv.width = w * scale; cv.height = h * scale;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = C.surface; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const out = cv.toDataURL("image/png");
    triggerDownload(out, filename);
    return true;
  } catch (e) {
    downloadSvg(svgString, filename.replace(/\.png$/, ".svg"));
    return false;
  }
}

export function downloadText(text, filename, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); if (href.startsWith("blob:")) URL.revokeObjectURL(href); }, 1500);
}

export { geomean };
