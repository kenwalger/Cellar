#!/usr/bin/env python3
"""
Generates wines.csv and ledger.csv for The Cellar seed data.

The ledger is a chronological event log. One row per event, date ordered.
Types: acquire, assess, consume.

Everything here is a starting point to be edited against reality. Producers
and wines are real; vintages, windows, critic names, and tasting notes are
invented.
"""

import csv
import random
from datetime import date, timedelta

random.seed(20260918)

TODAY = date(2026, 9, 18)

# ---------------------------------------------------------------- vintages

# Willamette Valley vintage character. Quality drives window length.
VINTAGE = {
    2012: ("excellent", "ripe and generous, built to age"),
    2013: ("difficult", "harvest rain, lighter and earlier drinking"),
    2014: ("excellent", "warm and generous"),
    2015: ("very good", "hot and early, forward fruit"),
    2016: ("very good", "warm and early"),
    2017: ("excellent", "cooler and classic, elegant structure"),
    2018: ("excellent", "warm with real structure"),
    2019: ("variable", "cool and wet, producer-dependent"),
    2020: ("smoke", "wildfire smoke, most Pinot declassified or not bottled"),
    2021: ("very good", "June heat dome, concentrated"),
    2022: ("very good", "April frost, small crop, high quality"),
    2023: ("good", "warm, large crop, approachable"),
    2024: ("very good", "even season, balanced"),
    2025: ("good", "early picks, fruit forward"),
}

QUALITY_BONUS = {
    "excellent": 3, "very good": 2, "good": 1,
    "variable": 0, "difficult": -1, "smoke": -2,
}

# varietal: (release lag years, base drink-from offset, base drink-until offset)
VARIETAL = {
    "Pinot Noir":        (2, 3, 9),
    "Marechal Foch":     (1, 1, 5),
    "Pinot Gris":        (1, 0, 3),
    "Riesling":          (1, 1, 11),
    "Chardonnay":        (2, 2, 8),
    "Rose of Pinot Noir": (1, 0, 2),
    "Rose":              (1, 0, 2),
    "Tannin's Blend":    (2, 2, 8),
    "Fortissimo":        (2, 3, 15),
    "Zinfandel":         (2, 2, 8),
    "Cabernet Sauvignon": (2, 3, 12),
}

# --------------------------------------------------------------- producers

PRODUCERS = {
    "Vitis Ridge": dict(
        region="Willamette Valley", appellation="Willamette Valley",
        start=2021, end=2026, per_year=4, bottles=6,
        wines=["Pinot Noir", "Marechal Foch", "Pinot Gris", "Riesling",
               "Chardonnay", "Rose of Pinot Noir", "Tannin's Blend",
               "Fortissimo"],
    ),
    "Paradis Vineyards": dict(
        region="Willamette Valley", appellation="Willamette Valley",
        start=2021, end=2026, per_year=4, bottles=6,
        wines=["Pinot Noir", "Pinot Gris", "Riesling", "Marechal Foch"],
    ),
    "Farm on Golden Hill": dict(
        region="Willamette Valley", appellation="Willamette Valley",
        start=2024, end=2025, per_year=3, bottles=6,
        wines=["Pinot Noir", "Chardonnay", "Rose", "Riesling"],
    ),
    "Brooks": dict(
        region="Willamette Valley", appellation="Eola-Amity Hills",
        start=2014, end=2022, per_year=4, bottles=6,
        wines=["Pinot Noir", "Riesling"],
    ),
    "St. Josef's": dict(
        region="Willamette Valley", appellation="Willamette Valley",
        start=2022, end=2026, per_year=1, bottles=2,
        wines=["Pinot Noir"],
    ),
}

CRITICS = [
    "Cascadia Wine Review",
    "The Vintner's Ledger",
    "Northwest Cellar Notes",
    "Pacific Vintage Quarterly",
]

# ------------------------------------------------------------------ notes

