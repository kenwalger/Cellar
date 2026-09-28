# Style guide

Date: 2026-09-28
Status: **descriptive.** Part One records what is in the code today. Part Two is
an assessment of a palette that is **not** in the code and has not been applied.

Sources read: `app/src/App.css`, `app/src/AsOfControl.tsx`, `app/icon.svg`,
`app/public-entry/favicon.svg`, `app/public-entry/index.html`,
`app/sanity.cli.ts`, the generated `app/dist/static/`, and the Studio schema
files. `App.css` is the only stylesheet in the project.

---

# Part One: what is there

## 1. Colour

Every colour in the app is a custom property declared in one of two blocks.
**There is not a single raw hex value anywhere in the component rules** — the
only literals in `App.css` are the seven tokens below, twice.

### Light (`:root`)

| Token | Hex | Used by |
| --- | --- | --- |
| `--fg` | `#1a1a1a` | `body` text; date-input and button text |
| `--muted` | `#6b6b6b` | `h1`/`h2`; `.loading`; `.asof-prefix`, `.asof-distance`, `.asof-assumption`, `.asof-label`; disabled button; `.health-ledger`, `.health-group th`, `.health-outside`, `tfoot`, `.health-note`; `.soon-ledger`, `.soon-table thead th`, `.soon-provenance`, `.soon-left`, `.soon-note`, `.soon-empty-body`; `.missed-frame`, `.missed-ledger`, `.missed-table thead th`, `.missed-provenance`, `.missed-of`, `.missed-opened`, `.missed-varies`, `.missed-ago`, `.missed-note`, `.missed-empty-body` |
| `--rule` | `#e0e0e0` | every `border-bottom` in all three tables; input and button borders; the `border-top` on both empty states |
| `--bg` | `#ffffff` | `body`; date-input and button background |
| `--ok` | `#1c7c4a` | `.health-table .ok` — the sum check in the table foot, and nothing else |
| `--bad` | `#b3261e` | `.health-table .mismatch`; `.missed-lost` |
| `--accent` | `#7a1f3d` | `.masthead-dataset` border and text; `.asof-notice` text; `accent-color` on the slider |

### Dark (`@media (prefers-color-scheme: dark)`)

| Token | Hex | Note |
| --- | --- | --- |
| `--fg` | `#ededed` | |
| `--muted` | `#9a9a9a` | lighter than the light-mode muted, not a simple inversion |
| `--rule` | `#333333` | |
| `--bg` | `#141414` | not pure black |
| `--ok` | `#5ccb8b` | |
| `--bad` | `#ff8a80` | |
| `--accent` | `#e4899f` | a **lightened** wine red — the light-mode `#7a1f3d` would be unreadable on `#141414` |

### Measured contrast

Against each mode's own `--bg`:

| Token | Light on `#ffffff` | Dark on `#141414` |
| --- | ---: | ---: |
| `--fg` | 17.40 | 15.74 |
| `--accent` | 10.04 | 7.35 |
| `--bad` | 6.54 | 8.07 |
| `--muted` | 5.33 | 6.55 |
| `--ok` | 5.21 | 9.10 |
| `--rule` | 1.32 | 1.46 |

`--muted` at 5.33 is the tightest text pairing, and it carries the smallest
type in the app (0.8125rem provenance lines). `--rule` is a hairline and is not
text.

### Semantic assignments worth naming

- **Red is spent, not "error".** `.missed-lost` is `--bad`, and the comment says
  why: "The count is the only red thing on the screen. Past window is the one
  state in the model that cannot be recovered from."
- **Green appears exactly once**, on the Cellar Health sum check.
- **`--accent` is reserved for things addressed to the reader**: the
  non-production dataset badge, the out-of-range date notice, and the slider
  they are dragging. It is never used for content.
- **`--muted` is "present but not inventory"** as much as it is "secondary".
  `.health-outside` greys `NOT_YET_OWNED` and `CONSUMED` rather than hiding
  them, deliberately, so the sum check stays meaningful.

## 2. Type

### Stack

```css
font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
```

**No webfont is loaded anywhere.** The rendered face depends on the machine —
on the Windows box this is developed and filmed on, `Segoe UI`. Anything that
has to match the app's type in a title card has to match what the *recording
machine* resolves, not a named file in the repo.

### Scale

Nine sizes, all in `rem` (root = 16px):

