// Engine. Every number the app shows is produced here, so the chain from a
// parameter to a duration can be traced in one file.

export const R_GAS = 8.314; // J per mol per K
const TREF_K = 298.15; // 25 C, the temperature at which the tabulated tau values apply
const SEC_PER_YR = 3.15576e7;
const SEC_PER_MYR = SEC_PER_YR * 1e6;

export const secPerYr = SEC_PER_YR;
export const secPerMyr = SEC_PER_MYR;

export const geomean = (a, b) => Math.sqrt(a * b);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------------- temperature ---------------- */

// tau(T) = tau(Tref) * exp( (Ea/R) * (1/T - 1/Tref) ).
// Cooling below Tref makes 1/T larger, so tau grows. Heating shrinks it.
export function arrhenius(tau, tempC, EaKJ) {
  const T = tempC + 273.15;
  if (T <= 0) return Infinity;
  return tau * Math.exp((EaKJ * 1000 / R_GAS) * (1 / T - 1 / TREF_K));
}

// Activation energy derived from two measured half-lives of the same reaction.
// Used in the app for RNA phosphodiester hydrolysis: 4 yr at 25 C, 9 days at 100 C.
export function eaFromTwoPoints(tau1, t1C, tau2, t2C) {
  const T1 = t1C + 273.15, T2 = t2C + 273.15;
  return (R_GAS * Math.log(tau1 / tau2)) / (1 / T1 - 1 / T2) / 1000; // kJ per mol
}

// Illustrative Hadean cooling curve. Tier C. Log-linear interpolation in
// temperature between editable anchor points, which are ages in Ga.
export function tempAtAge(anchors, ageGa) {
  const a = [...anchors].sort((x, y) => y.age - x.age); // oldest first
  if (ageGa >= a[0].age) return a[0].t;
  if (ageGa <= a[a.length - 1].age) return a[a.length - 1].t;
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], q = a[i + 1];
    if (ageGa <= p.age && ageGa >= q.age) {
      const f = (p.age - ageGa) / (p.age - q.age);
      return Math.exp(Math.log(p.t) * (1 - f) + Math.log(q.t) * f);
    }
  }
  return a[a.length - 1].t;
}

// Oldest age at which the surface was already at or below a chosen temperature.
export function ageAtTemp(anchors, tempC) {
  const a = [...anchors].sort((x, y) => y.age - x.age);
  if (tempC >= a[0].t) return a[0].age;
  if (tempC <= a[a.length - 1].t) return a[a.length - 1].age;
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], q = a[i + 1];
    if (tempC <= p.t && tempC >= q.t) {
      const f = (Math.log(p.t) - Math.log(tempC)) / (Math.log(p.t) - Math.log(q.t));
      return p.age - f * (p.age - q.age);
    }
  }
  return a[a.length - 1].age;
}

/* ---------------- envelope ---------------- */

export function computeEnvelope(p) {
  let nearGa, nearLabel, nearBasis;
  if (p.nearMode === "temperature") {
    nearGa = ageAtTemp(p.coolingAnchors, p.startTempC);
    nearLabel = "Surface at or below " + p.startTempC + " C";
    nearBasis = "Read off the cooling curve, which is Tier C and illustrative.";
  } else if (p.nearMode === "manual") {
    nearGa = p.nearManualGa;
    nearLabel = "Set by hand";
    nearBasis = "Typed in directly.";
  } else {
    const ev = p.nearOptions.find((o) => o.id === p.nearEventId) || p.nearOptions[0];
    nearGa = ev.age;
    nearLabel = ev.label;
    nearBasis = ev.basis;
  }
  let farGa, farLabel, farBasis;
  if (p.farMode === "manual") {
    farGa = p.farManualGa;
    farLabel = "Set by hand";
    farBasis = "Typed in directly.";
  } else {
    const ev = p.farOptions.find((o) => o.id === p.farEventId) || p.farOptions[0];
    farGa = ev.age;
    farLabel = ev.label;
    farBasis = ev.basis;
  }
  const budgetMyr = (nearGa - farGa) * 1000;
  const tempAtNear = tempAtAge(p.coolingAnchors, nearGa);
  return {
    nearGa, farGa, nearLabel, farLabel, nearBasis, farBasis,
    budgetMyr,
    valid: budgetMyr > 0,
    tempAtNear,
    workingTempC: p.tempMode === "curve" ? tempAtNear : p.chemTempC,
  };
}

/* ---------------- chemistry to probability ---------------- */

