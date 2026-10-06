#!/usr/bin/env python3
"""Build /home/user/workspace/luca-model/data/model.json from the figure-data
workbook dump and manuscript_v5.md. All Excel formulas are computed here."""
import json, math, os, datetime, re

WS = "/home/user/workspace"
OUT = os.path.join(WS, "luca-model", "data", "model.json")
raw = json.load(open(os.path.join(WS, "workbook_raw.json")))

def sheet(name):
    return raw[name]

def num(x):
    if x is None or x == "":
        return None
    return float(x) if ("." in str(x) or "e" in str(x).lower()) else int(x)

# ---------------------------------------------------------------- URL registry
# Built from the References sheet so that every source_url below is a real URL
# transcribed from the workbook rather than typed by hand.
REF_ROWS = [r for r in sheet("References")[3:] if len(r) > 4 and (r[1] or r[2])]
U = {}
for r in REF_ROWS:
    title = (r[2] or "").strip()
    url = (r[4] or "").strip() or None
    if title:
        U[title] = url

def u(*titles):
    out = []
    for t in titles:
        v = U.get(t)
        if v and v not in out:
            out.append(v)
    return out

# convenience handles
URL = {
    "weiss": U["The physiology and habitat of the last universal common ancestor"],
    "dupont_pnas2006": U["History of biological metal utilization inferred through phylogenomic analysis of protein structures"],
    "dupont_metallome": U["History of biological metal utilization inferred from phylogenomic analysis of protein structures"],
    "sulfite": U["Sulfite constraints on the prebiotic sulfur cycle"],
    "eos": U["Eos on prebiotic sulfur cycling"],
    "ferrocyanide": U["Ferrocyanide formation"],
    "toner": U["Alkaline lake cyanide"],
    "hcn": U["Cyanide hydrolysis rate constants"],
    "nox": U["Nitrogen oxide concentrations in natural waters on early Earth"],
    "buessecker": U["Mineral-catalysed NO and N2O formation"],
    "ranjan_sasselov": U["Influence of the ultraviolet environment on the synthesis of prebiotic molecules"],
    "pasek": U["Rethinking early Earth phosphorus geochemistry"],
    "walton": U["Phosphorus availability on the early Earth"],
    "co2_electro": U["Electrochemical CO2 activation"],
    "fes001": U["Activating the FeS(001) surface for CO2 adsorption and reduction"],
    "kwawu": U["CO2 dissociation on Fe and Ni surfaces"],
    "hazen_surfaces": U["Mineral surfaces and the prebiotic selection and organization of biomolecules"],
    "hazen_hadean": U["Hadean palaeomineralogy"],
    "jerome": U["Catalytic synthesis of polyribonucleic acid on prebiotic rock glasses"],
    "fetene": U["Adsorptive removal of phosphate from wastewater using Ethiopian rift pumice"],
    "brasier": U["Pumice as a remarkable substrate for the origin of life"],
    "bryan": U["Rapid, long-distance dispersal by pumice rafting"],
    "moody": U["The nature of the last universal common ancestor and its impact on the early Earth system"],
    "abramov": U["Microbial habitability of the Hadean Earth during the late heavy bombardment"],
    "boehnke": U["Illusory late heavy bombardments"],
    "krissansen": U["Constraining the climate and ocean pH of the early Earth"],
    "impact": U["Impact sterilisation modelling"],
    "westall": U["Review of the earliest evidence for life"],
    "lunar": U["Lunar recession modelling"],
    "milankovitch": U["Milankovitch cycles in banded iron formations and Precambrian day length"],
    "gatenby": U["On the origin of information dynamics in early life"],
    "baaske": U["Extreme accumulation of nucleotides in simulated hydrothermal pore systems"],
    "heatflows": U["Heat flows enrich prebiotic building blocks"],
    "greenrust_chimney": U["Green rust chimneys concentrate RNA"],
    "rossdeamer": U["Dry-wet cycling and the thermodynamics and kinetics of prebiotic polymer synthesis"],
    "cockell": U["Ultraviolet radiation and the photobiology of Earth's early oceans"],
    "catling": U["The Archean atmosphere"],
    "robbins": U["Trace elements in Earth's oceans through time"],
    "moore": U["Metal availability and the expanding network of microbial metabolisms in the Archaean eon"],
    "williams": U["The Goldilocks problem of metal availability"],
    "mrnjavac": U["The nature of LUCA's metabolism and the transition to a cellular state"],
    "athavale": U["Nature of Fe(II) as the early divalent cation of nucleic acid chemistry"],
    "mgrna": U["Roles of magnesium and other divalent cations in RNA structure and catalysis"],
    "lightning": U["Lightning-induced interfacial electrochemistry"],
    "whicher": U["Acetyl phosphate as a primordial energy currency at the origin of life"],
    "wong": U["Nitrogen oxides in early Earth's atmosphere as electron acceptors for life's emergence"],
    "jones": U["Nitrite reduction by green rust and by dissolved Fe(II)"],
    "summers": U["Prebiotic ammonia from reduction of nitrite by iron(II) on the early Earth"],
    "es950844w": U["Green rust reduction of nitrate to ammonium"],
    "martin_russell": U["On the origin of biochemistry at an alkaline hydrothermal vent"],
    "grouptransfer": U["Group transfer potentials, standard free energies of hydrolysis"],
    "peptide_cost": U["Condensation of amino acids on mineral surfaces"],
    "bada": U["Exposed areas above sea level on Earth greater than 3.5 Ga"],
    "subaerial": U["Early subaerial emergence review"],
    "feulner": U["The faint young Sun problem"],
    "thresholds": U["Thresholds in origin-of-life scenarios"],
    "kimura": U["The average number of generations until fixation of a mutant gene in a finite population"],
    "wilde": U["Evidence from detrital zircons for the existence of continental crust and oceans on the Earth 4.4 Gyr ago"],
    "bell": U["Potentially biogenic carbon preserved in a 4.1 billion-year-old zircon"],
    "hassenkam": U["Elements of Eoarchaean life trapped in mineral inclusions"],
    "schoepp": U["The ineluctable requirement for the trans-iron elements molybdenum and tungsten in the origin and evolution of life"],
    "mow34": U["Biological use of molybdenum and tungsten stems back to 3.4 billion years"],
    "kurokawa": U["Cold and alkaline Hadean ocean"],
    "nakayama": U["Intercalation of amino acids and peptides into Mg-Al layered double hydroxide"],
    "erastova": U["Mineral surface alignment of amino acids on drying"],
    "gregoire": U["Peptide formation on brucite-like layers"],
    "nak": U["Sodium and potassium homeostasis and the potassium-rich origin hypothesis"],
    "mulkidjanian": U["Origin of first cells at terrestrial, anoxic geothermal fields"],
    "damkohler": U["Damkohler numbers"],
    "wetdry_pnas": U["Wet and dry cycling polymerises nucleic acid monomers"],
}
assert all(v for v in URL.values()), [k for k, v in URL.items() if not v]

