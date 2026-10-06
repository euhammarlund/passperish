#!/usr/bin/env python3
"""Validate /home/user/workspace/luca-model/data/model.json."""
import json, sys, unicodedata

PATH = "/home/user/workspace/luca-model/data/model.json"
KEYS = ["meta", "tiers", "speed_classes", "vocabulary", "rungs", "regimes",
        "envelope_events", "handoffs", "elements", "couplings", "chains", "cycles",
        "scenarios", "audit_method", "free_energy", "pi_examples",
        "measurement_gaps", "predictions", "references"]

# (a) parse
with open(PATH, encoding="utf-8") as f:
    data = json.load(f)
print("(a) json.loads: OK, %d bytes" % len(open(PATH, encoding='utf-8').read()))

# (b) keys present and non-empty
missing, empty = [], []
for k in KEYS:
    if k not in data:
        missing.append(k)
    elif not data[k]:
        empty.append(k)
assert not missing, "missing keys: %s" % missing
assert not empty, "empty keys: %s" % empty
extra = [k for k in data if k not in KEYS]
print("(b) all %d top-level keys present and non-empty. Extra keys: %s" % (len(KEYS), extra or "none"))

# (c) counts
print("(c) item counts per key:")
for k in KEYS:
    v = data[k]
    print("    %-18s %s" % (k, len(v) if isinstance(v, (list, dict, str)) else v))
print("    (chains) steps per chain: " +
      ", ".join("%s=%d" % (c["chain_name"], len(c["steps"])) for c in data["chains"]))
print("    (audit_method) terms: %d" % len(data["audit_method"]["terms"]))
print("    (references) rows with a URL: %d, rows with url null: %d" % (
    sum(1 for r in data["references"] if r["url"]),
    sum(1 for r in data["references"] if not r["url"])))

# (d) long-dash / Unicode dash-punctuation scan (category Pd) plus U+2212
hits = []


def walk(o, path):
    if isinstance(o, str):
        for i, ch in enumerate(o):
            if unicodedata.category(ch) == "Pd" and ch != "-":
                hits.append((path, "U+%04X" % ord(ch), o[max(0, i - 30):i + 30]))
            if ch == "\u2212":
                hits.append((path, "U+2212 MINUS SIGN", o[max(0, i - 30):i + 30]))
    elif isinstance(o, list):
        for i, x in enumerate(o):
            walk(x, "%s[%d]" % (path, i))
    elif isinstance(o, dict):
        for k, v in o.items():
            walk(v, "%s.%s" % (path, k))


walk(data, "$")
print("(d) Unicode dash scan (category Pd other than plain hyphen, plus U+2212): %d hit(s)" % len(hits))
for h in hits[:20]:
    print("    ", h)
sys.exit(1 if hits else 0)
