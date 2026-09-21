import csv, random
from datetime import date, timedelta
from collections import defaultdict
random.seed(20260919)
TODAY = date(2026, 9, 18)
TIERS = ["personal", "producer", "critic", "merchant", "other"]
MONTH_WEIGHT = [1, 1, 1, 1, 2, 2, 3, 3, 2, 2, 4, 5]
PROTECT_WINES = {"chateau-mouton-rothschild-grand-vin-1993",
                 "paradis-vineyards-estate-marechal-foch-2021"}
IMPATIENT = {"Could not wait. Tight, but good.",
             "Opened too young. Fruit is there, structure is not resolved.",
             "Impatient. Worth it anyway.",
             "Needed a bottle for dinner and this was in front."}
KEEP_EARLY_RATE = 0.08

d = lambda s: date(*map(int, s.split("-")))
L = list(csv.DictReader(open("ledger.csv", encoding="utf-8")))

def index():
    acq, ass = {}, defaultdict(list)
    for i, r in enumerate(L):
        if r["type"] == "acquire": acq[r["bottle"]] = d(r["date"])
        elif r["type"] == "assess":
            ass[r["wine"]].append((d(r["date"]), r["sourceType"], int(r["drinkFrom"]), int(r["drinkUntil"]), i))
    return acq, ass

def resolved(ass, wine, T):
    vis = [a for a in ass.get(wine, []) if a[0] <= T]
    for t in TIERS:
        s = [a for a in vis if a[1] == t]
        if s: return max(s, key=lambda a: (a[0], a[4]))
    return None

acq, ass = index()
moved = unconsumed = kept = 0
drop = set()
for i, r in enumerate(L):
    if r["type"] != "consume" or r["wine"] in PROTECT_WINES or r["note"] in IMPATIENT:
        continue
    when = d(r["date"]); w = resolved(ass, r["wine"], when)
    if not w or when >= date(w[2], 1, 1):
        continue
    if random.random() < KEEP_EARLY_RATE:
        kept += 1; continue
    # dependent personal reassessment dated the next day
    dep = [j for j, a in enumerate(L) if a["type"] == "assess" and a["wine"] == r["wine"]
           and a["sourceType"] == "personal" and a["date"] == (when + timedelta(days=1)).isoformat()]
    placed = False
    for _ in range(40):
        lo = max(acq[r["bottle"]], date(w[2], 1, 1))
        hi = min(TODAY, date(w[3], 12, 31))
        if hi <= lo: break
        y = random.randint(lo.year, hi.year)
        if y == 2023 and random.random() < 0.8: continue
        cand = date(y, random.choices(range(1, 13), weights=MONTH_WEIGHT)[0], random.randint(1, 28))
        if not (lo <= cand <= hi): continue
        cw = resolved(ass, r["wine"], cand)
        if cw and date(cw[2], 1, 1) <= cand <= date(cw[3], 12, 31):
            r["date"] = cand.isoformat()
            for j in dep: L[j]["date"] = (cand + timedelta(days=1)).isoformat()
            placed = True; moved += 1; break
    if not placed:
        # window has not opened yet: a sensible drinker would still be holding it
        drop.add(i); drop.update(dep); unconsumed += 1
    acq, ass = index()

L = [r for i, r in enumerate(L) if i not in drop]
L.sort(key=lambda r: (r["date"], r["type"], r["wine"], r["bottle"]))
cols = ["date","type","wine","bottle","sourceType","sourceName","drinkFrom","drinkUntil","note"]
with open("ledger.csv", "w", newline="", encoding="utf-8") as f:
    wr = csv.DictWriter(f, fieldnames=cols); wr.writeheader(); wr.writerows(L)
print(f"moved into window: {moved} | back in the cellar: {unconsumed} | left early on purpose: {kept}")