model = {}

# ------------------------------------------------------------------------ meta
model["meta"] = {
    "title": "Pass or perish: rate-gated selective regimes on the Hadean Earth",
    "subtitle": "OR: What a 4.2 Ga LUCA tells us about the tempo of prebiotic selection",
    "manuscript_version": "v5",
    "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "notes": (
        "Machine-readable extraction of every sheet of the Pass-or-perish figure-data workbook "
        "(README, Vocabulary, Method_time_budgets, Fig1 to Fig8, Elements_considered, Pi_ratio, "
        "Measurement_gaps, References) plus prose definitions from manuscript_v5.md. Excel formulas "
        "in the workbook have been evaluated and stored as numbers. Wording is taken from the workbook "
        "and the manuscript wherever it exists. Conventions carried over from the workbook README: all "
        "times in seconds unless a field name says otherwise; Myr means million years; ranges are stored "
        "as separate low and high fields. Three fields are new to this model and are not in the workbook: "
        "scenarios.n_parallel_sites_low, scenarios.n_parallel_sites_high and scenarios.site_note (all "
        "Tier C, derived here from the reasoning text), measurement_gaps.linked_prediction (Tier C except "
        "for Gap 6, which the sheet itself ties to prediction 2), and references.tier (Tier C, assigned "
        "from the figures each source supports). Elements considered but not given a matrix row, with "
        "their reasons, are on the Elements_considered sheet of the workbook: tungsten and molybdenum and "
        "potassium are discussed in the text only, and cobalt, selenium, boron, zinc and copper are not "
        "carried, copper being kept as the control case for prediction 2. The elements array here holds "
        "the nine rows of the Figure 3 passage matrix. Verdict and ratio columns of Fig2, the cycle counts "
        "of Fig6, the component sums of Fig8 and the geometric mean block of Fig7 are live formulas in the "
        "workbook and are recomputed by the app from the stored inputs rather than stored as text."
    ),
}

# ----------------------------------------------------------------------- tiers
model["tiers"] = [
    {"id": "A", "label": "Tier A, real numbers",
     "definition": "Real numbers. Lifetimes, rate constants and fluxes of chemical species in water and in the atmosphere, taken from measured kinetics or from published photochemical models. These can be checked against a source."},
    {"id": "B", "label": "Tier B, order of magnitude only",
     "definition": "Order of magnitude only. The time needed to assemble a network, to fix a trait in a population, or for a whole scenario family to run. These exist only as ranges and are presented as ranges. They are explicit so that they can be argued with, not because they are precise."},
    {"id": "C", "label": "Tier C, derived for this model",
     "definition": "Not a tier used in the manuscript or the workbook. It marks the few values that were derived for this interactive model rather than transcribed from a source: the number of parallel sites per scenario, the prediction each measurement gap is linked to where the sheet does not say, and the tier assigned to each reference. Every Tier C value carries its reasoning in the record itself."},
]

# --------------------------------------------------------------- speed classes
model["speed_classes"] = [
    {"id": "class1", "label": "Class 1, effectively instantaneous, from microseconds to hours",
     "range_seconds_low": 1e-6, "range_seconds_high": 3600.0,
     "description": "These steps are fast because they are single chemical or physical events, and their rates are either measured or bounded by measurement. The important point about Class 1 is not that these steps are fast. It is that they are the steps the handoff criterion says are most at risk, and they are fast enough to beat destruction whenever the geometry is right."},
    {"id": "class2", "label": "Class 2, fast on human timescales, from days to thousands of years",
     "range_seconds_low": 86400.0, "range_seconds_high": 3.156e10,
     "description": "These are the accumulation steps, and they are slower than Class 1 because they depend on transport rather than on chemistry."},
    {"id": "class3", "label": "Class 3, genuinely slow, from a million years upwards",
     "range_seconds_low": 3.156e13, "range_seconds_high": None,
     "description": "Only two things in the sequence appear to require geological time, and both sit at the top of the ladder: crossing the error threshold and establishing heritability, which is the S4 to S5 chokepoint, and fixing a trait or an enzyme family in a population, for which the standard working estimates land at 10^6 to 10^7 years."},
]

