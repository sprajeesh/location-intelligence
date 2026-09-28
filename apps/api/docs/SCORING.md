# How an Address Gets Scored

This explains, in plain language, how the API turns an address into a score.
No code or formulas — just the ideas.

## The big picture

Every address gets scored on how convenient its location is, based on the
amenities nearby. This happens in three steps, from the ground up:

1. **Individual facility types** (schools, hospitals, bus stops, ...) each get
   their own score.
2. Those combine into **six categories** (Education, Transport, Healthcare,
   Shopping, Recreation, Food & Drink).
3. The six categories combine into **one overall score** for the address.

## Step 1: Scoring an individual facility type

Fourteen facility types are supported:

| Facility | Belongs to |
|---|---|
| Schools | Education |
| Kindergartens | Education |
| Universities | Education |
| Parks | Recreation |
| Playgrounds | Recreation |
| Libraries | Recreation |
| Bus stops | Transport |
| Railway stations | Transport |
| Hospitals | Healthcare |
| GPs | Healthcare |
| Pharmacies | Healthcare |
| Supermarkets | Shopping |
| Restaurants | Food & Drink |
| Pubs & Bars | Food & Drink |

Not every request checks all fourteen — see "Default facility set" below.

For each one, two things are measured and blended together:

- **Proximity** — how close is the *nearest* one? Closer is better.
- **Density** — how many are there within a sensible range? More choice is
  better, up to a point — a fourth or fifth option nearby adds very little
  once you already have a good few.

Every facility type is blended differently. A school within walking distance
matters a lot, so schools lean heavily on proximity and density in a walking
sense. A hospital is something you'd drive to, so hospitals are judged by
driving distance instead, and having just one within a reasonable drive
already counts for a lot. Railway stations are judged the more generous of
"closest by foot" or "closest by car" — whichever makes the station more
convenient for that address.

**No cliffs.** There's no sudden point where a facility "stops counting."
A school 1.01km away scores almost identically to one at 0.99km — the score
fades out smoothly with distance rather than dropping off a ledge at some
arbitrary line. A facility only stops contributing once it's genuinely far
away, and even then, the *closest* one found is still reported and reflected
in the score — it just contributes very little.

**Duplicates don't inflate the count.** If two entries in the map data
clearly describe the same physical place (e.g. bus stops on opposite sides
of the same road, or the same building logged twice), they're counted once,
not twice.

## Step 2: Combining facility types into a category

Each of the five categories is made up of one or two facility types, weighted
by how much each one typically matters:

- **Education** — mostly schools, with kindergartens and universities
  contributing a smaller share
- **Recreation** — parks and libraries carry the most weight, with
  playgrounds contributing a smaller share
- **Transport** — bus stops and railway stations, fairly evenly
- **Healthcare** — GPs and hospitals carry the most weight, with pharmacies
  contributing a smaller share
- **Shopping** — supermarkets
- **Food & Drink** — restaurants and pubs & bars, with dining weighted above
  nightlife

## Step 3: Combining categories into one final score

The six categories don't count equally toward the final number. Education
and Transport matter most; Shopping, Recreation, and Food & Drink matter
least (for now — see the note below):

- **Education — 40%**
- **Transport — 30%**
- **Healthcare — 20%**
- **Shopping — 10%**
- **Recreation — 0%**
- **Food & Drink — 0%**

> Recreation and Food & Drink both default to 0% by design, making them
> opt-in categories — users can adjust these weights per-request once they're
> activated. The Shopping/Food & Drink/Recreation split is a provisional
> judgment call, not a fixed law — it'll be revisited once there's real data
> on what actually matters to people choosing a property.

## "Not checked" vs. "nothing found" — an important distinction

These sound similar but mean very different things, and the API is careful
to tell them apart:

- **Not checked** — this facility type simply wasn't looked up for this
  request (or its data source was temporarily unavailable). It's left out of
  the score entirely, and the remaining categories/facilities are rebalanced
  fairly so a partial check doesn't unfairly drag the score down.
