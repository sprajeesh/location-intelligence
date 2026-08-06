# How an Address Gets Scored

This explains, in plain language, how the API turns an address into a score.
No code or formulas — just the ideas.

## The big picture

Every address gets scored on how convenient its location is, based on the
amenities nearby. This happens in three steps, from the ground up:

1. **Individual facility types** (schools, hospitals, bus stops, ...) each get
   their own score.
2. Those combine into **five categories** (Education, Transport, Healthcare,
   Shopping, Recreation).
3. The five categories combine into **one overall score** for the address.

## Step 1: Scoring an individual facility type

Twelve facility types are supported:

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

Not every request checks all twelve — see "Default facility set" below.

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

## Step 3: Combining categories into one final score

The five categories don't count equally toward the final number. Education
and Transport matter most; Shopping and Recreation matter least (for now —
see the note below):

- **Education — 40%**
- **Transport — 30%**
- **Healthcare — 20%**
- **Shopping — 7%**
- **Recreation — 3%**

> The Shopping/Recreation split is a provisional judgment call, not a fixed
> law — it'll be revisited once there's real data on what actually matters
> to people choosing a property.

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

Recreation is left out of the default set entirely for now. Because this
list is configured in the data behind the scenes rather than fixed in code,
it can be adjusted without a software change. A caller that wants a
different mix — including Recreation, swapping in kindergartens instead of
schools, or anything else — can always specify its own facility-type list
explicitly instead of relying on the default; whatever's left out is simply
"not checked" (see above), never penalized.

## Plain-language explanations

Alongside every facility's score, the API returns a short sentence
describing what it found, for example:

> "3 schools within 1.0 km by walk, plus 1 more up to 2.8 km away."

> "Nearest hospital is 4.2 km away by drive."

These are generated from the same distance and count data used to compute
the score — they're a description of the number, not a separate opinion.

## In plain terms

An address scores well when it has amenities that are **both close by and
plentiful**, especially in **education and transport**, which together make
up 70% of the final number. A single missing data source won't unfairly
tank the score — but a genuine lack of nearby amenities will, and rightly so.