# ------------------------------------------------------------------ vocabulary
VOC_WHAT = {
    1: "An element held in a host phase",
    2: "A dissolved species with an oxidation state",
    3: "A mineral or an inorganic cluster",
    4: "A monomer",
    5: "An activated monomer",
    6: "An oligomer",
    7: "A functional polymer",
    8: "A coded polymer",
}
model["vocabulary"] = []
for r in sheet("Vocabulary")[3:]:
    if len(r) < 6 or not r[1]:
        continue
    lvl = int(r[1])
    unit = (r[5] or "").strip()
    if unit == "no":
        note = "The unit of selection does not change here."
    else:
        note = "The unit of selection changes here: " + unit.replace("yes, ", "") + \
               ". At each of those three changes the loss clock resets, because the new object has a destruction route that has nothing to do with the destruction route of the old one."
    model["vocabulary"].append({
        "level": lvl,
        "name": (r[2] or "").strip(),
        "what_it_is": VOC_WHAT[lvl],
        "named_examples": [x.strip() for x in (r[3] or "").split(",") if x.strip()],
        "rungs_it_can_occupy": (r[4] or "").strip(),
        "note": note,
    })

# ----------------------------------------------------------------------- rungs
model["rungs"] = [
    {"id": "S0", "name": "availability and delivery", "from_reservoir": "host rock or atmosphere",
     "to_reservoir": "dissolved in water",
     "mechanism": "weathering, degassing and mixing, so it needs a source and a transport route",
     "loss_process": "nothing destroys it, but the supply can stop", "unit_selected": "elements and ions",
     "is_filter": True,
     "description": "A filter. It changes what is present in a place without any copying, any inheritance or any competition between variants."},
    {"id": "S1", "name": "thermodynamic partitioning", "from_reservoir": "one dissolved form",
     "to_reservoir": "another dissolved form",
     "mechanism": "redox and acid-base reaction, driven by free-energy differences",
     "loss_process": "back reaction to the stable form", "unit_selected": "speciation, minerals",
     "is_filter": True,
     "description": "A filter. It changes what is present in a place without any copying, any inheritance or any competition between variants."},
    {"id": "S2", "name": "kinetic persistence", "from_reservoir": "a reactive species",
     "to_reservoir": "the same species, still intact",
     "mechanism": "no transport at all, it only has to wait, which needs a kinetic barrier",
     "loss_process": "hydrolysis, photolysis, oxidation", "unit_selected": "compounds that survive",
     "is_filter": True,
     "description": "A filter. It changes what is present in a place without any copying, any inheritance or any competition between variants."},
    {"id": "S3", "name": "accumulation and concentration", "from_reservoir": "dilute solution",
     "to_reservoir": "a surface, a pore or a film",
     "mechanism": "adsorption, drying, thermophoresis, precipitation, so it needs a flux or a gradient",
     "loss_process": "dilution back into the bulk", "unit_selected": "local composition",
     "is_filter": True,
     "description": "A filter. A mineral surface that adsorbs one nucleotide and not another is filtering."},
    {"id": "S4", "name": "autocatalytic amplification", "from_reservoir": "separate building blocks",
     "to_reservoir": "one bonded assembly",
     "mechanism": "condensation on a surface or in a mineral interlayer, feeding a self-amplifying network",
     "loss_process": "hydrolysis of the new bond", "unit_selected": "network motifs",
     "is_filter": False,
     "description": "Selection proper, in that it changes relative abundance through differential propagation. A ribozyme that copies itself faster than its neighbour is being selected."},
    {"id": "S5", "name": "Darwinian selection", "from_reservoir": "one assembly",
     "to_reservoir": "many copies of it",
     "mechanism": "template copying, which needs heritable variation",
     "loss_process": "copying error, and loss of the template", "unit_selected": "genotypes, lineages",
     "is_filter": False,
     "description": "Selection proper, in that it changes relative abundance through differential propagation. Levels S4 and S5 are biology and are much harder to time."},
]

# --------------------------------------------------------------------- regimes
REGIME_SRC = {
    "R1": u("History of biological metal utilization inferred through phylogenomic analysis of protein structures",
            "Metal availability and the expanding network of microbial metabolisms in the Archaean eon",
            "Trace elements in Earth's oceans through time",
            "The Goldilocks problem of metal availability"),
    "R2": u("Ultraviolet radiation and the photobiology of Earth's early oceans",
            "Influence of the ultraviolet environment on the synthesis of prebiotic molecules",
            "The Archean atmosphere"),
    "R3": u("The physiology and habitat of the last universal common ancestor",
            "Activating the FeS(001) surface for CO2 adsorption and reduction"),
    "R4": u("The nature of the last universal common ancestor and its impact on the early Earth system",
            "On the origin of information dynamics in early life"),
}
model["regimes"] = []
for r in sheet("Fig7_regimes")[3:]:
    if len(r) < 11 or not (r[1] or "").startswith("R"):
        continue
    rid = r[1].strip()
    if rid not in REGIME_SRC:
        continue
    model["regimes"].append({
        "id": rid,
        "name": {"R1": "Availability", "R2": "Persistence", "R3": "Throughput", "R4": "Fidelity"}[rid],
        "conditions": r[2],
        "rungs_covered": r[3],
        "unit_selected": r[4],
        "expected_legacy": r[5],
        "what_is_selected": r[6],
        "duration_low_myr": num(r[7]),
        "duration_high_myr": num(r[8]),
        "why_that_long": r[9],
        "key_sources": [x.strip() for x in (r[10] or "").split(";") if x.strip()],
    })
