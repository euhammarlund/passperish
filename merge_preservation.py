import json, unicodedata, io

base = json.load(open("data/model.json", encoding="utf-8"))
pres = json.load(open("data/preservation.json", encoding="utf-8"))

# 1. append the S6 rung
if not any(r["id"] == "S6" for r in base["rungs"]):
    base["rungs"].append(pres["rung"])

# 2. attach the preservation block
base["preservation"] = {
    "gates": pres["gates"],
    "molecule_classes": pres["molecule_classes"],
    "why_refractory": pres["why_refractory"],
}

# 3. S6 grade per element: can we ever read this element's biological signal out of rock
s6 = {
  "H": ("h", "Hydrogen isotopes re-equilibrate with pore water and with metamorphic fluids, so no primary biological hydrogen signal survives from the Archean. The element that powers everything leaves the least trace.",
        []),
  "O": ("m", "Oxygen isotopes in silicates and carbonates do survive and are routinely measured, but they record temperature and water composition rather than biology, so the signal is preserved without being diagnostic.",
        []),
  "C": ("e", "The best preserved of all. Graphite and kerogen are chemically inert and their carbon isotope ratios survive to at least 3.7 Ga, through peak metamorphic temperatures of 500 to 600 C at Isua. Carbon is the reason we have any pre-3.5 Ga evidence at all.",
        ["https://www.nature.com/articles/s43247-025-02215-2", "https://ajsonline.org/article/116058-the-carbon-isotopic-composition-of-archean-kerogen-and-its-resilience-through-the-rock-cycle.pdf"]),
  "N": ("m", "Nitrogen isotopes in kerogen are measurable in Archean rocks, but nitrogen is lost preferentially during thermal maturation and the remaining ratio drifts, so the primary value has to be reconstructed rather than read.",
        []),
  "P": ("m", "Phosphorus survives as apatite, which is highly stable, but demonstrating that a given apatite is biological rather than diagenetic is very difficult, so the element is preserved while its biological attribution is not.",
        []),
  "S": ("e", "Sulfide and sulfate sulfur isotopes, and in particular the multiple sulfur isotope signature, survive to 3.5 Ga and beyond and are among the strongest biosignatures we have. Sulfur passes the preservation rung nearly as well as carbon.",
        []),
  "Fe": ("e", "Iron is locked into oxides, sulfides and carbonates that survive indefinitely, and iron isotopes in banded iron formation are readable. Iron passes every rung including this one, which is why the iron relay is the easiest story to tell and the easiest to test.",
        []),
  "Ni": ("m", "Nickel is retained in sediments and the nickel to iron ratio of Archean rocks is measurable and has been used to argue about methanogen abundance, but nickel has no isotopic biosignature that is clean enough to stand alone.",
        []),
  "Mg": ("h", "There is no preserved biological magnesium signal. Magnesium sits in carbonates and clays that exchange readily, so the substitution story between Fe(II) and Mg(2+) has to be argued from modern biochemistry and from laboratory ribozyme work rather than from rock.",
        []),
}
for el in base["elements"]:
    g, why, urls = s6.get(el["symbol"], ("m", "Not yet assessed for this model.", []))
    el["rungs"]["S6"] = g
    el["s6_why"] = "Tier C, new in this model: " + why
    el["s6_source_urls"] = urls

# 4. record the addition
base["meta"]["model_additions"] = (
    "This file extends the manuscript v5 dataset with the preservation rung S6 and its two gates "
    "(S6a ecosystem persistence, S6b rock-record preservation), an S6 grade and reason for every "
    "element, and per-scenario parallel-site counts. Everything new is tagged Tier C or carries its "
    "own tier and sources. S6 sits after S5 and does not consume the pre-LUCA budget: it is a filter "
    "on the evidence, not on life."
)
base["meta"]["preservation_note"] = pres["rung"]["description"]

# 5. dash scan
txt = json.dumps(base, ensure_ascii=False)
bad = sorted({c for c in set(txt) if (unicodedata.category(c) == "Pd" and c != "-") or c == "\u2212"})
print("long dashes:", bad or "none")

json.dump(base, open("data/model.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("rungs:", [r["id"] for r in base["rungs"]])
print("elements with S6:", sum(1 for e in base["elements"] if "S6" in e["rungs"]))
print("molecule classes:", len(base["preservation"]["molecule_classes"]))
print("keys:", len(base.keys()))
