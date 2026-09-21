#!/usr/bin/env python3
"""
Applies the temporal resolution rules from docs/temporal-resolution.md to the
generated ledger and reports the current cellar state plus the eight demo
moments the seed data is supposed to guarantee.

This is a checking tool, not project code.
"""

import csv
from collections import defaultdict
from datetime import date

TODAY = date(2026, 9, 18)
TIERS = ["personal", "producer", "critic", "merchant", "other"]


def d(s):
    y, m, day = s.split("-")
    return date(int(y), int(m), int(day))


rows = list(csv.DictReader(open("ledger.csv", encoding="utf-8")))
wines = {w["wine_id"]: w for w in csv.DictReader(open("wines.csv", encoding="utf-8"))}

acq, con, ass = {}, {}, defaultdict(list)
for i, r in enumerate(rows):
    if r["type"] == "acquire":
        acq[r["bottle"]] = (d(r["date"]), r["wine"])
    elif r["type"] == "consume":
        con[r["bottle"]] = (d(r["date"]), r["wine"])
    elif r["type"] == "assess":
        ass[r["wine"]].append(dict(
            at=d(r["date"]), tier=r["sourceType"], name=r["sourceName"],
            wf=int(r["drinkFrom"]), wu=int(r["drinkUntil"]), seq=i,
        ))


def resolved(wine, T):
    vis = [a for a in ass.get(wine, []) if a["at"] <= T]
    for tier in TIERS:
        tset = [a for a in vis if a["tier"] == tier]
        if tset:
            return max(tset, key=lambda a: (a["at"], a["seq"]))
    return None


def state(bottle, T):
    if bottle not in acq or acq[bottle][0] > T:
        return "NOT_YET_OWNED", None
    if bottle in con and con[bottle][0] <= T:
        return "CONSUMED", None
    w = resolved(acq[bottle][1], T)
    if not w:
        return "UNASSESSED", None
    if T < date(w["wf"], 1, 1):
        return "HOLD", w
    if T <= date(w["wu"], 12, 31):
        return "DRINKING", w
    return "PAST_WINDOW", w


def verdict(bottle):
    when, wine = con[bottle]
    w = resolved(wine, when)
    if not w:
        return "UNKNOWN"
    if when < date(w["wf"], 1, 1):
        return "EARLY"
    if when <= date(w["wu"], 12, 31):
        return "IN_WINDOW"
    return "LATE"


counts = defaultdict(int)
for b in acq:
    counts[state(b, TODAY)[0]] += 1

print("=== Cellar today ===")
for k in ["HOLD", "DRINKING", "PAST_WINDOW", "UNASSESSED", "CONSUMED"]:
    print(f"  {k:<14} {counts[k]}")
print(f"  {'total bottles':<14} {len(acq)}")
print(f"  {'wines':<14} {len(wines)}")

vd = defaultdict(int)
for b in con:
    vd[verdict(b)] += 1
print("\n=== Verdicts ===")
for k, v in sorted(vd.items()):
    print(f"  {k:<14} {v}")

print("\n=== Demo moments ===")

regret = [b for b in acq if state(b, TODAY)[0] == "PAST_WINDOW"]
print(f"1. Regret set now: {len(regret)} bottles past window, unopened. "
      f"{'PASS' if len(regret) >= 3 else 'FAIL'}")

M23 = date(2023, 3, 15)
drinking23 = [b for b in acq if state(b, M23)[0] == "DRINKING"]
opened23 = [b for b in con if con[b][0].year == 2023]
print(f"2. March 2023: {len(drinking23)} at peak; {len(opened23)} opened all year. "
      f"{'PASS' if len(drinking23) >= 8 and len(opened23) < len(drinking23) / 3 else 'CHECK'}")

auth = 0
for wine, lst in ass.items():
    pers = [a for a in lst if a["tier"] == "personal"]
    crit = [a for a in lst if a["tier"] == "critic"]
    if pers and crit and max(c["at"] for c in crit) > max(p["at"] for p in pers):
        auth += 1
print(f"3. Personal beats a later critic: {auth} wines. "
      f"{'PASS' if auth >= 2 else 'FAIL'}")

loop = sum(1 for wine, lst in ass.items()
           if any(a["tier"] == "personal" for a in lst)
           and any(a["tier"] == "producer" for a in lst)
           and min((a["wu"] for a in lst if a["tier"] == "personal"), default=9999)
           < max((a["wu"] for a in lst if a["tier"] == "producer"), default=0))
print(f"4. Personal note shortened the window: {loop} wines. "
      f"{'PASS' if loop >= 1 else 'FAIL'}")

unassessed = [w for w in wines if w not in ass and any(v[1] == w for v in acq.values())]
print(f"5. Wines with bottles and no assessment: {len(unassessed)}. "
      f"{'PASS' if len(unassessed) >= 2 else 'FAIL'}")

spread = 0
byw = defaultdict(set)
for b in con:
    byw[con[b][1]].add(verdict(b))
spread = sum(1 for w, s in byw.items() if len(s & {"EARLY", "IN_WINDOW", "LATE"}) >= 3)
print(f"6. Wines showing EARLY/IN_WINDOW/LATE: {spread}. "
      f"{'PASS' if spread >= 1 else 'FAIL'}")

revised = 0
for b in con:
    when, wine = con[b]
    now_w = resolved(wine, TODAY)
    then_w = resolved(wine, when)
    if now_w and then_w and now_w["wu"] != then_w["wu"]:
        revised += 1
print(f"7. Bottles whose window was revised after opening: {revised}. "
      f"{'PASS' if revised >= 1 else 'FAIL'}")

bought_late = 0
for b, (when, wine) in acq.items():
    w = resolved(wine, when)
    if w and when > date(w["wu"], 12, 31):
        bought_late += 1
print(f"8. Bottles bought already past window: {bought_late}. "
      f"{'PASS' if bought_late >= 1 else 'FAIL'}")
