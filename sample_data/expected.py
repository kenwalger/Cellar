import csv
from collections import defaultdict
from datetime import date
TIERS = ["personal", "producer", "critic", "merchant", "other"]
d = lambda s: date(*map(int, s[:10].split("-")))
L = list(csv.DictReader(open("ledger.csv", encoding="utf-8")))
acq, con, ass = {}, {}, defaultdict(list)
for i, r in enumerate(L):
    if r["type"] == "acquire": acq[r["bottle"]] = (d(r["date"]), r["wine"])
    elif r["type"] == "consume": con[r["bottle"]] = (d(r["date"]), r["wine"])
    else: ass[r["wine"]].append(dict(at=d(r["date"]), tier=r["sourceType"],
          wf=int(r["drinkFrom"]), wu=int(r["drinkUntil"]), seq=i))

def resolved(wine, T):
    vis = [a for a in ass.get(wine, []) if a["at"] <= T]
    for t in TIERS:
        s = [a for a in vis if a["tier"] == t]
        if s: return max(s, key=lambda a: (a["at"], a["seq"]))

def state(b, T):
    if b not in acq or acq[b][0] > T: return "NOT_YET_OWNED", None
    if b in con and con[b][0] <= T: return "CONSUMED", None
    w = resolved(acq[b][1], T)
    if not w: return "UNASSESSED", None
    if T < date(w["wf"], 1, 1): return "HOLD", w
    if T <= date(w["wu"], 12, 31): return "DRINKING", w
    return "PAST_WINDOW", w

def verdict(b):
    when, wine = con[b]; w = resolved(wine, when)
    if not w: return "UNKNOWN", None, when
    if when < date(w["wf"], 1, 1): return "EARLY", w, when
    if when <= date(w["wu"], 12, 31): return "IN_WINDOW", w, when
    return "LATE", w, when

# pick bottles
M = "chateau-mouton-rothschild-grand-vin-1993"
F = "paradis-vineyards-estate-marechal-foch-2021"
NOW = date(2026, 9, 18)
fogh = next(b for b in sorted(acq) if b.startswith("farm-on-golden-hill-pinot") and b not in con
            and state(b, NOW)[0] == "PAST_WINDOW")
# unassessed wine, still unassessed on two test dates, opened later: UNASSESSED then UNKNOWN verdict
unas = next(b for b in sorted(acq) if acq[b][1] not in ass and b not in con)
unknown = next(b for b in sorted(acq) if acq[b][1] not in ass and b in con
               and acq[b][0] <= date(2023, 3, 15) < con[b][0])
# premium Pinot owned before its window opened: HOLD, then DRINKING
brooks = next(b for b in sorted(acq) if b.startswith("brooks-pinot-noir")
              and acq[b][0] <= date(2023, 3, 15)
              and state(b, date(2023, 3, 15))[0] == "HOLD"
              and state(b, date(2025, 6, 1))[0] == "DRINKING")
BOTTLES = [f"{M}-b", f"{M}-d", f"{F}-a", f"{F}-b", f"{F}-c", f"{F}-d",
           fogh, unas, unknown, "california-assorted-cabernet-sauvignon-2013-a", brooks]
DATES = [date(1999, 6, 1), date(2023, 3, 15), date(2025, 6, 1), NOW]
HAND = {f"{M}-b", f"{M}-d", f"{F}-a", f"{F}-b", f"{F}-c", f"{F}-d"}

rows = []
for b in BOTTLES:
    for T in DATES:
        s, w = state(b, T)
        rows.append(dict(kind="state", bottle=b, date=T.isoformat(), expected=s,
            windowFrom=w and f"{w['wf']}-01-01" or "", windowUntil=w and f"{w['wu']}-12-31" or "",
            windowSource=w and f"{w['tier']} {w['at']}" or "",
            check="by hand" if b in HAND else "check.py"))
for b in BOTTLES:
    if b in con:
        v, w, when = verdict(b)
        rows.append(dict(kind="verdict", bottle=b, date=when.isoformat(), expected=v,
            windowFrom=w and f"{w['wf']}-01-01" or "", windowUntil=w and f"{w['wu']}-12-31" or "",
            windowSource=w and f"{w['tier']} {w['at']}" or "",
            check="by hand" if b in HAND else "check.py"))

cols = ["kind", "bottle", "date", "expected", "windowFrom", "windowUntil", "windowSource", "check"]
with open("expected-states.csv", "w", newline="", encoding="utf-8") as f:
    wr = csv.DictWriter(f, fieldnames=cols); wr.writeheader(); wr.writerows(rows)
for r in rows:
    print(f"{r['kind']:<8}{r['bottle'][:48]:<49}{r['date']}  {r['expected']:<13}{r['windowFrom'][:4]}-{r['windowUntil'][:4]}  {r['windowSource']:<22}{r['check']}")