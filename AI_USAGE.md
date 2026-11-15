# AI usage

This document describes, openly and in detail, how our team used artificial
intelligence while building Firelock: which tool, for what, and where the line
between our own work and the AI's help lies.

## Which AI we used

We used **Claude**, the AI assistant made by **Anthropic**, in two forms:

- **Claude chat** (the Claude desktop/web app): for discussing ideas, research
  questions and the design of each feature.
- **Claude Code** (Anthropic's coding agent, in the terminal and in the VS Code
  extension): for writing and changing code in this repository, running the
  checks and the data scripts, and updating the documentation.

The forecast model **Chronos-2** (Amazon) is not an assistant: it is a time-series model that is part of the product itself
(see "AI inside the product" below).

## What was ours

The **problem framing, the ideas and the algorithms are the team's own.** Before
any code existed we wrote down in our own notes what we wanted to solve and how,
for example:

- Several satellites (and several passes of the same satellite) can see the same
  fire on the same day, so the same fire must not be counted again.
- VIIRS pixels (375 m) are much smaller than MODIS pixels (about 1 km and more), so
  one bigger fire covers several VIIRS pixels but maybe only one MODIS pixel.
  Neighbouring burning pixels must therefore be joined into one fire, so that VIIRS
  does not look as if it saw more fires when it only saw the same fire in more
  pixels.
- A long-term layer in MODIS-equivalent units (2002 to now), and a measurement of
  how small a fire has to be for MODIS to miss it while VIIRS sees it, using the
  times when a MODIS and a VIIRS satellite scan the same place almost together.
- The product idea: a harmonized fire calendar for an area of interest, with
  statistics, comparisons against the past, a cause panel and a forecast.

From these ideas we designed the pipeline: join the pixels of one pass that
touch into one fire, join detections of different passes and satellites that
overlap on the same local solar day into the same fire, never add up FRP across
passes, and build the map, the statistics and the forecast on top of these fires.
The decisions about which approach to keep, which rule to use and which feature
to build next were made by the team.

## What we used Claude for

### 1. Writing and implementing the code quickly

Most of the code in this repository was written with Claude Code, from our
specifications. This was the biggest use: it let a small team turn its ideas into
a working pipeline and web app within the hackathon time. Concretely:

- the Python data pipeline (`fire_calendar.py`, `tiles/`, `forecast/`), the map
  tile builder and the forecast scripts;
- the React/TypeScript web app (`space-app/`): the map, the search, the time
  slider, the fire layer, the statistics panel, the area selection, the cause
  panel, the translations into eight languages;
- the fire cause service (`cause-service/`) and the small servers;
- tests, self-tests and the documentation (READMEs, format descriptions).

We worked in a fixed way, written down in the instructions we gave the agent: in a **planning chat** we
discussed each feature and agreed on the design, and the planning chat wrote a
precise prompt; an **implementing agent** (Claude Code) then built that one
feature in the repository, ran the checks (strict TypeScript, ESLint with zero
warnings, Prettier, the build, Python self-tests) and reported what it did and
what it did not verify. We reviewed the results, tried the features in the
browser and asked for corrections. The coding conventions, the design system
and the rule that the agent never changes git history were set by us.

### 2. A sparring partner for our algorithms

We did not ask Claude to invent the algorithm; we asked it to **attack ours**:

- **Finding counterexamples**: cases where our joining rules could go wrong,
  with questions such as: can two separate fires be close enough to be merged?
  Can one long fire front break into pieces? What happens at the edge of the MODIS
  swath, where a pixel grows to several kilometres? Which day does a fire belong
  to when the passes are hours apart?
- **Finding holes** in every idea: what we had not thought about, which
  assumption was not proven, what would bias the numbers (for example comparing
  years with different sets of satellites, or a sample that over-represents the
  edge of the MODIS swath).
- **Suggesting how to do it better**: other algorithms and data structures for the
  same job (graph connected components over neighbour pairs found with a k-d
  tree, different distance thresholds), and ways to make the pipeline fit into
  limited memory.

One example where this mattered: we had a hypothesis that neighbouring VIIRS
pixels with identical FRP values are duplicates and should be removed. We asked
Claude to test it on our real data instead of trusting it. The measurements
showed that these values are an equal split of one larger measurement block, so
the raw sums are correct and removing them would have been wrong; we dropped
the hypothesis. We asked for hypotheses and measurements to be kept clearly apart
and to be checked on our own files, not on assumptions.

### 3. Help with research

- **Explaining the physics and the products**: how the MODIS and VIIRS fire
  detection works, what fire radiative power (FRP) means, why pixel size grows
  towards the swath edge, what the columns of the NASA FIRMS files mean. We kept
  our own study notes from these explanations.
- **Analysing our data**: running statistics we asked for, for example on all
  countries of 2025, how many of the fires that VIIRS saw a MODIS satellite missed
  at almost the same time, and how strong a fire has to be for MODIS to see it.
- **Choosing tools**: comparing options (map libraries, tile formats such as
  PMTiles, free geocoders and map styles without API keys, the Chronos-2
  forecasting model) together with their limits and privacy implications. The
  final choice was ours, and every new dependency or external service needed our
  approval.

### 4. Translations and text

The interface translations into the seven other languages were written by
Claude and have **not been reviewed by native speakers** (this is also noted in
`space-app/README.md`). Claude also helped with documentation and wording, such
as this repository's READMEs.

## AI inside the product

Two parts of Firelock itself use models, independently of how we built it:

- **Chronos-2** (Amazon, open weights, run locally on a CPU, zero-shot, no
  training on our side) forecasts the number and the power of fires per 0.5° cell
  and month for the next 24 months. The app marks those months as "Future" and
  says that they are an estimate. The map never shows invented locations: a
  forecast month reuses real fire positions of earlier years.
- The **fire cause panel** uses no language model: it decides with transparent
  keyword rules (`cause-service/rules/en.yaml`) over land use, season, earlier
  fires at the same place and web news, and shows every reason behind its guess.
  Machine translation of news snippets uses a self-hosted LibreTranslate.

## Responsibility and limits

- Every result was checked by us: by the automated checks, by running the
  scripts on our real data and by trying the features. AI-written code can still
  contain mistakes; the team is responsible for what is in the repository.
- Where something was not verified (for example a feature not tried in every
  browser), the implementing agent had to say so in its report, and we kept that
  in mind.
- The data comes from NASA FIRMS; the conclusions drawn from it are ours.