// Da = tau_loss / tau_transfer. p = Da / (1 + Da). This is the handoff criterion
// restated as a probability, not an extra assumption.
export function handoffState(h, tempC, eaTransfer, eaLoss) {
  const ttRef = geomean(h.tau_transfer_low_s, h.tau_transfer_high_s);
  const tlRef = geomean(h.tau_loss_low_s, h.tau_loss_high_s);
  const tt = arrhenius(ttRef, tempC, eaTransfer);
  const tl = arrhenius(tlRef, tempC, eaLoss);
  const da = tl / tt;
  const p = da / (1 + da);
  const l = Math.log10(da);
  let verdict = "marginal, on the diagonal", cls = "v-marginal";
  if (l >= 2) { verdict = "clear pass"; cls = "v-pass"; }
  else if (l >= 1) { verdict = "pass, narrow margin"; cls = "v-pass"; }
  else if (l <= -1) { verdict = "perish"; cls = "v-fail"; }
  return { tauTransferRef: ttRef, tauLossRef: tlRef, tauTransfer: tt, tauLoss: tl, da, p, logDa: l, verdict, verdictClass: cls };
}

/* ---------------- the four terms ---------------- */

// T4. Class 3. Crossing the error threshold, then fixing a trait in a population.
export function computeT4(p) {
  const genPerYr = SEC_PER_YR / p.generationTimeS;
  const gensToFix = p.genFixFactor * p.popSize; // neutral fixation scales with N
  const fixYr = gensToFix / genPerYr;
  const errorYr = p.errorThresholdMyr * 1e6;
  return {
    fixMyr: fixYr / 1e6,
    errorMyr: p.errorThresholdMyr,
    totalMyr: fixYr / 1e6 + p.errorThresholdMyr,
    genPerYr, gensToFix,
  };
}

// A whole scenario. Returns every intermediate so the UI can show the chain.
export function auditScenario(sc, p, model) {
  const temp = p.effectiveTempC;

  // T1. Setting availability. Scenario range, geometric mean, times the land factor.
  const landFactor = sc.requires_subaerial_land ? p.landUncertaintyFactor : 1;
  const t1 = geomean(sc.t1_low, sc.t1_high) * landFactor * p.t1Scale;

  // T2. Chemistry. Sum of temperature-corrected transfer times over the chosen rungs.
  const rungs = [];
  let t2Sec = 0, pJoint = 1;
  for (const rid of p.activeRungs) {
    const hid = p.rungHandoff[rid];
    const rung = model.rungs.find((r) => r.id === rid);
    if (!hid || hid === "none") {
      rungs.push({ rung: rid, rungName: rung ? rung.name : rid, handoff: null, p: 1, da: Infinity, tauTransfer: 0, verdict: "no rate gate", verdictClass: "v-pass" });
      continue;
    }
    const h = model.handoffs.find((x) => x.id === hid);
    if (!h) continue;
    const st = handoffState(h, temp, p.eaTransfer, p.eaLoss);
    t2Sec += st.tauTransfer;
    pJoint *= st.p;
    rungs.push({ rung: rid, rungName: rung ? rung.name : rid, handoff: h, ...st });
  }
  const t2 = (t2Sec / SEC_PER_MYR) * p.t2Scale;

  // T3. Coincidence waiting time.
  //   T3 = n_successes * T_cycle / (p_joint * N_sites)
  const nSites = geomean(sc.n_parallel_sites_low, sc.n_parallel_sites_high) * p.siteScale;
  const cycle = model.cycles.find((c) => c.name === p.cycleName);
  const tCycleS = cycle ? geomean(cycle.hadean_period_s_low, cycle.hadean_period_s_high) : 43200;
  const attemptsPerS = (pJoint * nSites) / tCycleS;
  const t3Sec = p.successesNeeded / attemptsPerS;
  const t3 = t3Sec / SEC_PER_MYR;

  // T4. The Class 3 floor. Same for every scenario, by design.
  const t4obj = computeT4(p);
  const t4 = t4obj.totalMyr;

  const total = t1 + t2 + t3 + t4;
  const terms = { T1: t1, T2: t2, T3: t3, T4: t4 };
  let dominant = "T1";
  for (const k of ["T2", "T3", "T4"]) if (terms[k] > terms[dominant]) dominant = k;

  return {
    scenario: sc, t1, t2, t3, t4, total, terms, dominant,
    landFactor, nSites, tCycleS, cycleName: cycle ? cycle.name : "unknown",
    pJoint, attemptsPerS, rungs, t4detail: t4obj, tempC: temp,
    workbookLow: sc.plotted_low_myr, workbookHigh: sc.plotted_high_myr,
  };
}