NOTES = {
    "Pinot Noir": [
        "Red cherry, forest floor, fine tannin. Still tight.",
        "Opened up after an hour. Cranberry and dried herb.",
        "Silky. Drinking well right now.",
        "Earthier than I remembered. Good with the mushroom pasta.",
        "Fruit starting to dry out at the edges.",
        "Bright acid, light on its feet.",
        "Structured. Could have waited another two years.",
        "",
    ],
    "Marechal Foch": [
        "Dark and grapey. Not subtle, not trying to be.",
        "Blackberry, a little smoke. Good burger wine.",
        "Fading. Drink the rest soon.",
        "",
    ],
    "Pinot Gris": [
        "Pear and citrus. Crisp.",
        "Fine on the porch. Nothing to think about.",
        "Losing its edge, a bit flabby.",
        "",
    ],
    "Riesling": [
        "Off-dry, lime and petrol. Excellent.",
        "Still tastes young. Years left in this.",
        "Great acid. Held up better than expected.",
        "Honeyed now. Turning the corner but lovely.",
        "",
    ],
    "Chardonnay": [
        "Apple, light oak. Balanced.",
        "More oak than I want these days.",
        "Nutty, rounding out.",
        "",
    ],
    "Rose of Pinot Noir": [
        "Strawberry, dry finish. Summer wine, drink young.",
        "Past it. Should have opened this last year.",
        "",
    ],
    "Rose": [
        "Pale, crisp, gone in twenty minutes.",
        "Flat. Too old for a rose.",
        "",
    ],
    "Tannin's Blend": [
        "Big and chewy. Needs food.",
        "Settling down nicely.",
        "",
    ],
    "Fortissimo": [
        "Rich, sweet, good with the blue cheese.",
        "A small glass is plenty. Lovely.",
        "",
    ],
    "Zinfandel": [
        "Jammy, high alcohol, exactly what it says.",
        "Brambly and warm. Good on a cold night.",
        "",
    ],
    "Cabernet Sauvignon": [
        "Cassis and cedar. Solid.",
        "Grocery store cab doing grocery store cab things.",
        "Surprisingly good for what it cost.",
        "Dried out. Held it too long.",
        "",
    ],
}


def slug(text):
    keep = "".join(c.lower() if c.isalnum() else "-" for c in text)
    while "--" in keep:
        keep = keep.replace("--", "-")
    return keep.strip("-")


def window(varietal, vintage):
    lag, base_from, base_until = VARIETAL[varietal]
    quality = VINTAGE.get(vintage, ("good", ""))[0]
    bonus = QUALITY_BONUS[quality]
    start = vintage + max(1, base_from + (1 if bonus >= 3 else 0))
    end = vintage + max(start - vintage + 1, base_until + bonus)
    return start, end


wines = {}          # wine_id -> dict
ledger = []         # event rows
bottle_seq = {}


def wine_id_for(producer, varietal, vintage):
    wid = f"{slug(producer)}-{slug(varietal)}-{vintage}"
    if wid not in wines:
        f, u = window(varietal, vintage)
        wines[wid] = dict(
            wine_id=wid,
            producer=producer,
            cuvee=varietal,
            vintage=vintage,
            varietal=varietal,
            appellation=PRODUCERS.get(producer, {}).get("appellation", ""),
            region=PRODUCERS.get(producer, {}).get("region", ""),
            color=("white" if varietal in ("Pinot Gris", "Riesling", "Chardonnay")
                   else "rose" if "Rose" in varietal
                   else "red"),
            _wf=f, _wu=u,
        )
    return wid


def new_bottle(wid):
    n = bottle_seq.get(wid, 0)
    bottle_seq[wid] = n + 1
    return f"{wid}-{chr(ord('a') + n) if n < 26 else str(n)}"


def add(d, kind, wid="", bottle="", src_type="", src_name="",
        wf="", wu="", note=""):
    ledger.append(dict(
        date=d.isoformat(), type=kind, wine=wid, bottle=bottle,
        sourceType=src_type, sourceName=src_name,
        drinkFrom=wf, drinkUntil=wu, note=note,
    ))


# --------------------------------------------------- club shipment history

SHIP_MONTHS = {4: [3, 6, 9, 12], 3: [4, 8, 12], 1: [10]}

acquired = []   # (bottle, wid, acquire_date, varietal)