# name field: regimes are unnamed in the workbook beyond R1 to R4; the names used
# here are the filter each regime applies, taken verbatim from the sheet's
# "What is actually being selected" column ("Availability is the filter." etc).

# ------------------------------------------------------------- envelope events
ENV_SRC = {
    "Hazen et al., Hadean palaeomineralogy": URL["hazen_hadean"],
    "Impact sterilisation modelling": URL["impact"],
    "Hazen et al.; Krissansen-Totton et al.": URL["hazen_hadean"],
    "Abramov and Mojzsis; Boehnke and Harrison": URL["abramov"],
    "Moody et al. 2024": URL["moody"],
    "Review of the earliest evidence for life": URL["westall"],
    "Derived, see Method_time_budgets": None,
}
model["envelope_events"] = []
for r in sheet("Fig1_timeline")[3:]:
    if len(r) < 8 or not r[1] or r[1].startswith("Duration is a live"):
        continue
    src = (r[7] or "").strip()
    model["envelope_events"].append({
        "label": r[1], "age_old_ga": num(r[2]), "age_young_ga": num(r[3]),
        "drawn_as": r[4], "type": r[5], "note": r[6], "source": src,
        "source_url": ENV_SRC.get(src),
    })

# ------------------------------------------------------------------- handoffs
HANDOFF_URLS = {
    "Weiss et al. 2016; Dupont et al.": [URL["weiss"], URL["dupont_pnas2006"]],
    "Ranjan et al., sulfite constraints; Eos summary": [URL["sulfite"], URL["eos"]],
    "Ferrocyanide formation; Toner and Catling": [URL["ferrocyanide"], URL["toner"]],
    "Cyanide hydrolysis rate constants": [URL["hcn"]],
    "Ranjan et al., nitrogen oxides; mineral-catalysed NO and N2O formation": [URL["nox"], URL["buessecker"]],
    "Ranjan and Sasselov": [URL["ranjan_sasselov"]],
    "Pasek; Walton et al.": [URL["pasek"], URL["walton"]],
    "Electrochemical CO2 activation": [URL["co2_electro"]],
    "Activating FeS(001); CO2 dissociation on Fe and Ni surfaces": [URL["fes001"], URL["kwawu"]],
    "Eiby 2025, chapters 2 and 3": [],
    "Hazen; Eiby 2025; Jerome et al. 2022": [URL["hazen_surfaces"], URL["jerome"]],
    "Fetene and Addis; Brasier et al. 2011; Jerome et al. 2022": [URL["fetene"], URL["brasier"], URL["jerome"]],
}
model["handoffs"] = []
n = 0
for r in sheet("Fig2_pass_or_perish")[3:]:
    if len(r) < 15 or not r[1] or r[1].startswith("Plotted position"):
        continue
    n += 1
    ks = (r[14] or "").strip()
    model["handoffs"].append({
        "id": "H%d" % n,
        "species_and_handoff": r[1],
        "marker_category": r[2],
        "tau_transfer_low_s": num(r[3]), "tau_transfer_high_s": num(r[4]),
        "tau_loss_low_s": num(r[5]), "tau_loss_high_s": num(r[6]),
        "tier": r[11], "speed_class": r[12], "why_this_value": r[13],
        "key_sources": [x.strip() for x in ks.split(";") if x.strip()],
        "source_urls": HANDOFF_URLS.get(ks, []),
    })

# -------------------------------------------------------------------- elements
ELEM_NAME = {"H": "hydrogen", "O": "oxygen", "C": "carbon", "N": "nitrogen", "P": "phosphorus",
             "S": "sulfur", "Fe": "iron", "Ni": "nickel", "Mg": "magnesium"}
ELEM_URLS = {
    "H": [URL["hazen_hadean"]],
    "O": [URL["krissansen"]],
    "C": [URL["fes001"], URL["kwawu"], URL["co2_electro"]],
    "N": [URL["nox"], URL["buessecker"], URL["wong"]],
    "P": [URL["walton"], URL["pasek"], URL["kurokawa"], URL["fetene"]],
    "S": [URL["sulfite"], URL["eos"]],
    "Fe": [URL["dupont_pnas2006"], URL["weiss"]],
    "Ni": [URL["mrnjavac"], URL["robbins"]],
    "Mg": [URL["athavale"], URL["mgrna"]],
}
gate = {}
for r in sheet("Fig4_couplings")[3:]:
    if len(r) < 7 or not r[1] or r[1].startswith("Three outcomes"):
        continue
    gate[r[1].strip()] = r
considered = {}
for r in sheet("Elements_considered")[3:]:
    if len(r) < 5 or not r[1]:
        continue
    considered[r[1].strip()] = r