| rem | px | Where |
| --- | ---: | --- |
| `2` | 32 | `.asof-date` — the largest thing on screen |
| `1.75` | 28 | the `strong` in all three section totals |
| `1.0625` | 17 | `h1`, `h2`, section totals, `.health-table td`, `.soon-wine`, `.soon-count`, `.soon-through`, `.missed-wine`, `.missed-lost`, `.missed-until`, both empty-state heads |
| `1` | 16 | `.asof-prefix` |
| `0.9375` | 15 | `.asof-distance`, all three `-ledger` lines, date input and button, `.missed-span`, both empty-state bodies |
| `0.875` | 14 | `.asof-assumption`, `.asof-notice`, `.asof-label`, `tfoot`, all three `-note` lines, `.missed-frame` |
| `0.8125` | 13 | `.masthead-dataset`, `.health-group th`, both `thead th`, all provenance and sub-lines |

`1.0625rem` (17px) is the workhorse: it is simultaneously the heading size and
the body-row size, which is why headings rely on weight and colour rather than
size to sit back.

### Weight and spacing

| Property | Values |
| --- | --- |
| `font-weight` | `400` default and on every table header cell; `500` on `h1`/`h2`; `600` on `.asof-date`, total `strong`, `.health-subtotal`, `.mismatch` |
| `letter-spacing` | `0.02em` on `h1`/`h2`; `0.04em` on `.masthead-dataset`; `0.06em` on the uppercase group and `thead` labels |
| `text-transform` | `uppercase` on `.health-group th` and both `thead th` only |
| `line-height` | set explicitly only twice: `1.15` on `.asof-date`, `1.5` on the prose notes and `.missed-frame` |
| `font-style` | `italic` once, on `.asof-assumption` |

### Numerals

`font-variant-numeric: tabular-nums` on `.asof-date`, every total `strong`, the
whole `.health-table`, `.soon-count`, `.soon-through`, `.missed-lost`,
`.missed-span`, `.missed-until`.

The stated reason is motion: "Tabular figures keep the date from jittering
horizontally as the digits change." This is a decision made for the screen
recording, and it is the single most video-specific choice in the stylesheet.

## 3. Spacing and layout

### Two column widths, both tokens

```css
--col: 34rem;       /* 544px — masthead, Cellar Health */
--col-wide: 46rem;  /* 736px — Drink Soon, Missed Opportunities */
```

Both comments say the same thing in different words: everything has to sit
"inside a single frame in a screen recording."

### Scale in use

`0.125` · `0.1875` · `0.25` · `0.35` · `0.375` · `0.5` · `0.625` · `0.75` ·
`1` · `1.25` · `2` · `2.5` · `3` rem.

Not a formal scale — it is an ad-hoc set that happens to cluster on eighths.

| Rhythm | Value |
| --- | --- |
| Page padding | `2.5rem 2rem` |
| Masthead → asOf | `0.75rem` |
| Section gap, Cellar Health | `margin-top: 2.5rem` |
| Section gap, Drink Soon and Missed | `margin-top: 3rem` |
| Heading → total | `0.75rem` |
| Total → ledger line | `0.125rem` |
| Ledger → table | `1.25rem` |
| Table → note | `1.25rem` |
| Stacked sub-line | `0.1875rem` |

### Fixed column widths

Every table sets `table-layout: fixed`, with the comment: "so a count going
from 4 to 166 cannot widen the label column and shift every row sideways
mid-drag." Again, a decision made for motion.

| Table | Columns |
| --- | --- |
| `.health-table` | label auto, count `8rem` |
| `.soon-table` | wine auto, count `5rem`, window `12rem` |
| `.missed-table` | wine auto, `7.5rem`, `11rem`, `10rem` |

## 4. Tables and rows

All three share a treatment:

- `width: 100%`, `border-collapse: collapse`, `table-layout: fixed`
- row headers (`th`) left-aligned, `font-weight: 400`, carrying the *name*
- data cells right-aligned, carrying the *number*
- `border-bottom: 1px solid var(--rule)` as the only rule; no verticals, no zebra
- `vertical-align: top` on the two wide tables, because their rows are two lines

**Cellar Health** uses `0.5rem 0` cell padding, group headers that are uppercase
and muted with no bottom border, `.health-subtotal` at weight 600 with no
border, and a `tfoot` that is muted, smaller (`0.875rem`) and borderless.

**Drink Soon and Missed Opportunities** use `0.625rem 0` padding and a stacked
row: a `1.0625rem` primary line with a `0.8125rem` muted line beneath it, both
`display: block` inside one cell. The comment explains the choice — "Two lines
per row rather than five columns, because the provenance is a sentence and a
sentence does not fit in a cell."

Separator glyphs (`.soon-sep`, `.missed-sep`) are the only use of `opacity` in
the stylesheet, at `0.5`.

Both empty states are `border-top: 1px solid var(--rule)` with `1.25rem` of
padding above the content, a `1.0625rem` head and a `0.9375rem` muted body —
set as a statement rather than, per the comment, "a greyed-out apology."

## 5. Borders and radii

One border weight and one radius in the entire project:

- `1px solid var(--rule)` everywhere
- `border-radius: 0.25rem` on the dataset badge, the date input and the button

No shadows. No gradients. No transitions or animations of any kind.

## 6. What is **not** ours: theme and platform surfaces

This is the part that matters for anyone assuming the app follows Sanity.

**The app imports no Sanity theming at all.** There is no `@sanity/ui`, no
`ThemeProvider`, no `studioTheme`, and no theme hook anywhere in `app/src` or
`app/public-entry`. Every colour it draws is its own.

The consequence is a real divergence: the App SDK build renders inside the
Sanity Dashboard iframe, but it takes light or dark from
`@media (prefers-color-scheme)` — the **operating system**, not the Dashboard.
A viewer whose Dashboard is set to dark while their OS is light gets a light
cellar inside a dark Dashboard, and nothing in the code is watching for that.

Three things are genuinely delegated:

| Surface | Delegated to | How |
| --- | --- | --- |
| Form control chrome | the browser / OS | `color-scheme: light dark` on `:root` — the date input's digit fields, its picker button, and the slider's track geometry are all browser-drawn |
| Slider tint | the browser, from our token | `accent-color: var(--accent)` |
| The Dashboard app icon | **the Dashboard's own theme** | `app/icon.svg` fills its main path with `fill="currentColor"` |

`app/icon.svg` is the only asset in the project with no colour of its own.

## 7. The two icons, which are not the same file

| | App SDK build | Public build |
| --- | --- | --- |
| Referenced by | `app.icon` in `app/sanity.cli.ts` | `<link rel="icon">` in `public-entry/index.html` |
| File | `app/icon.svg` | `app/public-entry/favicon.svg` |
| Bottle fill | `currentColor` | **`#7a1f3d`**, hardcoded |
| Label band | `#fff` at `opacity="0.92"` | `#fff` at `opacity="0.92"` |
| Geometry | identical 24×24 path | identical 24×24 path |

Same drawing — a bottle with a label band — differing only in whether the fill
is inherited or literal. The literal is `--accent`'s light-mode value, written
out rather than referenced, because an SVG loaded as a favicon cannot see the
page's custom properties.

## 8. Where the two surfaces differ visually

| | App SDK build (`sanity build`) | Public build (`vite build`) |
| --- | --- | --- |
| Stylesheet | `App.css`, identical | `App.css`, identical |
| Views | identical modules via `CellarShell` | identical modules via `CellarShell` |
| Browser tab icon | **Sanity's default**, generated into `dist/static/` — `favicon.svg` on a `#0B0B0B` ground, plus `.ico` and 96/192/512 PNGs and a `manifest.webmanifest` | **ours**, `favicon.svg`, wine red on transparent |
| Tab title | supplied by the Sanity build | `The Cellar`, from our `index.html` |
| Page description | none | a `<meta name="description">` |
| Surrounding chrome | the Dashboard's sidebar and header | nothing; the page is the whole window |
| Dataset badge | rendered only when `DATASET !== 'production'` | same rule, same component |

The visible difference in a screenshot is the favicon and the surrounding
chrome. Everything inside `.app-container` is byte-identical, which was the
design constraint on building the public surface at all.

---

# Part Two: the proposed palette — NOT IN THE CODE

> **Nothing below has been applied.** This section assesses a palette under
> consideration for the demo video's title and end cards, against the values
> recorded above. No styling was changed to produce it.

```
Garnet   #6E1A2B
Oxblood  #4A1220
Cream    #F4EFE2
Oak      #8A6A44
Ink      #1C1815
```

## The one genuine conflict

**Garnet `#6E1A2B` against `--accent` `#7a1f3d`.**

| | |
| --- | --- |
| Contrast ratio between the two | **1.13** |
| RGB delta | ΔR −12, ΔG −5, ΔB −18 |

A ratio of 1.13 is the same colour. Garnet is marginally darker and marginally
less purple, and at video scale, through compression, the difference will not
read as a difference — it will read as a **mismatch**. This is the worst
possible distance: far enough to be visible on a hard cut from a title card to
a screen recording, close enough that no viewer will believe it was intended.

It is also the easiest to resolve, because the two are near-interchangeable on
their respective grounds:

| | On its own background | Ratio |
| --- | --- | ---: |
| `--accent` `#7a1f3d` | white `#ffffff` | 10.04 |
| Garnet `#6E1A2B` | Cream `#F4EFE2` | 9.91 |

**Swapping `--accent` to Garnet and `--bg` to Cream is contrast-neutral.** The
legibility of the dataset badge, the out-of-range notice and the slider is
unchanged to two significant figures.

## The rest, one at a time

**Ink `#1C1815` vs `--fg` `#1a1a1a`.** Contrast ratio between them: **1.01**.
Functionally the same colour; Ink is very slightly warm. On Cream it reads
15.36 against `--fg`'s 17.40 on white — a drop, and nowhere near any threshold.
No conflict. A free swap.