for producer, cfg in PRODUCERS.items():
    for year in range(cfg["start"], cfg["end"] + 1):
        for month in SHIP_MONTHS[cfg["per_year"]]:
            ship = date(year, month, random.randint(8, 22))
            if ship > TODAY:
                continue
            picks = random.sample(cfg["wines"], min(3, len(cfg["wines"])))
            per = max(1, cfg["bottles"] // len(picks))
            for varietal in picks:
                lag = VARIETAL[varietal][0]
                vintage = year - lag
                # No Willamette Pinot from the 2020 smoke vintage.
                if vintage == 2020 and varietal in ("Pinot Noir", "Rose of Pinot Noir", "Rose"):
                    vintage = 2019
                if vintage not in VINTAGE:
                    continue
                wid = wine_id_for(producer, varietal, vintage)
                for _ in range(per):
                    b = new_bottle(wid)
                    add(ship, "acquire", wid, b, "", "winery club")
                    acquired.append((b, wid, ship, varietal))

# ------------------------------------------------- gifts and grocery buys

LODI = ["Zinfandel"]
CA_CAB = ["Cabernet Sauvignon"]

for year in range(2016, 2027):
    for _ in range(random.randint(1, 3)):
        when = date(year, random.randint(1, 12), random.randint(1, 28))
        if when > TODAY:
            continue
        if random.random() < 0.5:
            producer, varietal = "Lodi (assorted)", "Zinfandel"
        else:
            producer, varietal = "California (assorted)", "Cabernet Sauvignon"
        vintage = year - random.randint(1, 4)
        if vintage not in VINTAGE:
            vintage = year - 2
        wid = wine_id_for(producer, varietal, vintage)
        for _ in range(random.choice([1, 1, 2])):
            b = new_bottle(wid)
            add(when, "acquire", wid, b, "",
                random.choice(["gift", "grocery store"]))
            acquired.append((b, wid, when, varietal))

# ------------------------------------------------------ producer releases

for wid, w in list(wines.items()):
    if w["producer"] in ("Lodi (assorted)", "California (assorted)"):
        continue
    rel = date(w["vintage"] + VARIETAL[w["varietal"]][0], random.randint(3, 9), 12)
    if rel > TODAY:
        continue
    add(rel, "assess", wid, "", "producer", w["producer"],
        w["_wf"], w["_wu"],
        f"Release notes. {VINTAGE[w['vintage']][1].capitalize()}.")

# -------------------------------------------------------- critic coverage

for wid, w in list(wines.items()):
    if random.random() > 0.35:
        continue
    if w["producer"] in ("Lodi (assorted)", "California (assorted)"):
        continue
    critic = random.choice(CRITICS)
    when = date(w["vintage"] + VARIETAL[w["varietal"]][0] + random.randint(0, 2),
                random.randint(1, 12), random.randint(1, 28))
    if when > TODAY:
        continue
    shift = random.choice([-1, 0, 0, 1, 2])
    add(when, "assess", wid, "", "critic", critic,
        w["_wf"], w["_wu"] + shift,
        f"{VINTAGE[w['vintage']][1].capitalize()}.")

# ------------------------------------------------------------ consumption

# Quiet stretch: 2023 was busy, very little got opened.
YEAR_RATE = {
    2014: 0.90, 2015: 0.90, 2016: 0.90, 2017: 0.90, 2018: 0.90,
    2019: 0.90, 2020: 0.92, 2021: 0.88, 2022: 0.85, 2023: 0.22,
    2024: 0.85, 2025: 0.80, 2026: 0.55,
}

MONTH_WEIGHT = [1, 1, 1, 1, 2, 2, 3, 3, 2, 2, 4, 5]  # holidays and summer

consumed = {}

for bottle, wid, acq, varietal in acquired:
    w = wines[wid]
    peak = date(w["_wf"], 6, 1)
    target = max(acq, peak) + timedelta(days=random.randint(0, 900))
    if target > TODAY:
        continue
    rate = YEAR_RATE.get(target.year, 0.6)
    if random.random() > rate:
        continue
    month = random.choices(range(1, 13), weights=MONTH_WEIGHT)[0]
    when = date(target.year, month, random.randint(1, 28))
    if when < acq or when > TODAY:
        continue
    consumed[bottle] = when
    add(when, "consume", wid, bottle, "", "",
        note=random.choice(NOTES.get(varietal, [""])))

# Second pass: bottles well past their window mostly did get drunk at some
# point. Anything still held more than two years past window end is swept up,
# leaving a small deliberate regret set.
for bottle, wid, acq, varietal in acquired:
    if bottle in consumed:
        continue
    w = wines[wid]
    end = date(w["_wu"], 12, 31)
    if end > TODAY - timedelta(days=730):
        continue
    if random.random() > 0.88:
        continue
    span_start = max(acq, date(w["_wf"], 1, 1))
    span_end = min(TODAY, end + timedelta(days=550))
    if span_end <= span_start:
        continue
    when = span_start + timedelta(days=random.randint(0, (span_end - span_start).days))
    if when.year == 2023 and random.random() < 0.75:
        continue
    consumed[bottle] = when
    add(when, "consume", wid, bottle, "", "",
        note=random.choice(NOTES.get(varietal, [""])))

# ------------------------------------------------- personal reassessments

reassessed = set()
for bottle, when in sorted(consumed.items(), key=lambda kv: kv[1]):
    wid = bottle.rsplit("-", 1)[0]
    if wid in reassessed or random.random() > 0.22:
        continue
    w = wines[wid]
    reassessed.add(wid)
    shift = random.choice([-3, -2, -1, 1, 2])
    add(when + timedelta(days=1), "assess", wid, "", "personal", "me",
        w["_wf"], max(w["_wf"] + 1, w["_wu"] + shift),
        "Reassessed after opening one.")

# ============================================================ engineered
# Hand-specified cases. These carry the demo moments the generated history
# does not reliably produce.

# --- 1993 Chateau Mouton Rothschild, Balthus label -----------------------
# Bought on release in 1996, delayed by the label controversy. Two opened in
# the nineties, four untouched since. The last personal assessment is from
# 1999, which under ADR 0006 still outranks every critic note written since.
MOUTON = "chateau-mouton-rothschild-grand-vin-1993"
wines[MOUTON] = dict(
    wine_id=MOUTON, producer="Chateau Mouton Rothschild",
    cuvee="Grand Vin", vintage=1993, varietal="Cabernet Sauvignon",
    appellation="Pauillac", region="Bordeaux", color="red",
    _wf=1999, _wu=2012,
)
for i in range(6):
    add(date(1996, 5, 18), "acquire", MOUTON, f"{MOUTON}-{chr(ord('a') + i)}",
        "", "retail, delayed release")
add(date(1996, 6, 3), "assess", MOUTON, "", "critic", "The Vintner's Ledger",
    1999, 2015, "Rain-affected vintage. Approachable early, not a long-haul "
                "bottle by Pauillac standards.")
add(date(1996, 11, 9), "consume", MOUTON, f"{MOUTON}-a", "", "",
    note="First one. Very impressed. Cassis, graphite, real length. Young but "
         "already giving.")
add(date(1996, 11, 10), "assess", MOUTON, "", "personal", "me",
    1998, 2018, "Better than the vintage's reputation suggests.")
add(date(1999, 3, 20), "consume", MOUTON, f"{MOUTON}-b", "", "",
    note="Blind, against several much cheaper bottles. It did not win. Sobering "
         "and useful. Price is not quality.")
add(date(1999, 3, 21), "assess", MOUTON, "", "personal", "me",
    1998, 2012, "Revising down after the blind tasting. Good wine, not a great "
                "one, and not one to hold for decades.")
add(date(2008, 9, 14), "assess", MOUTON, "", "critic", "Pacific Vintage Quarterly",
    1999, 2020, "Retrospective. Well-stored examples still showing.")
add(date(2019, 2, 11), "assess", MOUTON, "", "critic", "Cascadia Wine Review",
    1999, 2022, "Late look. Tertiary but sound from good provenance.")

# --- Impatience: bottles opened before the window opened -----------------
early_pool = [(b, wid, acq_d, v) for (b, wid, acq_d, v) in acquired
              if b not in consumed and wines[wid]["_wf"] > acq_d.year]
random.shuffle(early_pool)
for b, wid, acq_d, v in early_pool[:18]:
    w = wines[wid]
    when = date(acq_d.year + random.choice([0, 0, 1]),
                random.choices(range(1, 13), weights=MONTH_WEIGHT)[0],
                random.randint(1, 28))
    if when < acq_d or when > TODAY or when >= date(w["_wf"], 1, 1):
        continue
    consumed[b] = when
    add(when, "consume", wid, b, "", "",
        note=random.choice([
            "Could not wait. Tight, but good.",
            "Opened too young. Fruit is there, structure is not resolved.",
            "Impatient. Worth it anyway.",
            "Needed a bottle for dinner and this was in front.",
        ]))

# --- Late critic retrospectives, so authority beats recency --------------
personal_by_wine = {}
for r in ledger:
    if r["type"] == "assess" and r["sourceType"] == "personal":
        prev = personal_by_wine.get(r["wine"])
        if prev is None or r["date"] > prev:
            personal_by_wine[r["wine"]] = r["date"]
have_personal = list(personal_by_wine)
random.shuffle(have_personal)
for wid in have_personal[:9]:
    w = wines[wid]
    y, m, dd = personal_by_wine[wid].split("-")
    latest_personal = date(int(y), int(m), int(dd))
    when = latest_personal + timedelta(days=random.randint(120, 600))
    if when > TODAY:
        continue
    add(when, "assess", wid, "", "critic", random.choice(CRITICS),
        w["_wf"], w["_wu"] + random.choice([2, 3, 4]),
        "Retrospective tasting. More life left than earlier notes suggested.")

# --- One wine showing all three verdicts ---------------------------------
# An estate bottling the producer called long-lived and that faded fast.
# Six bottles: one opened too early, one in window, one after a personal
# reassessment had closed the window, three still sitting past it.
FOCH = "paradis-vineyards-estate-marechal-foch-2021"
wines[FOCH] = dict(
    wine_id=FOCH, producer="Paradis Vineyards", cuvee="Estate Marechal Foch",
    vintage=2021, varietal="Marechal Foch", appellation="Willamette Valley",
    region="Willamette Valley", color="red", _wf=2023, _wu=2027,
)
add(date(2022, 4, 8), "assess", FOCH, "", "producer", "Paradis Vineyards",
    2023, 2027, "Estate block. Built to hold longer than the regular bottling.")
for i in range(6):
    add(date(2022, 4, 20), "acquire", FOCH, f"{FOCH}-{chr(ord('a') + i)}",
        "", "winery club")
add(date(2022, 7, 30), "consume", FOCH, f"{FOCH}-a", "", "",
    note="Opened on the deck before it was ready. Grapey, a little raw.")
add(date(2024, 2, 20), "consume", FOCH, f"{FOCH}-b", "", "",
    note="Much better. Blackberry, soft tannin. This is the peak.")
add(date(2024, 2, 21), "assess", FOCH, "", "personal", "me",
    2023, 2024, "Lovely now, but the fruit is already receding. This is not "
                "a 2027 wine whatever the estate says. Drink through 2024.")
add(date(2025, 9, 6), "consume", FOCH, f"{FOCH}-c", "", "",
    note="Should have listened to myself. Thin and drying. Three left.")

# --- The Farm on Golden Hill problem -------------------------------------
# Beautiful venue, distinct peanut aroma running through the wines. The club
# was dropped in 2025. The bottles are still in the rack, going past window
# unopened, which is most of the regret set's story.
fogh = sorted(w for w in wines if w.startswith("farm-on-golden-hill"))
for i, wid in enumerate(fogh):
    w = wines[wid]
    when = date(2025, 4 + (i % 6), random.randint(1, 28))
    if when > TODAY:
        continue
    add(when, "assess", wid, "", "personal", "me",
        w["_wf"], max(w["_wf"], w["_wf"] + 1),
        "Same peanut note as the others. Roasted, oily, sits on the finish. "
        "Not going to improve with time. Drink or pour out.")
if fogh:
    add(date(2025, 9, 14), "assess", fogh[0], "", "personal", "me",
        wines[fogh[0]]["_wf"], wines[fogh[0]]["_wf"],
        "Cancelled the club today. Lovely place to sit, wine I do not reach "
        "for.")

# --- Bought already past window -----------------------------------------
for producer, varietal, vintage, when in [
    ("California (assorted)", "Cabernet Sauvignon", 2013, date(2024, 8, 17)),
    ("Lodi (assorted)", "Zinfandel", 2015, date(2025, 3, 22)),
]:
    wid = wine_id_for(producer, varietal, vintage)
    w = wines[wid]
    add(date(vintage + 2, 5, 1), "assess", wid, "", "critic",
        random.choice(CRITICS), w["_wf"], w["_wu"],
        "Drink early. Not a keeper.")
    b = new_bottle(wid)
    add(when, "acquire", wid, b, "", "grocery store")
    acquired.append((b, wid, when, varietal))

ledger.sort(key=lambda r: (r["date"], r["type"], r["wine"], r["bottle"]))

with open("wines.csv", "w", newline="", encoding="utf-8") as f:
    cols = ["wine_id", "producer", "cuvee", "vintage", "varietal",
            "appellation", "region", "color"]
    wr = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
    wr.writeheader()
    for w in sorted(wines.values(), key=lambda x: (x["producer"], x["vintage"])):
        wr.writerow(w)

with open("ledger.csv", "w", newline="", encoding="utf-8") as f:
    cols = ["date", "type", "wine", "bottle", "sourceType", "sourceName",
            "drinkFrom", "drinkUntil", "note"]
    wr = csv.DictWriter(f, fieldnames=cols)
    wr.writeheader()
    wr.writerows(ledger)

print(f"wines: {len(wines)}")
print(f"bottles: {len(acquired)}")
print(f"consumed: {len(consumed)}")
print(f"in cellar: {len(acquired) - len(consumed)}")
print(f"ledger rows: {len(ledger)}")