RUNGKEYS = ["S0", "S1", "S2", "S3", "S4", "S5"]
model["elements"] = []
for r in sheet("Fig3_passage_matrix")[3:]:
    sym = (r[1] or "").strip()
    if sym not in ELEM_NAME:
        continue
    g = gate.get(sym)
    notes = ""
    if g:
        notes = ("Gate, the hardest rung: %s. What failure looks like: %s. Where the material returns to: %s. "
                 "Route through: %s" % (g[2], g[3], g[4], g[5]))
    if sym in considered:
        notes += " Status in this version: %s. %s" % (considered[sym][3], considered[sym][4])
    model["elements"].append({
        "symbol": sym,
        "name": ELEM_NAME[sym],
        "rungs": {k: r[2 + i] for i, k in enumerate(RUNGKEYS)},
        "hardest_rung": r[8],
        "why": r[9],
        "notes": notes.strip(),
        "source_urls": ELEM_URLS[sym],
    })

# ------------------------------------------------------------------- couplings
COUP_URLS = {
    "Mineral-catalysed NO and N2O formation; Ranjan et al.": [URL["buessecker"], URL["nox"]],
    "Activating FeS(001); lightning-induced electrochemistry": [URL["fes001"], URL["lightning"]],
    "Fe(II) as the early divalent cation; magnesium in RNA folding": [URL["athavale"], URL["mgrna"]],
    "Walton et al.; Pasek": [URL["walton"], URL["pasek"]],
}
model["couplings"] = []
seen = False
for r in sheet("Fig3_passage_matrix"):
    if len(r) > 1 and (r[1] or "").startswith("Coupling type"):
        seen = True
        continue
    if seen and len(r) >= 5 and r[1]:
        ks = (r[4] or "").strip()
        model["couplings"].append({
            "type": r[1], "elements": r[2], "what_it_does": r[3],
            "key_sources": [x.strip() for x in ks.split(";") if x.strip()],
            "source_urls": COUP_URLS.get(ks, []),
        })

# ---------------------------------------------------------------------- chains
CHAIN_URLS = {
    "https://onlinelibrary.wiley.com/doi/abs/10.1111/gbi.12572": None,
}
chains = {}
order = []
for r in sheet("Fig5_chains")[3:]:
    if len(r) < 6 or not r[1] or r[1].startswith("One row per chain"):
        continue
    ch = r[1].strip()
    if ch not in chains:
        chains[ch] = []
        order.append(ch)
    src = (r[6] if len(r) > 6 else "") or ""
    src = src.strip()
    chains[ch].append({
        "stage": r[2],
        "species": r[3],
        "what_happens": "Loss process that competes: %s" % r[4],
        "rung": (r[2] or "").split()[0],
        "note": "Currency that pays the step: %s" % r[5],
        "source_urls": [src] if src.startswith("http") else [],
    })
model["chains"] = [{"chain_name": c, "steps": chains[c]} for c in order]

# ---------------------------------------------------------------------- cycles
CYCLE_URLS = {
    "Ross and Deamer; Eiby 2025": [URL["rossdeamer"], URL["wetdry_pnas"]],
    "Milankovitch cycles in banded iron formations; Gatenby et al. 2025": [URL["milankovitch"], URL["gatenby"]],
    "Baaske et al.; heat flows enrich prebiotic building blocks": [URL["baaske"], URL["heatflows"]],
    "Lunar recession modelling": [URL["lunar"]],
    "Green rust chimneys; Hazen": [URL["greenrust_chimney"], URL["hazen_surfaces"]],
    "Bryan et al. 2012; Brasier et al. 2011": [URL["bryan"], URL["brasier"]],
}
model["cycles"] = []
for r in sheet("Fig6_cycles")[3:]:
    if len(r) < 8 or not r[1] or r[1].startswith("A 100 Myr budget"):
        continue
    low = num(r[3])
    high = num(r[4]) if (len(r) > 4 and r[4]) else low
    ks = (r[7] or "").strip()
    model["cycles"].append({
        "name": r[1],
        "hadean_period_s_low": low,
        "hadean_period_s_high": high,
        "today_period_s": num(r[2]),
        "rungs_served": r[5],
        "note": r[6],
        "source_urls": CYCLE_URLS.get(ks, []),
    })

