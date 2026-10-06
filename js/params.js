// Every tweakable parameter in one place. Each one carries a plausible range, an
// unreasonable outer range that the app still allows but flags, a tier and a
// reference, so nothing on screen is an unattributed number.

export const COOLING_ANCHORS = [
  { age: 4.5, t: 1800 }, { age: 4.45, t: 500 }, { age: 4.4, t: 200 },
  { age: 4.35, t: 110 }, { age: 4.3, t: 80 }, { age: 4.2, t: 60 }, { age: 4.0, t: 45 },
];

export const NEAR_OPTIONS = [
  { id: "water", label: "First evidence of liquid water, 4.40 Ga", age: 4.40,
    basis: "One detrital Jack Hills zircon. A single grain, so it is a point and not a range.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6315770/" },
  { id: "magma", label: "End of the magma ocean, 4.40 Ga", age: 4.40,
    basis: "Sets the physical start of the envelope. Before this there is no liquid water surface.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6315770/" },
  { id: "moon", label: "Moon-forming impact, 4.36 Ga", age: 4.36,
    basis: "The surface was remelted and the ocean vaporised, so any earlier chemistry is erased.",
    url: null },
  { id: "habit", label: "Earliest continuous habitability, 4.34 Ga", age: 4.34,
    basis: "The conservative planetary start. The near end of the envelope is set by the planet rather than by biology.",
    url: "https://www.nature.com/articles/nature08015" },
];

export const FAR_OPTIONS = [
  { id: "moody", label: "LUCA at 4.2 Ga, Moody et al. 2024", age: 4.20,
    basis: "Central value of a molecular clock estimate whose reported range is 4.33 to 4.09 Ga. This is the working far end of the paper.",
    url: "https://www.nature.com/articles/s41559-024-02461-1" },
  { id: "moodyOld", label: "LUCA at the old end of the clock, 4.33 Ga", age: 4.33,
    basis: "The oldest end of the same reported range. Choosing it shrinks the budget to almost nothing.",
    url: "https://www.nature.com/articles/s41559-024-02461-1" },
  { id: "moodyYoung", label: "LUCA at the young end of the clock, 4.09 Ga", age: 4.09,
    basis: "The youngest end of the same reported range.",
    url: "https://www.nature.com/articles/s41559-024-02461-1" },
  { id: "jackhills", label: "Jack Hills zircon graphite, 4.1 Ga, contested", age: 4.10,
    basis: "A contested biosignature. Accepting it puts life before most clock estimates of LUCA.",
    url: null },
  { id: "conservative", label: "Conservative clock estimate, 3.8 Ga", age: 3.80,
    basis: "The older and more cautious clock date. It gives the 600 Myr alternative budget of the paper.",
    url: null },
  { id: "isua", label: "Isua graphite and inclusions, 3.7 Ga, contested", age: 3.70,
    basis: "The youngest far end considered here, and the one with a direct rock sample behind it rather than a clock.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28738409/" },
];

// Which handoff stands in for each rung by default. The user can change any of
// these, because the choice of representative handoff is a judgement.
export const DEFAULT_RUNG_HANDOFF = {
  S0: "none", S1: "H2", S2: "H3", S3: "H12", S4: "H9", S5: "H11",
};