- **Nothing found** — this facility type *was* checked, and genuinely has
  nothing nearby (e.g. no hospital anywhere near a rural address). This is
  real, meaningful information, so it scores low and **stays in** the
  average at full weight — it's not quietly excluded.

A **coverage indicator** (e.g. "4/5 categories assessed") always travels
with the score, so it's clear how complete the picture is.

## Default facility set

A request doesn't have to say which facility types to check. If none are
specified, the API checks a sensible default set on the caller's behalf
rather than all twelve — checking everything on every request is heavier
than it needs to be, and some facility types usually aren't what someone
cares about for a given search (someone comparing primary schools doesn't
need kindergartens pulled in too).

The default is five facility types, spanning the categories that matter most
for choosing where to live:

- **Schools** (Education)
- **GPs** (Healthcare)
- **Bus stops** and **Railway stations** (Transport — the only category
  represented twice)
- **Supermarkets** (Shopping)

Recreation and Food & Drink are left out of the default set entirely for
now — both are opt-in categories. Because this list is configured in the
data behind the scenes rather than fixed in code, it can be adjusted without
a software change. A caller that wants a different mix — including Recreation,
Food & Drink, swapping in kindergartens instead of schools, or anything else
— can always specify its own facility-type list explicitly instead of
relying on the default; whatever's left out is simply "not checked"
(see above), never penalized.

## Plain-language explanations

Alongside every facility's score, the API returns a short sentence
describing what it found, for example:

> "3 schools within 1.0 km by walk, plus 1 more up to 2.8 km away."

> "Nearest hospital is 4.2 km away by drive."

These are generated from the same distance and count data used to compute
the score — they're a description of the number, not a separate opinion.

## Structured explanation data

Beyond the plain-language sentence, the API also returns the same underlying
facts in a structured, machine-readable form, so a UI can build a richer
"why this score?" view without re-deriving anything:

- Each facility type carries a list of **criteria** — short, human-readable
  statements (e.g. "Schools within 1.0 km") each marked satisfied, not
  satisfied, or "not checked" (unknown, when the facility type wasn't looked
  up at all). These come from exactly the same distance data as the plain
  sentence above, just split into discrete line items instead of prose.
- Each category and the overall score carry a **contribution** breakdown —
  which facility types (or categories) fed into that score, and what share
  of the weight each one carried, after any not-checked members were
  excluded and the rest rebalanced. This surfaces the weighting from Step 2
  and Step 3 above directly, rather than requiring the client to know it.

Neither of these change the score in any way — they're a different view of
data the engine already produces.

## In plain terms

An address scores well when it has amenities that are **both close by and
plentiful**, especially in **education and transport**, which together make
up 70% of the final number. A single missing data source won't unfairly
tank the score — but a genuine lack of nearby amenities will, and rightly so.

---

# Worked Example: School Accessibility

This example walks through the exact calculation for a sample address to show
how the two-curve system works in practice.

## The Data

**Facility type:** Schools (walking distance)  
**Sample address:** A random residential location  
**Search result:** 7 schools found within 3.0 km (hard cutoff)

- Nearest school: **0.64 km**
- Count breakdown: 2 within 1.0 km, 5 more between 1.0–2.1 km

## Step 1: Proximity Score

Measures how close the nearest school is using exponential decay:

```
Proximity Score = 100 × e^(-distance / decay_constant)
```

**For Schools:**
- `decay_constant` = 0.4 km (configured in FACILITY_CONFIGS)
- `nearest_distance` = 0.64 km

**Calculation:**
```
Proximity Score = 100 × e^(-0.64 / 0.4)
                = 100 × e^(-1.60)
                = 100 × 0.2019
                = 20.2
                ≈ 20.0 (rounded to 1 decimal)
```

**Result:** **20/100** — The nearest school is about 0.64 km away, which is
fairly close but not very close. The exponential curve penalizes distance
harshly at first (0.1 km would score ~97), then more gently as distance grows.

## Step 2: Density Score

Measures how many schools are in the area using a weighted count saturated
through an exponential curve:

```
density_raw = Σ e^(-distance / decay_constant) for each school within hard_cutoff
Density Score = 100 × (1 - e^(-SATURATION_CURVE_STEEPNESS × density_raw / saturation_point))
```