# ------------------------------------------------------------------- scenarios
SITES = {
    "Alkaline hydrothermal vent": (1e3, 1e6,
        "a vent field is of order 10^3 to 10^6 independent mixing interfaces, since the sheet says these settings come in enormous numbers and recur constantly, and each chimney holds many separate pores a few micrometres apart"),
    "Subaerial wet and dry pools": (1.0, 1e3,
        "a subaerial pond is of order 1 to 10^3 vessels, since the Method_time_budgets sheet says a pond is one vessel and the amount of Hadean land above sea level is contested, so only a small number of pool fields can be assumed"),
    "Impact-generated hydrothermal system": (1e2, 1e5,
        "of order 10^2 to 10^5 sites, taken from the sheet's statement that impacts were frequent and each system runs for of order 10^5 years, so several hydrothermal fields with many pores each are live at any time"),
    "Pumice raft and tidal beaching": (1e12, 1e12,
        "of order 10^12 clasts per eruption, which the Fig8 and Method_time_budgets sheets state explicitly, and which is why T3 collapses for this family"),
    "Icy or eutectic concentration": (1.0, 1e3,
        "of order 1 to 10^3 brine pockets, a pond-like count, because sustained freezing is hard to arrange on a hot young planet so only a few such settings exist at once"),
    "Panspermia-assisted delivery": (1.0, 1e2,
        "of order 1 to 10^2 delivery attempts that matter, because only a small fraction of ejecta arrives viable, so the effective number of independent parallel sites at the receiving end is small even though the ejecta count is large"),
}
model["scenarios"] = []
k = 0
for r in sheet("Fig8_time_budget")[3:]:
    if len(r) < 18 or not r[1] or r[1].startswith("All four T columns"):
        continue
    name = r[1].strip()
    if name not in SITES:
        continue
    k += 1
    lo, hi, why = SITES[name]
    model["scenarios"].append({
        "id": "SC%d" % k,
        "name": name,
        "plotted_low_myr": num(r[2]), "plotted_high_myr": num(r[3]),
        "t1_low": num(r[4]), "t1_high": num(r[5]),
        "t2_low": num(r[6]), "t2_high": num(r[7]),
        "t3_low": num(r[8]), "t3_high": num(r[9]),
        "t4_low": num(r[10]), "t4_high": num(r[11]),
        "dominant_term": r[16],
        "reasoning": r[17],
        "requires_subaerial_land": name == "Subaerial wet and dry pools",
        "is_cold": name == "Icy or eutectic concentration",
        "n_parallel_sites_low": lo,
        "n_parallel_sites_high": hi,
        "site_note": "Tier C, derived for this model: not a workbook value and new to the model. "
                     "Order of magnitude count of independent parallel vessels or attempts, read off the "
                     "reasoning text for this row and the T3 definition on the Method_time_budgets sheet, "
                     "where T3 is the number of independent attempts needed divided by the rate at which "
                     "independent attempts are generated. Here " + why + ".",
    })

# ---------------------------------------------------------------- audit method
model["audit_method"] = {
    "terms": [
        {"id": "T1", "name": "Setting availability and recurrence",
         "what_it_measures": "How long you must wait for the physical setting to exist, and how often it comes back if a single instance is destroyed.",
         "how_estimated": "Vents and impact-driven systems are available essentially as soon as there is an ocean, so T1 is small. Subaerial pools need land above sea level, which is genuinely contested for the Hadean, so T1 is large. Cold eutectic settings need sustained freezing on a planet with a hot interior and a faint young Sun, so T1 is large.",
         "tier": "Tier B"},
        {"id": "T2", "name": "Chemistry, Class 1 and Class 2 steps",
         "what_it_measures": "The actual reaction and transport time, once the setting exists.",
         "how_estimated": "Class 1 steps run in microseconds to hours and Class 2 steps in days to thousands of years. Even a Class 2 step of 1000 years is 0.001 Myr, so T2 is negligible in every terrestrial scenario. This is the main result of Section 10: the chemistry is not what consumes the budget.",
         "tier": "Tier A for most steps"},
        {"id": "T3", "name": "Coincidence waiting time",
         "what_it_measures": "How long you must wait for several fast steps to occur in the same place, in the right order, before a flood, impact or dilution event resets the attempt. Read it as (number of independent attempts needed) divided by (rate at which independent attempts are generated).",
         "how_estimated": "This is the term that actually consumes a short budget. It falls when the number of independent vessels rises. A pond is one vessel. A pumice eruption supplies of order 10^12 clasts, which is why the raft scenario sits at the fast end even though each individual clast only stays afloat for about 20 months.",
         "tier": "Tier B"},
        {"id": "T4", "name": "Slow biological steps, Class 3",
         "what_it_measures": "Crossing the error threshold and establishing heritability, then fixing a trait or enzyme family in a population.",
         "how_estimated": "Standard estimates for fixation are 10^6 to 10^7 years, so 1 to 10 Myr. Every scenario pays this, so it sets the floor of about 1 Myr on the whole figure. No scenario can be faster than its slowest Class 3 step.",
         "tier": "Tier B"},
    ],
    "budget_note": "The available budget is arithmetic. 200 Myr is the interval from the end of the Moon-forming impact aftermath at about 4.40 Ga to a LUCA at 4.2 Ga: start 4.40 Ga, which is the first evidence of liquid water and the end of the Moon-forming impact aftermath at 4.36 Ga, end 4.2 Ga, the central LUCA estimate, so 4.40 minus 4.20 = 0.20 Gyr, about 200 Myr. 600 Myr is the same interval taken to a LUCA at 3.8 Ga: 4.40 minus 3.80 = 0.60 Gyr, about 600 Myr. Figure 8 shows both lines so the reader can see which scenarios depend on which date. The required duration is a sum of four terms, three of which are judgements, and the sum is then rounded to the nearest order of magnitude for the figure, which is why the plotted range and the component sum differ slightly.",
    "trials_note": "Number of trials in a budget is the budget in seconds divided by the period of the driving cycle. A 100 Myr budget is 3.156 x 10^15 s. Divided by a 20 hour Hadean day (7.2 x 10^4 s) that is about 4.4 x 10^10 diurnal cycles. Tides at about 7 x 10^3 s give roughly an order of magnitude more. This is the number that matters for driven chemistry, where the cycle powers the reaction, rather than the ratio Pi. A 200 Myr budget is 6.311 x 10^15 s.",
    "caveat": "One caveat that is stated in the manuscript and is worth repeating here: Figure 8 audits duration only. Passing the duration test is necessary but not sufficient. A scenario can fit the budget comfortably and still fail on other grounds, for example on whether it supplies a fast predictable cycle at all.",
}