**Cream `#F4EFE2` vs `--bg` `#ffffff`.** The real cost is not the background,
it is `--rule`. `#e0e0e0` is a neutral grey sitting at 1.32 against white; on a
warm cream ground it will read cold and dirty, and its contrast drops further
because Cream is darker than white. **Aligning the background means picking a
new rule colour**, and the palette does not contain one.

**Oak `#8A6A44` — this is the disqualifying one.** Oak on Cream is **4.33**.
`--muted` on white is **5.33**. Oak is the only warm mid-tone in the palette and
the obvious candidate to replace `--muted`, and it cannot: 4.33 is below the 4.5
normal-text threshold, and `--muted` carries the **smallest type in the app**,
the 0.8125rem provenance and sub-lines that appear on every row of Drink Soon
and Missed Opportunities. Using Oak for that text would make the least legible
text in the project less legible still.

Oak is usable as `--rule` — a hairline has no contrast requirement, and it
solves the cold-grey-on-cream problem above — or for large text only.

**Oxblood `#4A1220`.** 13.08 on Cream: that is a *text* weight, not an accent.
It has no counterpart in the app. Against `--accent` it is 1.50, so it could sit
beside Garnet as a darker sibling, but nothing in the interface currently needs
two wine reds.

## The two problems the palette cannot solve

**1. It is a light-mode palette, and the app has a dark mode.**

Against the existing dark background `#141414`:

| | Ratio |
| --- | ---: |
| Garnet `#6E1A2B` | **1.62** |
| Oxblood `#4A1220` | **1.23** |
| Oak `#8A6A44` | **3.71** |
| Cream `#F4EFE2` | 16.05 |

Three of the five are invisible on a dark ground. Only Cream works, and only as
foreground. The app supports both schemes through `prefers-color-scheme`, and
`--accent` already exists in two versions for exactly this reason — `#e4899f`
is a lightened wine red that has no relationship to `#7a1f3d` beyond hue.

So aligning fully means one of three things: **inventing dark-mode variants
that are not in the palette** (which is what the app already does, and which
makes "aligned to the palette" only half true); **dropping dark mode**, which
is a real simplification worth considering if the video is filmed in light mode
anyway; or **accepting that the palette governs title cards and light mode
only**, and saying so.

**2. It contains no green, and no second red.**

`--ok` `#1c7c4a` carries the Cellar Health sum check. There is no green in the
palette and no obvious substitute, so `--ok` would remain an outsider — a
colour that belongs to no system, on the one element whose entire job is to say
"the arithmetic agrees."

`--bad` `#b3261e` is a separate problem in the same family. It sits at 1.74
against Garnet — distinguishable, and roughly the distance it already keeps
from `--accent` — but `.missed-lost` and `.asof-notice` would then be two
unrelated reds from two unrelated systems, on screens a viewer sees in
sequence.

## What would actually have to change

If the app were aligned, in rough order of cost:

| Change | Cost | Note |
| --- | --- | --- |
| `--accent` → Garnet | one line | contrast-neutral |
| `#7a1f3d` in `public-entry/favicon.svg` | one line | must be edited by hand; an SVG favicon cannot read custom properties. `app/icon.svg` needs nothing, since it inherits `currentColor` |
| `--fg` → Ink | one line | 1.01 apart |
| `--bg` → Cream | one line, then a cascade | the date input and button also use `var(--bg)`, so they follow automatically |
| `--rule` → a warm hairline | **one new colour, not in the palette** | Oak is the candidate |
| `--muted` → ? | **unresolved** | Oak fails AA at the size `--muted` is used at; a warm grey would have to be invented |
| `--ok`, `--bad` | **unresolved** | no green and no second red in the palette |
| Dark mode block | **seven new values** | none of Garnet, Oxblood or Oak survives on a dark ground |

Two of five palette colours (Garnet, Ink) drop straight in. One (Cream) drops
in and takes `--rule` with it. One (Oak) is usable only where contrast does not
matter. One (Oxblood) has no role in the interface at all.

## The recommendation, since it was not asked for but follows from the numbers

**Align the accent and leave the rest.** Garnet at 1.13 from the current accent
is the only value whose near-miss will actually be visible in the cut, and it is
a one-line change that costs nothing in contrast. Everything else in the palette
either duplicates a value the app already has to within 1.01, or asks the
interface to invent colours the palette does not contain — a warm hairline, a
warm grey that passes AA at 13px, a green, and an entire dark scheme.

Title cards in the full palette against an interface whose accent matches them
will read as one piece. Title cards in the full palette against an interface
whose accent is 1.13 away from Garnet will read as two attempts at the same
colour.