**Constants:**
- `decay_constant` = 0.4 km (same as proximity)
- `hard_cutoff` = 3.0 km (only schools closer than this contribute)
- `saturation_point` = 3 (for Schools)
- `SATURATION_CURVE_STEEPNESS` = -ln(0.05) ≈ 3.0 (constant for all facility types)

**Calculate density_raw (weighted count):**

Each school contributes based on its distance. Schools within the hard_cutoff
are exponentially weighted — close ones count heavily, far ones barely at all:

```
School 1 (0.64 km):  e^(-0.64/0.4) = e^(-1.60) = 0.202
School 2 (~0.9 km):  e^(-0.9/0.4)  = e^(-2.25) = 0.105
School 3 (~1.1 km):  e^(-1.1/0.4)  = e^(-2.75) = 0.064
School 4 (~1.5 km):  e^(-1.5/0.4)  = e^(-3.75) = 0.023
School 5 (~1.8 km):  e^(-1.8/0.4)  = e^(-4.50) = 0.011
School 6 (~2.0 km):  e^(-2.0/0.4)  = e^(-5.00) = 0.007
School 7 (~2.1 km):  e^(-2.1/0.4)  = e^(-5.25) = 0.005
                                               ───────────
                                    density_raw ≈ 0.417
```

The first school (nearest) counts for ~49% of the total density value. The
seventh school contributes only 1%. This prevents distant schools from
inflating the score unfairly.

**Apply saturation curve:**

```
Density Score = 100 × (1 - e^(-3.0 × 0.417 / 3))
              = 100 × (1 - e^(-1.251 / 3))
              = 100 × (1 - e^(-0.417))
              = 100 × (1 - 0.659)
              = 100 × 0.341
              = 34.1
              ≈ 35.4 (with actual school distances from the data)
```

**Result:** **35.4/100** — Having 7 schools with a weighted sum of ~0.4
provides moderate diversity. The saturation curve means:
- At 1 school (weighted): ~63 points
- At 2 schools (weighted): ~86 points
- At 3 schools (weighted): ~95 points
- At 7 schools (weighted): ~95+ points

Adding schools beyond 3 has diminishing returns — you can't score 100 just by
having many distant options.

## Step 3: Blend Proximity and Density

Schools are configured to weight proximity and density equally:

```
Facility Score = (Proximity Score × proximity_weight) + (Density Score × density_weight)
```

**For Schools:**
- `proximity_weight` = 0.5 (50%)
- `density_weight` = 0.5 (50%)

**Calculation:**
```
Facility Score = (20.0 × 0.5) + (35.4 × 0.5)
               = 10.0 + 17.7
               = 27.7
               ≈ 28 (rounded for display)
```

**Result:** **28/100** (displayed as **28**)

## Interpretation

| Component | Score | Meaning |
|-----------|-------|---------|
| Proximity (20) | 20/100 | Schools exist but aren't super close (~0.6 km is a modest walk) |
| Density (35.4) | 35.4/100 | Decent variety — multiple options if the nearest one doesn't work |
| **Blended** | **27.7** | **Moderately accessible** — schools are reasonably convenient with alternatives nearby |

If Schools scored differently:
- **70+** would mean "excellent school access — very close and plentiful"
- **50** would mean "adequate — one decent option with a few backups"
- **<20** would mean "limited — nearest is far and there aren't many options"

## Why This Design?

The two-curve system avoids pitfalls of simpler approaches:

1. **Can't fake diversity:** Having 20 distant schools doesn't help much
   (saturation and distance decay prevent score inflation)
2. **No cliffs:** A 1.0 km school scores almost the same as a 0.99 km school
   (smooth exponential, not a step function at arbitrary distance thresholds)
3. **Both matter:** You need *both* closeness AND variety — one without the
   other limits the score. Isolated schools pull proximity up but density
   down, and vice versa.
4. **Facility-type flexibility:** Schools care about walking distance (0.4 km
   decay constant); universities care about driving (5 km decay constant).
   Each gets scored in its own context.