# ----------------------------------------------------------------- free energy
FE = []
seen_hdr = False
for r in sheet("Method_time_budgets"):
    if len(r) > 1 and (r[1] or "").startswith("Currency") and len(r) > 2 and (r[2] or "").startswith("Reaction"):
        seen_hdr = True
        continue
    if not seen_hdr:
        continue
    if (r[1] or "").startswith("Live check"):
        break
    if len(r) < 4 or not r[1]:
        continue
    FE.append(r)
FE_VALS = {
    "about -105": (-105.0, "Reported as about -105 kJ per mole under conditions plausible for a serpentinising vent. This is by some distance the largest of the three currencies."),
    "about -31": (-31.0, "Approximate value, quoted in the manuscript as a thioester at roughly 31 kJ per mole."),
    "10 to 20": (15.0, "Cost side, not a payment. Reported as a range of 10 to 20 kJ per mole; the midpoint 15 is stored here and the range is the source value."),
}
model["free_energy"] = []
for r in FE:
    v = (r[3] or "").strip()
    if v in FE_VALS:
        val, note = FE_VALS[v]
    else:
        val, note = float(v), ""
    unit = (r[4] or "").strip() if len(r) > 4 else ""
    src = (r[5] or "").strip() if len(r) > 5 else ""
    if unit and unit != "kJ per mole":
        note = (note + " Unit as given in the workbook: " + unit + ".").strip()
    if (r[2] or "").startswith("cost of concentrating"):
        note = (note + " Computed rather than asserted: R times T times the natural logarithm of the "
                "concentration factor, divided by 1000, with R = 8.314 J per mole per kelvin, T = 298.15 K "
                "and a factor of 1000, which returns %.2f kJ per mole. It is the same value as three pH units "
                "across a membrane, because three pH units is a proton activity ratio of one thousand." %
                (8.314 * 298.15 * math.log(1000) / 1000)).strip()
    model["free_energy"].append({
        "currency": r[1], "reaction": r[2], "value_kj_per_mol": val,
        "note": note, "source_url": src if src.startswith("http") else None,
    })

model["free_energy"].append({
    "currency": "planetary gradient",
    "reaction": "RT ln(factor) in kJ per mole, live formula on the Method_time_budgets sheet",
    "value_kj_per_mol": round(8.314 * 298.15 * math.log(1000) / 1000, 2),
    "note": "Live check of the concentration cost, computed rather than asserted, with R = 8.314 J per mole per kelvin, T = 298.15 K and a concentration factor of 1000. It returns 17.1 kJ per mole, which is the same value as three pH units across a membrane, because three pH units is a proton activity ratio of one thousand. The equality is arithmetic, not a coincidence, and it is why a pH gradient and a concentration gradient are the same currency.",
    "source_url": None,
})

# ------------------------------------------------------------------ pi_examples
model["pi_examples"] = []
for r in sheet("Pi_ratio")[3:]:
    if len(r) < 7 or not r[1] or r[1].startswith("The rule imposed"):
        continue
    model["pi_examples"].append({
        "pair": r[1],
        "conditions_hold_yr": num(r[2]),
        "process_needs_yr": num(r[3]),
        "expected_imprint": r[5],
        "reading": r[6],
    })

# ------------------------------------------------------------ measurement gaps
GAP_PRED = {
    "Gap 1": "Tier C, derived for this model: prediction 5, rates and the cycle budget, because the gap sets the yield per wet and dry cycle.",
    "Gap 2": "Tier C, derived for this model: prediction 1, the iron against nitrogen coupling, because the gap decides whether fixed nitrogen is retained or destroyed.",
    "Gap 3": "Tier C, derived for this model: prediction 4, the handoff line, because the gap is a direct race between capture and loss.",
    "Gap 4": "Tier C, derived for this model: prediction 5, rates and the cycle budget, because the gap is a Class 2 yield at prebiotic phosphate concentrations.",
    "Gap 5": "Tier C, derived for this model: prediction 5, rates and the cycle budget, since it is the low yield of long polymers from wet and dry cycling where the manuscript says the pressure currently sits.",
    "Gap 6": "Prediction 2 and the composition axis, as stated on the Measurement_gaps sheet.",
}
model["measurement_gaps"] = []
for r in sheet("Measurement_gaps")[3:]:
    if len(r) < 6 or not (r[1] or "").startswith("Gap"):
        continue
    gid = r[1].strip()
    model["measurement_gaps"].append({
        "id": gid,
        "gap": "Rung affected: %s. What is already known: %s" % (r[2], r[3]),
        "why_it_matters": "Which audit term it moves: %s" % r[5],
        "what_would_settle_it": r[4],
        "linked_prediction": GAP_PRED[gid],
    })