export function verdictAgainstBudget(totalMyr, budgetMyr) {
  if (!(budgetMyr > 0)) return { text: "no budget, the envelope is inverted", cls: "v-fail" };
  if (totalMyr <= budgetMyr) return { text: "fits", cls: "v-pass" };
  if (totalMyr <= budgetMyr * 3) return { text: "fits only at the fast end", cls: "v-marginal" };
  return { text: "needs a longer budget", cls: "v-fail" };
}

/* ---------------- S6, preservation ---------------- */

export function ecosystemGate(p) {
  const turnovers = (p.vesselLifetimeYr / p.recycleTimeYr);
  const ratio = turnovers / p.turnoversForEcosystem;
  let verdict = "a population, not an ecosystem", cls = "v-fail";
  if (ratio >= 10) { verdict = "an ecosystem with room to spare", cls = "v-pass"; }
  else if (ratio >= 1) { verdict = "just an ecosystem", cls = "v-marginal"; }
  return { turnovers, ratio, verdict, verdictClass: cls };
}

// Does a molecule class survive burial for the age of the rock.
export function preservationGate(mc, p) {
  const known = mc.half_life_value != null && mc.half_life_temp_c != null;
  let tauMyr = null, ratio = null;
  if (known) {
    const halfYr = mc.half_life_unit && mc.half_life_unit.startsWith("Myr")
      ? mc.half_life_value * 1e6 : mc.half_life_value;
    const tauRefS = halfYr * SEC_PER_YR;
    // Step 1: re-reference the measured half-life from its reported temperature to 25 C.
    // Step 2: push it from 25 C out to the burial temperature.
    const tauAt25 = tauRefS / Math.exp(
      (p.eaDegradation * 1000 / R_GAS) * (1 / (mc.half_life_temp_c + 273.15) - 1 / TREF_K)
    );
    const tauBurial = arrhenius(tauAt25, p.burialTempC, p.eaDegradation);
    tauMyr = tauBurial / SEC_PER_MYR;
    ratio = tauMyr / p.rockAgeMyr;
  }
  // The thermal ceiling is a separate and harder gate than slow chemistry.
  const overOilWindow = p.burialTempC > 150;
  const overGreenschist = p.burialTempC > 400;
  let verdict, cls;
  if (mc.verdict.startsWith("preserved") && !overGreenschist) { verdict = "passes S6b"; cls = "v-pass"; }
  else if (mc.verdict.startsWith("preserved") && overGreenschist) { verdict = "isotopic signal only"; cls = "v-marginal"; }
  else if (ratio != null && ratio >= 1) { verdict = "passes on the half-life, but see the note"; cls = "v-marginal"; }
  else { verdict = "fails S6b"; cls = "v-fail"; }
  return { tauMyr, ratio, verdict, verdictClass: cls, overOilWindow, overGreenschist };
}

/* ---------------- formatting ---------------- */

export function fmtSci(v, dp = 2) {
  if (v === Infinity) return "infinity";
  if (v === 0) return "0";
  if (v == null || Number.isNaN(v)) return "n.a.";
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e5) {
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(2);
  }
  const e = Math.floor(Math.log10(a));
  const m = v / Math.pow(10, e);
  return m.toFixed(dp) + " x 10^" + e;
}

export function fmtMyr(v) {
  if (v == null || Number.isNaN(v)) return "n.a.";
  if (v === Infinity) return "infinity";
  if (v >= 1000) return fmtSci(v);
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(2);
  if (v >= 1e-3) return v.toPrecision(2);
  return fmtSci(v);
}

export function fmtDuration(sec) {
  if (sec === Infinity) return "infinity";
  if (sec < 1e-3) return fmtSci(sec) + " s";
  if (sec < 120) return fmtSci(sec) + " s";
  if (sec < 7200) return (sec / 60).toFixed(1) + " min";
  if (sec < 2 * 86400) return (sec / 3600).toFixed(1) + " h";
  if (sec < 2 * SEC_PER_YR) return (sec / 86400).toFixed(1) + " days";
  const yr = sec / SEC_PER_YR;
  if (yr < 1e6) return fmtSci(yr) + " yr";
  return fmtSci(yr / 1e6) + " Myr";
}
