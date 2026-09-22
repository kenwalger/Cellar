"""
Oracle for verdictDrift: for every consumption, the verdict under the window
in force when the bottle was opened, and the verdict under the window that
resolves as of NOW. Same rules as expected.py.
"""
import csv
from datetime import date
exec(open("expected.py").read().split("# pick bottles")[0])
NOW = date(2026, 9, 18)

def judge(when, w):
    if not w: return "UNKNOWN"
    if when < date(w["wf"], 1, 1): return "EARLY"
    if when <= date(w["wu"], 12, 31): return "IN_WINDOW"
    return "LATE"

rows = []
for b in sorted(con):
    when, wine = con[b]
    then_w, now_w = resolved(wine, when), resolved(wine, NOW)
    rows.append(dict(bottle=b, consumedOn=when.isoformat(),
        verdictThen=judge(when, then_w), verdictNow=judge(when, now_w),
        windowThen=then_w and f"{then_w['wf']}-{then_w['wu']} {then_w['tier']} {then_w['at']}" or "",
        windowNow=now_w and f"{now_w['wf']}-{now_w['wu']} {now_w['tier']} {now_w['at']}" or ""))
with open("expected-drift.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
drift = [r for r in rows if r["verdictThen"] != r["verdictNow"]]
print("consumptions:", len(rows), "| verdict changed since:", len(drift))
from collections import Counter
print(Counter((r["verdictThen"], r["verdictNow"]) for r in drift))
for r in drift[:6]: print(" ", r["bottle"], r["consumedOn"], r["verdictThen"], "->", r["verdictNow"])