# ----------------------------------------------------------------- predictions
model["predictions"] = [
    {"number": 1, "title": "Coupling: iron against nitrogen", "section": "Section 6.2",
     "expectation": "Because Fe(II) destroys fixed nitrogen, the deepest nitrogen machinery should be import-based, not fixation-based.",
     "broken_by": "an ancestral nitrogenase."},
    {"number": 2, "title": "Ordering of metals", "section": "Sections 6 and 8",
     "expectation": "Metal use in the most conserved enzyme families should follow the order in which those metals became available. Two cases are sharp enough to test on their own: tungsten is soluble in reduced water while molybdenum is not, so the oldest members of the relevant families should be tungsten-using (Schoepp-Cothenet et al.); and if Fe(II) was the early divalent cation, the switch to magnesium should track ocean oxygenation rather than any biological innovation.",
     "broken_by": "a conserved dependence on a metal that became bioavailable only after LUCA, a phylogeny placing molybdenum ancestral to tungsten, or a magnesium switch well before oxygen rose. The tungsten case is a live risk rather than a safe bet, because isotope work already traces use of both metals to at least 3.4 Ga."},
    {"number": 3, "title": "Gating of carbon", "section": "Section 6",
     "expectation": "Carbon fixation should always sit downstream of transition metal and sulfide chemistry.",
     "broken_by": "evidence for ancestral carbon fixation without metal sulfide catalysis."},
    {"number": 4, "title": "The handoff line, and photostability as its clearest case", "section": "Figure 2, Section 2",
     "expectation": "Species that plot below the diagonal should be absent from conserved biochemistry unless they had a storage route, and the sharpest version of that claim is about light: retained bases, chromophores and side chains should be more photostable than the prebiotic alternatives that were not retained.",
     "broken_by": "a retained species with no plausible store, or a systematic survey showing no photostability enrichment."},
    {"number": 5, "title": "Rates and the cycle budget", "section": "Sections 7.4 and 10",
     "expectation": "Steps we call Class 1 or Class 2 should be reproducible in the laboratory inside the stated timescales, and no required process may need more cycles than the budget allows, which is 10^10 to 10^11 for a diurnal process.",
     "broken_by": "a step we call fast that resists completion over years of cycling, or a required process shown to need more cycles than are available. The low yields of long polymers from wet and dry cycling (Eiby 2025) are where this pressure currently sits."},
    {"number": 6, "title": "Substrate test for glass", "section": "Section 9.1.1",
     "expectation": "Normalised per square metre of glass surface rather than per gram, silicic pumice should be a weaker polymerisation catalyst than mafic glass such as diabase (Jerome et al. 2022).",
     "broken_by": "pumice matching or beating mafic glass once surface area is controlled for, which would strengthen the pumice case rather than the framework. Either result is informative."},
    {"number": 7, "title": "Composition of the oldest carbonaceous inclusions", "section": "Sections 2 and 11.1",
     "expectation": "The framework says nitrogen passed by storage, that phosphorus was scarce in water but concentrated on surfaces, and that both were present in a working cell well before the oldest rocks we can read. Isua-type carbonaceous inclusions armoured in metamorphic minerals should therefore carry carbon bonded to nitrogen and to phosphate, which is what has been reported (Hassenkam et al. 2017).",
     "broken_by": "a larger, better-controlled survey of comparable inclusions showing nitrogen and phosphate systematically absent where carbon is present and demonstrably biogenic."},
    {"number": 8, "title": "The budget falsifier", "section": "Sections 2 and 11.1",
     "expectation": "A well-supported revision of LUCA to 3.9 Ga or younger relaxes the budget and re-admits the slow, land-dependent scenarios. We state in advance how we would update: the ladder, the handoff criterion and the couplings are unaffected, because they are about rates and not dates, but the audit in Figure 8 changes and the conclusion of Section 10 becomes weaker rather than wrong.",
     "broken_by": "This prediction is itself the falsifier for the audit: a well-supported LUCA date of 3.9 Ga or younger would relax the budget and re-admit the scenarios that Figure 8 currently excludes."},
]

# ------------------------------------------------------------------ references
TIER_B_FIGS = {"Fig 7", "Fig 8"}
model["references"] = []
i = 0
for r in REF_ROWS:
    authors = (r[1] or "").strip()
    title = (r[2] or "").strip()
    venue = (r[3] or "").strip() if len(r) > 3 else ""
    url = (r[4] or "").strip() if len(r) > 4 else ""
    figs = (r[5] or "").strip() if len(r) > 5 else ""
    supports = (r[6] or "").strip() if len(r) > 6 else ""
    if not title:
        continue
    i += 1
    parts = [p.rstrip(".") for p in [authors, title, venue] if p]
    used = [x.strip() for x in figs.split(",") if x.strip()]
    tier = "Tier B" if (used and all(x in TIER_B_FIGS for x in used)) else "Tier A"
    model["references"].append({
        "id": "R%d" % i,
        "citation": ". ".join(parts),
        "url": url if url else None,
        "used_in": used,
        "tier": tier,
        "note": supports,
    })

# --------------------------------------------------------------- dash scrubber
DASHES = {"\u2014": " to ", "\u2013": " to ", "\u2212": "-", "\u2012": " to ",
          "\u2011": "-", "\u2010": "-", "\u2015": " to ", "\u2043": "-",
          "\u2e3a": " to ", "\u2e3b": " to ", "\uff0d": "-", "\u00ad": ""}

def scrub(o):
    if isinstance(o, str):
        for k, v in DASHES.items():
            o = o.replace(k, v)
        return re.sub(r"\s{2,}", " ", o).strip() if "\n" not in o else o
    if isinstance(o, list):
        return [scrub(x) for x in o]
    if isinstance(o, dict):
        return {k: scrub(v) for k, v in o.items()}
    return o

model = scrub(model)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(model, f, indent=2, ensure_ascii=False)
print("wrote", OUT)
for k, v in model.items():
    print(" ", k, len(v) if isinstance(v, (list, dict)) else type(v).__name__)
