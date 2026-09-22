"""
Brute-force oracle for missed opportunities. Evaluates state on every
calendar day of each period. Exhaustive, not sampled: state can only change
at day boundaries, so checking every day cannot miss a DRINKING interval.
Deliberately a different method from the boundary scan the module uses.
"""
import csv
from datetime import date, timedelta
exec(open("expected.py").read().split("# pick bottles")[0])  # reuse state()
NOW = date(2026, 9, 18)
PERIODS = [("2023", date(2023, 1, 1), date(2023, 12, 31)),
           ("2024", date(2024, 1, 1), date(2024, 12, 31))]
rows = []
for name, start, end in PERIODS:
    days = [start + timedelta(n) for n in range((end - start).days + 1)]
    for b in sorted(acq):
        if state(b, NOW)[0] != "PAST_WINDOW":
            continue
        if b in con and start <= con[b][0] <= end:
            continue
        if any(state(b, T)[0] == "DRINKING" for T in days):
            rows.append(dict(period=name, start=start, end=end, bottle=b, wine=acq[b][1]))
with open("expected-misses.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["period", "start", "end", "bottle", "wine"])
    w.writeheader(); w.writerows(rows)
from collections import Counter
print(Counter(r["period"] for r in rows))
print([r["bottle"] for r in rows if "foch" in r["bottle"] or "mouton" in r["bottle"]])