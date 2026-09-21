import csv, random
from datetime import date, timedelta
from collections import defaultdict
random.seed(2023)
TIERS = ["personal", "producer", "critic", "merchant", "other"]
PROTECT = {"chateau-mouton-rothschild-grand-vin-1993",
           "paradis-vineyards-estate-marechal-foch-2021"}
TARGET_MOVES = 14
# Quiet first half, picking up toward the holidays.
MONTHS_2023 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
WEIGHTS_2023 = [0, 0, 1, 0, 1, 1, 1, 2, 2, 3, 5, 6]

d = lambda s: date(*map(int, s.split("-")))
L = list(csv.DictReader(open("ledger.csv", encoding="utf-8")))

def idx():
    acq, ass = {}, defaultdict(list)
    for i, r in enumerate(L):
        if r["type"] == "acquire": acq[r["bottle"]] = d(r["date"])
        elif r["type"] == "assess":
            ass[r["wine"]].append((d(r["date"]), r["sourceType"], int(r["drinkFrom"]), int(r["drinkUntil"]), i))
    return acq, ass

def res(ass, w, T):
    vis = [a for a in ass.get(w, []) if a[0] <= T]
    for t in TIERS:
        s = [a for a in vis if a[1] == t]
        if s: return max(s, key=lambda a: (a[0], a[4]))

acq, ass = idx()
cands = [i for i, r in enumerate(L) if r["type"] == "consume"
         and r["date"].startswith("2024-0") and r["wine"] not in PROTECT]
random.shuffle(cands)
moved = 0
for i in cands:
    if moved >= TARGET_MOVES: break
    r = L[i]; old = d(r["date"])
    dep = [j for j, a in enumerate(L) if a["type"] == "assess" and a["wine"] == r["wine"]
           and a["sourceType"] == "personal" and a["date"] == (old + timedelta(days=1)).isoformat()]
    for _ in range(30):
        m = random.choices(MONTHS_2023, weights=WEIGHTS_2023)[0]
        cand = date(2023, m, random.randint(1, 28))
        if cand < acq[r["bottle"]]: continue
        w = res(ass, r["wine"], cand)
        if w and date(w[2], 1, 1) <= cand <= date(w[3], 12, 31):
            r["date"] = cand.isoformat()
            for j in dep: L[j]["date"] = (cand + timedelta(days=1)).isoformat()
            moved += 1; acq, ass = idx(); break

L.sort(key=lambda r: (r["date"], r["type"], r["wine"], r["bottle"]))
cols = ["date","type","wine","bottle","sourceType","sourceName","drinkFrom","drinkUntil","note"]
with open("ledger.csv", "w", newline="", encoding="utf-8") as f:
    wr = csv.DictWriter(f, fieldnames=cols); wr.writeheader(); wr.writerows(L)
print("moved into 2023:", moved)