export const SPEC = {
  // temperature
  startTempC: { label: "Maximum tolerable surface temperature at the start", unit: "C",
    def: 110, lo: 40, hi: 250, uLo: 5, uHi: 1800, step: 5, tier: "C",
    hint: "Sets the near end of the envelope by reading back along the cooling curve. The curve itself is illustrative.",
    ref: "Cooling anchors are Tier C and editable on this page." },
  chemTempC: { label: "Temperature used for the chemistry", unit: "C",
    def: 70, lo: 4, hi: 120, uLo: -20, uHi: 400, step: 1, tier: "B",
    hint: "Feeds the Arrhenius correction on every handoff time. Set it independently of the envelope, or let the cooling curve supply it.",
    ref: null },
  eaTransfer: { label: "Activation energy, transfer", unit: "kJ per mol",
    def: 50, lo: 30, hi: 90, uLo: 5, uHi: 250, step: 1, tier: "C",
    hint: "Generic value for a catalysed reaction on a mineral surface. There is no single measured number for a category this broad.",
    ref: null },
  eaLoss: { label: "Activation energy, loss", unit: "kJ per mol",
    def: 63, lo: 40, hi: 90, uLo: 5, uHi: 250, step: 1, tier: "B",
    hint: "Derived from measured RNA phosphodiester hydrolysis at two temperatures, 4 yr at 25 C and 9 days at 100 C, which gives 62.8 kJ per mol.",
    ref: "https://bionumbers.hms.harvard.edu/bionumber.aspx?id=105354&ver=3" },

  // T1
  t1Scale: { label: "Scale factor on T1, setting availability", unit: "x",
    def: 1, lo: 0.1, hi: 10, uLo: 0.001, uHi: 1000, step: 0.1, tier: "B",
    hint: "Multiplies the workbook T1 range for every scenario at once. Use it to test how much the conclusion depends on the setting term.",
    ref: null },
  landUncertaintyFactor: { label: "Extra factor for scenarios needing subaerial land", unit: "x",
    def: 3, lo: 1, hi: 20, uLo: 1, uHi: 500, step: 0.5, tier: "C",
    hint: "How much longer you wait if the scenario needs land above sea level in the Hadean. How much land there was is genuinely contested, which is why this is a separate knob.",
    ref: null },

  // T2
  t2Scale: { label: "Scale factor on T2, chemistry", unit: "x",
    def: 1, lo: 0.1, hi: 10, uLo: 0.001, uHi: 1e6, step: 0.1, tier: "B",
    hint: "T2 is computed from the handoff table rather than assumed, so this factor exists only to stress test it. In every terrestrial scenario T2 stays negligible.",
    ref: null },

  // T3
  cycleName: { label: "Driving cycle", unit: "", def: "Day and night", tier: "A", kind: "select",
    hint: "The cycle that generates independent attempts. Its period is the denominator of the attempt rate.",
    ref: null },
  siteScale: { label: "Scale factor on the number of independent sites", unit: "x",
    def: 1, lo: 0.01, hi: 100, uLo: 1e-6, uHi: 1e9, step: 0.01, tier: "C",
    hint: "The site counts themselves are new to this model and are order of magnitude only. This factor lets you see how hard T3 depends on them.",
    ref: null },
  successesNeeded: { label: "Independent successes required", unit: "count",
    def: 1, lo: 1, hi: 100, uLo: 1, uHi: 1e6, step: 1, tier: "C",
    hint: "How many separate successful runs of the coincidence are needed before one of them takes hold. One is the most generous assumption.",
    ref: null },

  // T4
  generationTimeS: { label: "Generation time", unit: "s",
    def: 86400, lo: 3600, hi: 2592000, uLo: 600, uHi: 3.15e7, step: 3600, tier: "B",
    hint: "One day is a reasonable central value for a slow chemolithoautotroph. Modern sediment communities are much slower than laboratory cultures.",
    ref: null },
  popSize: { label: "Effective population size", unit: "count",
    def: 100000, lo: 1000, hi: 1e9, uLo: 10, uHi: 1e15, step: 1000, tier: "B",
    hint: "Neutral fixation takes of order the population size in generations, so this parameter sets the fixation time almost on its own.",
    ref: null },
  genFixFactor: { label: "Generations to fixation, as a multiple of population size", unit: "x",
    def: 4, lo: 1, hi: 20, uLo: 0.1, uHi: 1000, step: 0.5, tier: "B",
    hint: "Four times the effective population size is the standard result for a neutral allele. Selection makes it faster, drift in a structured population makes it slower.",
    ref: null },
  errorThresholdMyr: { label: "Time to cross the error threshold", unit: "Myr",
    def: 1, lo: 0.1, hi: 10, uLo: 0.001, uHi: 500, step: 0.1, tier: "B",
    hint: "Getting from a replicator that loses information each generation to one that keeps it. This and fixation are the two genuinely slow steps, and every scenario pays them.",
    ref: null },

  // S6a
  vesselLifetimeYr: { label: "Vessel lifetime", unit: "yr",
    def: 100000, lo: 1, hi: 1e7, uLo: 0.01, uHi: 1e9, step: 1, tier: "B",
    hint: "An impact-generated hydrothermal system runs for of order 100000 years. A pond may last a season.",
    ref: null },
  recycleTimeYr: { label: "Nutrient recycling time", unit: "yr",
    def: 10, lo: 0.01, hi: 10000, uLo: 1e-4, uHi: 1e6, step: 0.01, tier: "C",
    hint: "How long the community takes to turn its limiting nutrient over once. Modern microbial mats manage this in days to years.",
    ref: null },
  turnoversForEcosystem: { label: "Turnovers needed before it is an ecosystem", unit: "count",
    def: 1000, lo: 10, hi: 1e6, uLo: 1, uHi: 1e12, step: 10, tier: "C",
    hint: "New to this model and not measured anywhere. It is the number of recycling cycles needed before cross-feeding and functional differentiation can establish.",
    ref: null },

  // S6b
  burialTempC: { label: "Burial temperature", unit: "C",
    def: 60, lo: 0, hi: 600, uLo: -20, uHi: 900, step: 5, tier: "B",
    hint: "The average temperature the material sat at, not the peak. Above about 150 C the oil window closes. Isua peaked at 500 to 600 C.",
    ref: "https://www.whoi.edu/science/GG/geodynamics/2005/images2005/van%20Zuilen%20et%20al%202003.pdf" },
  rockAgeMyr: { label: "Age of the rock", unit: "Myr",
    def: 3700, lo: 1, hi: 4400, uLo: 0, uHi: 4600, step: 10, tier: "A",
    hint: "Isua is 3.7 to 3.8 Ga. The oldest Jack Hills zircons reach 4.4 Ga.",
    ref: "https://www.nature.com/articles/s43247-025-02215-2" },
  eaDegradation: { label: "Activation energy for degradation", unit: "kJ per mol",
    def: 63, lo: 40, hi: 120, uLo: 10, uHi: 300, step: 1, tier: "B",
    hint: "Raising this makes extrapolation to cold burial temperatures wildly optimistic, which is the single biggest weakness of any deep-time survival estimate. Watch what it does.",
    ref: "https://www.pnas.org/doi/10.1073/pnas.95.14.7933" },
};

export function defaultParams() {
  const p = {
    nearMode: "event", nearEventId: "water", nearManualGa: 4.40,
    farMode: "event", farEventId: "moody", farManualGa: 4.20,
    tempMode: "manual",
    coolingAnchors: COOLING_ANCHORS.map((a) => ({ ...a })),
    nearOptions: NEAR_OPTIONS, farOptions: FAR_OPTIONS,
    activeRungs: ["S1", "S2", "S3", "S4", "S5"],
    rungHandoff: { ...DEFAULT_RUNG_HANDOFF },
    allowUnreasonable: false,
  };
  for (const [k, s] of Object.entries(SPEC)) p[k] = s.def;
  return p;
}

export function isUnreasonable(key, value) {
  const s = SPEC[key];
  if (!s || s.kind === "select" || s.lo == null) return false;
  return value < s.lo || value > s.hi;
}
