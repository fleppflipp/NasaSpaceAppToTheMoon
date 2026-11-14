"""
fire_calendar.py - join MODIS + VIIRS hotspot pixels into daily FIRES (clusters).

  STEP 1  load one country's file into one standard table
  STEP 2  split the pixels into passes (one satellite, one pass over the area)
  STEP 3  find the edges: pairs of pixels that belong to the same fire
            - same pass       -> TOUCH edge   (two parts of one fire in the same picture)
            - different pass  -> OVERLAP edge (the same ground seen again by another pass)
  STEP 4  two graphs per local day (connected components)
            - graph 1 = touch edges only           -> pass_fire_id (one fire in one picture)
            - graph 2 = touch + overlap edges      -> fire_id      (one fire for the whole day)
  STEP 5  two output files per country (see FILE_GUIDE below, also written as a .txt)
            fire_clusters_<year>_<country>.csv : one row per fire  (centre, radius, FRP, who saw it)
            fire_pixels_<year>_<country>.csv   : one row per pixel (fire_id, pass_id, scan, track, FRP ...)
          --layout annual-pixels writes one combined pixel CSV per year instead.

Run:  python fire_calendar.py --all --all-years --layout annual-pixels --out harmonized
      python fire_calendar.py --all                      (one year, both tables, into new_outputs/)
      python fire_calendar.py Zambia Angola             (only these countries)
      python fire_calendar.py --selftest
"""
import argparse
import tempfile
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------- settings (the agreed rules)
PASS_GAP_MIN = 10      # a time gap > 10 min between pixels of one satellite starts a new pass
TOUCH_FACTOR = 0.75    # same pass:      same fire if distance <= 0.75 * (size_a + size_b)
SLACK_KM = 0.5         # different pass: same fire if distance <= size_a/2 + size_b/2 + 0.5 km
EARTH_R_KM = 6371.0

# ============================================================================ STEP 1: load one country
# The raw MODIS and VIIRS files have almost the same columns, but a few names differ
# (brightness vs bright_ti4, confidence 0-100 vs l/n/h). We rename them to one standard set
# so every later step works the same way for both sensors.

FILE_PATTERN = {
    "MODIS": "modis/{year}/modis_{year}_{country}.csv",
    "VIIRS": "viirs/{year}/viirs-snpp_{year}_{country}.csv",
}

RENAME = {
    "latitude": "lat", "longitude": "lon",
    "scan": "scan_km", "track": "track_km",          # pixel size in km (grows towards the swath edge)
    "brightness": "bt_mir", "bright_ti4": "bt_mir",  # ~4 um brightness temperature (K), the "fire" channel
    "bright_t31": "bt_tir", "bright_ti5": "bt_tir",  # ~11 um brightness temperature (K), the background
}


def list_countries(year, sensors):
    """Country names that have a file for at least one of the sensors."""
    names = set()
    for s in sensors:
        pattern = FILE_PATTERN[s].format(year=year, country="*")
        prefix = Path(pattern).name.split("*")[0]                    # e.g. "modis_2025_"
        names |= {p.stem[len(prefix):] for p in ROOT.glob(pattern)}
    return sorted(names)


def list_years(sensors):
    """Sorted union of years with matching country CSVs in either sensor folder."""
    years = set()
    for sensor in sensors:
        folder = ROOT / sensor.lower()
        if not folder.is_dir():
            continue
        for directory in folder.iterdir():
            if directory.is_dir() and directory.name.isdigit() and len(directory.name) == 4:
                year = int(directory.name)
                if list_countries(year, [sensor]):
                    years.add(year)
    return sorted(years)


def load_country(sensor, country, year=2025, vegetation_only=True):
    path = ROOT / FILE_PATTERN[sensor].format(year=year, country=country)
    try:
        return _load_country(sensor, path, vegetation_only)
    except FileNotFoundError:
        raise
    except Exception as exc:
        raise ValueError(f"Invalid input {path}: {exc}") from exc


def _load_country(sensor, path, vegetation_only):
    """Read one FIRMS country file and return a clean table with standard column names.

    Output columns:
      sensor, satellite, lat, lon, scan_km, track_km, frp, bt_mir, bt_tir, confidence,
      daynight, type, time_utc, local_date
    """
    df = pd.read_csv(path, dtype={"acq_time": str, "acq_date": str, "confidence": str})
    df = df.rename(columns=RENAME)

    if vegetation_only:                      # type 0 = vegetation fire (1 volcano, 2 static source, 3 offshore)
        df = df[df["type"] == 0].copy()

    # acq_time is HHMM in UTC; "23" means 00:23 -> pad to 4 digits
    hhmm = df["acq_time"].str.zfill(4)
    df["time_utc"] = pd.to_datetime(df["acq_date"] + " " + hhmm, format="%Y-%m-%d %H%M")
    if df["time_utc"].isna().any():
        raise ValueError("missing acquisition date or time")

    # Local SOLAR date: the sun moves 15 deg of longitude per hour, so local time = UTC + lon/15 h.
    # A night pass at 01:10 local and a day pass at 13:35 local then fall on the same calendar day,
    # which the UTC date does not guarantee (e.g. in the Americas UTC is already "tomorrow" in the evening).
    local_time = df["time_utc"] + pd.to_timedelta(df["lon"] / 15.0, unit="h")
    df["local_date"] = local_time.dt.floor("D")

    df["sensor"] = sensor
    numeric = ["lat", "lon", "scan_km", "track_km", "frp", "bt_mir", "bt_tir"]
    if not np.isfinite(df[numeric].to_numpy(dtype=float)).all():
        raise ValueError("non-finite coordinates, pixel dimensions, FRP or temperatures")
    if not (df["scan_km"].gt(0) & df["track_km"].gt(0)).all():
        raise ValueError("pixel dimensions must be positive")
    if not (df["lat"].between(-90, 90) & df["lon"].between(-180, 180)).all():
        raise ValueError("coordinates outside geographic bounds")
    if df["satellite"].isna().any() or not df["daynight"].isin(["D", "N"]).all():
        raise ValueError("missing satellite or invalid daynight")
    cols = ["sensor", "satellite", "lat", "lon", "scan_km", "track_km", "frp", "bt_mir", "bt_tir",
            "confidence", "daynight", "type", "time_utc", "local_date"]
    return df[cols].sort_values("time_utc").reset_index(drop=True)


# ============================================================================ STEP 2: passes
def assign_passes(px):
    """pass_id = one satellite flying over once. Sort each satellite's pixels by time; a new pass
    starts when the satellite changes or the time jumps by more than PASS_GAP_MIN.
    (One pass is cut into several 5-6 minute FIRMS granules, so the exact acq_time is not enough.)"""
    px = px.sort_values(["satellite", "time_utc"], kind="stable").reset_index(drop=True)
    new_satellite = px["satellite"] != px["satellite"].shift()
    time_jump = px["time_utc"].diff() > pd.Timedelta(minutes=PASS_GAP_MIN)
    px["pass_id"] = ((new_satellite | time_jump).cumsum() - 1).astype(np.int64)
    return px


# ============================================================================ STEP 3: edges
def to_xyz_km(lat, lon):
    """Point on a sphere of Earth's radius (km). Distances in 3-D need no cos(lat) correction
    and work across the dateline and near the poles."""
    la, lo = np.radians(lat), np.radians(lon)
    return EARTH_R_KM * np.column_stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])


def great_circle_km(xyz_a, xyz_b):
    """Distance along the Earth's surface between two arrays of 3-D points."""
    chord = np.linalg.norm(xyz_a - xyz_b, axis=1)
    return 2 * EARTH_R_KM * np.arcsin(np.minimum(chord / (2 * EARTH_R_KM), 1.0))


def close_pairs(xyz, ia, ib, radius_km, same_set):
    """KD-tree search: all pairs (i from ia, j from ib) closer than radius_km.
    (The straight 3-D line is never longer than the surface distance, so no real neighbour is missed.)"""
    if len(ia) == 0 or len(ib) == 0:
        return np.empty(0, np.int64), np.empty(0, np.int64)
    tree_a = cKDTree(xyz[ia])
    if same_set:                                   # pairs inside one group, each pair once
        p = tree_a.query_pairs(radius_km, output_type="ndarray")
        return ia[p[:, 0]], ia[p[:, 1]]
    m = tree_a.sparse_distance_matrix(cKDTree(xyz[ib]), radius_km, output_type="ndarray")
    return ia[m["i"]], ib[m["j"]]


def find_edges(xyz, size, pass_id, is_viirs):
    """Return (i, j, is_touch): every pair of pixels that belongs to the same fire, and its edge type.
    is_touch = True  -> same pass, touch rule        dist <= 0.75 * (size_i + size_j)
    is_touch = False -> different pass, overlap rule dist <= size_i/2 + size_j/2 + 0.5 km"""
    iv, im = np.flatnonzero(is_viirs), np.flatnonzero(~is_viirs)

    def radius(idx):                     # the largest distance either rule could accept in this group
        s = size[idx].max() if len(idx) else 0.0
        return max(TOUCH_FACTOR * 2 * s, s + SLACK_KM)

    # search VIIRS-VIIRS, MODIS-MODIS and MODIS-VIIRS separately, each with its own (small) radius
    found = [close_pairs(xyz, iv, iv, radius(iv), same_set=True),
             close_pairs(xyz, im, im, radius(im), same_set=True)]
    if len(iv) and len(im):              # MODIS and VIIRS are always different passes -> overlap rule only
        found.append(close_pairs(xyz, im, iv, size[im].max() / 2 + size[iv].max() / 2 + SLACK_KM,
                                 same_set=False))
    i = np.concatenate([f[0] for f in found])
    j = np.concatenate([f[1] for f in found])

    dist = great_circle_km(xyz[i], xyz[j])
    is_touch = pass_id[i] == pass_id[j]                         # the edge type comes from the pass ids
    limit = np.where(is_touch, TOUCH_FACTOR * (size[i] + size[j]), size[i] / 2 + size[j] / 2 + SLACK_KM)
    keep = dist <= limit
    return i[keep], j[keep], is_touch[keep]


# ============================================================================ STEP 4: two graphs
def components(n, i, j):
    """Connected components of a graph with n nodes and edges (i, j): label 0..k-1 per node."""
    graph = coo_matrix((np.ones(len(i), dtype=np.int8), (i, j)), shape=(n, n))
    return connected_components(graph, directed=False)[1]


def cluster(px):
    """Adds pass_fire_id (graph 1, touch edges) and fire_id (graph 2, all edges). One graph per local day,
    so a fire never spans two days. Ids are unique within the table."""
    xyz = to_xyz_km(px["lat"].to_numpy(), px["lon"].to_numpy())
    size = np.maximum(px["scan_km"], px["track_km"]).to_numpy(float)
    pass_id = px["pass_id"].to_numpy()
    is_viirs = (px["sensor"] == "VIIRS").to_numpy()

    pass_fire_id = np.empty(len(px), np.int64)
    fire_id = np.empty(len(px), np.int64)
    next_pf = next_fire = 0
    for idx in px.groupby("local_date").indices.values():          # idx = row positions of one day
        i, j, is_touch = find_edges(xyz[idx], size[idx], pass_id[idx], is_viirs[idx])
        pf = components(len(idx), i[is_touch], j[is_touch])        # graph 1: one fire in one picture
        f = components(len(idx), i, j)                             # graph 2: one fire for the day
        pass_fire_id[idx] = pf + next_pf
        fire_id[idx] = f + next_fire
        next_pf += pf.max() + 1
        next_fire += f.max() + 1
    return px.assign(pass_fire_id=pass_fire_id, fire_id=fire_id)


# ============================================================================ STEP 5: the two outputs
PIXEL_COLS = ["country", "fire_id", "pass_id", "pass_fire_id", "sensor", "satellite", "time_utc",
              "local_date", "daynight", "lat", "lon", "scan_km", "track_km", "frp", "bt_mir", "bt_tir",
              "confidence"]

CLUSTER_COLS = ["country", "fire_id", "local_date", "lat", "lon", "radius_km", "passes_avg_frp_mw",
                "passes_min_frp_mw", "passes_max_frp_mw", "modis_frp_mw", "viirs_frp_mw", "n_passes", "n_day_passes", "n_night_passes",
                "n_modis_passes", "n_viirs_passes", "satellites", "seen_by_modis", "seen_by_viirs",
                "n_pixels", "n_pixels_max_pass", "first_seen_utc", "last_seen_utc"]


def pass_table(px):
    """One row per (fire, pass): the fire as ONE satellite saw it at ONE moment.
    frp = sum of the fire's pixels in this pass (different parts of the fire at the same time -> add up)."""
    t = px.groupby(["fire_id", "pass_id"]).agg(
        sensor=("sensor", "first"), satellite=("satellite", "first"), daynight=("daynight", "first"),
        time_utc=("time_utc", "min"), n_pix=("frp", "size"), frp=("frp", "sum"))
    return t.reset_index()


def centre_and_radius(px):
    """Per fire: centre = average of the pixel centres (in 3-D, put back on the Earth's surface);
    radius = smallest circle around that centre that contains EVERY pixel completely
           = max over pixels of (distance centre -> pixel centre + half the pixel's diagonal)."""
    xyz = to_xyz_km(px["lat"].to_numpy(), px["lon"].to_numpy())
    fid = px["fire_id"].to_numpy()
    c = pd.DataFrame(xyz, columns=["x", "y", "z"]).groupby(fid).mean()
    c = c.div(np.sqrt((c ** 2).sum(axis=1)), axis=0) * EARTH_R_KM         # back onto the sphere
    d = great_circle_km(xyz, c.reindex(fid).to_numpy())
    half_diagonal = 0.5 * np.hypot(px["scan_km"].to_numpy(), px["track_km"].to_numpy())
    out = pd.DataFrame(index=c.index)
    out["lat"] = np.degrees(np.arcsin(c["z"] / EARTH_R_KM))
    out["lon"] = np.degrees(np.arctan2(c["y"], c["x"]))
    out["radius_km"] = pd.Series(d + half_diagonal).groupby(fid).max()
    return out


def cluster_table(px, passes, country):
    """One row per daily fire. passes_avg_frp_mw = for each pass the SUM of the fire's pixels, then the AVERAGE of
    those pass sums (FRP is never added across passes, so a fire seen 3 times is not counted 3 times)."""
    g = passes.groupby("fire_id")
    f = g.agg(n_passes=("pass_id", "size"),
              passes_avg_frp_mw=("frp", "mean"), passes_min_frp_mw=("frp", "min"),
              passes_max_frp_mw=("frp", "max"),
              n_pixels_max_pass=("n_pix", "max"),
              first_seen_utc=("time_utc", "min"), last_seen_utc=("time_utc", "max"))
    f["n_day_passes"] = (passes["daynight"] == "D").groupby(passes["fire_id"]).sum()
    f["n_night_passes"] = f["n_passes"] - f["n_day_passes"]

    for sensor in ["MODIS", "VIIRS"]:                       # per-sensor view (empty = sensor did not see it)
        s = passes[passes["sensor"] == sensor].groupby("fire_id")["frp"]
        f[f"n_{sensor.lower()}_passes"] = s.size().reindex(f.index, fill_value=0)
        f[f"{sensor.lower()}_frp_mw"] = s.mean()
    f["seen_by_modis"] = f["n_modis_passes"] > 0
    f["seen_by_viirs"] = f["n_viirs_passes"] > 0

    # which satellites saw it, e.g. "Aqua+N20" (bit code per satellite -> fast, no Python loop per fire)
    sats = sorted(passes["satellite"].unique())
    bit = pd.Series([1 << k for k in range(len(sats))], index=sats)
    pairs = passes[["fire_id", "satellite"]].drop_duplicates()
    code = pd.Series(bit.reindex(pairs["satellite"]).to_numpy(), index=pairs["fire_id"].to_numpy())
    code = code.groupby(level=0).sum()
    names = {c: "+".join(s for k, s in enumerate(sats) if c & (1 << k)) for c in code.unique()}
    f["satellites"] = code.map(names)

    f = f.join(centre_and_radius(px))
    f = f.join(px.groupby("fire_id").agg(local_date=("local_date", "first"), n_pixels=("frp", "size")))
    f = f.reset_index()
    f["country"] = country
    return f[CLUSTER_COLS]


def build(px, country):
    """pixels (any mix of sensors) -> (pixel table, cluster table)."""
    px = cluster(assign_passes(px))
    px["country"] = country
    clusters = cluster_table(px, pass_table(px), country)
    px = px.sort_values(["fire_id", "time_utc"], kind="stable").reset_index(drop=True)  # a fire's pixels together
    return px[PIXEL_COLS], clusters


def check(pixels, clusters, n_rows_in, frp_in):
    """Consistency checks; raises AssertionError if something is wrong."""
    assert len(pixels) == n_rows_in, "pixels lost or duplicated"
    assert np.isclose(pixels["frp"].sum(), frp_in), "FRP changed"
    assert pixels.groupby("pass_fire_id")["pass_id"].nunique().max() == 1, "a pass-fire spans two passes"
    assert pixels.groupby("pass_fire_id")["fire_id"].nunique().max() == 1, "a pass-fire spans two fires"
    assert pixels.groupby("fire_id")["local_date"].nunique().max() == 1, "a fire spans two days"
    assert len(clusters) == pixels["fire_id"].nunique() and clusters["n_pixels"].sum() == len(pixels)
    again = pixels.groupby(["fire_id", "pass_id"])["frp"].sum().groupby(level="fire_id").mean()
    assert np.allclose(again.sort_index().to_numpy(), clusters.sort_values("fire_id")["passes_avg_frp_mw"].to_numpy())
    # every pixel centre must lie inside its fire's circle
    c = clusters.set_index("fire_id").reindex(pixels["fire_id"])
    d = great_circle_km(to_xyz_km(pixels["lat"].to_numpy(), pixels["lon"].to_numpy()),
                        to_xyz_km(c["lat"].to_numpy(), c["lon"].to_numpy()))
    assert (d <= c["radius_km"].to_numpy() + 1e-6).all(), "a pixel lies outside its fire's circle"


# ============================================================================ the .txt file guide
FILE_GUIDE = """\
FIRE OUTPUT FILES  (made by fire_calendar.py from FIRMS MODIS + VIIRS {year}, vegetation fires only = type 0)
=====================================================================================================

For every country there are TWO files with different names and different columns:

  fire_clusters/fire_clusters_{year}_<Country>.csv   ONE ROW PER FIRE    (use this for counting, maps, calendar)
  fire_pixels/fire_pixels_{year}_<Country>.csv       ONE ROW PER PIXEL   (the raw detections behind each fire)

They are linked by fire_id: all rows in fire_pixels with fire_id = 123 are the pixels of the fire
with fire_id = 123 in fire_clusters. Ids are unique across ALL countries of this run.
run_summary_{year}.csv has one line per country (pixels in, fires out, total FRP).

What is a "fire" here?
  All MODIS (Terra, Aqua) and VIIRS (SNPP = "N", or the original satellite label) pixels of one LOCAL SOLAR DAY
  (local time = UTC + longitude/15 hours) that are joined by these two rules:
    - same pass (same satellite, same fly-over):   pixels TOUCH   if distance <= {touch} x (size_a + size_b)
      -> one big fire spread over several neighbouring pixels becomes one fire
    - different pass or satellite:                  pixels OVERLAP if distance <= size_a/2 + size_b/2 + {slack} km
      -> the same fire seen again by another pass / satellite is the SAME fire (counted once)
  size = max(scan, track) of the pixel in km. A fire can have 1 pixel or many.

-----------------------------------------------------------------------------------------------------
FILE 1: fire_clusters_{year}_<Country>.csv  - one row per fire
-----------------------------------------------------------------------------------------------------
  country            country of the input file
  fire_id            id of the fire (links to fire_pixels)
  local_date         local solar date of the fire
  lat, lon           centre of the fire = average position of all its pixel centres (degrees)
  radius_km          radius of a circle around (lat, lon) that contains EVERY pixel of the fire completely
                     (distance to the farthest pixel centre + half that pixel's diagonal). A 1-pixel fire has
                     radius = half its pixel diagonal (VIIRS ~0.27-0.6 km, MODIS ~0.7-2.6 km).
  passes_avg_frp_mw  FRP of the WHOLE fire in megawatts (use this one):
                       1) for each pass, add up the FRP of all the fire's pixels in that pass
                          = the "pass total" (the pixels are different parts of the fire at the same moment)
                       2) take the AVERAGE of these pass totals
                     FRP is never added across passes: a fire seen by 3 passes is not 3x bigger.
  passes_min_frp_mw  the SMALLEST pass total of the fire
  passes_max_frp_mw  the LARGEST pass total of the fire
                     These are over PASSES, not over pixels: a fire seen by only 1 pass has
                     passes_avg = passes_min = passes_max = that pass's total, even if it has many pixels.
                     Example: 2 pixels of 3.53 + 3.45 MW in one pass -> all three = 6.98 MW.
                     Pixel-by-pixel FRP values are in the fire_pixels file (column frp).
  modis_frp_mw       average of the MODIS pass totals (empty if MODIS did not see the fire)
  viirs_frp_mw       average of the VIIRS pass totals (empty if VIIRS did not see the fire)
  n_passes           how many passes saw the fire that day
  n_day_passes       ... of which in daytime
  n_night_passes     ... of which at night
  n_modis_passes     ... of which MODIS (Terra or Aqua)
  n_viirs_passes     ... of which VIIRS
  satellites         which satellites saw it, e.g. "Aqua+N20"
  seen_by_modis      True / False
  seen_by_viirs      True / False   (seen_by_viirs True and seen_by_modis False = a fire only VIIRS caught)
  n_pixels           number of pixel rows in fire_pixels for this fire (all passes together; NOT an area)
  n_pixels_max_pass  pixels of the fire in its largest single pass (a better size measure)
  first_seen_utc     time of the first pass that saw the fire (UTC)
  last_seen_utc      time of the last pass that saw the fire (UTC)

-----------------------------------------------------------------------------------------------------
FILE 2: fire_pixels_{year}_<Country>.csv  - one row per pixel (= one row of the original FIRMS files)
-----------------------------------------------------------------------------------------------------
  country            country of the input file
  fire_id            the fire this pixel belongs to (many pixels -> one fire)
  pass_id            the pass this pixel comes from (one satellite, one fly-over; one pass contains many fires)
  pass_fire_id       the fire as seen in this ONE pass (the touching pixels of one picture). One fire_id can
                     have several pass_fire_ids (one per pass, sometimes more if a picture shows the fire in pieces)
  sensor             MODIS or VIIRS
  satellite          original label: Terra, Aqua (MODIS), N (VIIRS SNPP), N20 (VIIRS NOAA-20)
  time_utc           time of the observation (UTC)
  local_date         local solar date (same for all pixels of a fire)
  daynight           D = day, N = night
  lat, lon           centre of the pixel (degrees)
  scan_km, track_km  pixel size in km across and along the satellite track
                     (VIIRS 0.32-0.8 km, MODIS 1-4.8 km; bigger towards the edge of the swath)
  frp                FRP of this pixel (MW). Adding the frp of one pass_fire_id gives that pass's total.
  bt_mir             ~4 um brightness temperature (K): MODIS "brightness", VIIRS "bright_ti4"
  bt_tir             ~11 um brightness temperature (K): MODIS "bright_t31", VIIRS "bright_ti5"
  confidence         MODIS 0-100 (%), VIIRS l / n / h (low / nominal / high), as in the original files

-----------------------------------------------------------------------------------------------------
DIFFERENCE BETWEEN THE TWO FILES / HOW TO USE THEM
-----------------------------------------------------------------------------------------------------
  fire_clusters = the summary: 1 row = 1 fire. Count rows to count fires; sum passes_avg_frp_mw to get total FRP.
                  A circle (lat, lon, radius_km) shows where the fire is.
  fire_pixels   = the detail: 1 row = 1 detection. Use it for the exact shape of a fire (draw each pixel as a
                  scan_km x track_km rectangle around lat, lon), or for individual pixel FRP values.
                  Do NOT count rows here as fires and do NOT sum frp over all rows of a fire
                  (that would add the same fire seen by several passes several times).
"""


# ============================================================================ self-test (toy example)
def selftest():
    """a1-a3: one NOAA-20 fire over 3 pixels (4, 6, 5 MW); a4: another fire 20 km away (7 MW);
    b1: one Aqua 1 km pixel over a1-a3 (14 MW). Expect 2 fires; fire 1 FRP = mean(15, 14) = 14.5."""
    km = 1 / 111.195
    px = pd.DataFrame({
        "sensor": ["VIIRS"] * 4 + ["MODIS"], "satellite": ["N20"] * 4 + ["Aqua"],
        "lat": 0.0, "lon": [0, 0.375 * km, 0.75 * km, 20 * km, 0.375 * km],
        "scan_km": [0.375] * 4 + [1.0], "track_km": [0.375] * 4 + [1.0],
        "frp": [4.0, 6.0, 5.0, 7.0, 14.0], "bt_mir": 330.0, "bt_tir": 300.0, "confidence": "n",
        "daynight": "D", "local_date": pd.Timestamp("2025-08-01"),
        "time_utc": pd.to_datetime(["2025-08-01 11:17"] * 4 + ["2025-08-01 12:36"])})
    pixels, clusters = build(px, "toy")
    check(pixels, clusters, len(px), px["frp"].sum())
    print(pixels[["fire_id", "pass_id", "pass_fire_id", "satellite", "lon", "frp"]].to_string(index=False), "\n")
    print(clusters[["fire_id", "lat", "lon", "radius_km", "passes_avg_frp_mw", "n_passes", "satellites"]]
          .to_string(index=False))
    assert len(clusters) == 2 and sorted(clusters["passes_avg_frp_mw"]) == [7.0, 14.5]
    # fire 1: centre = average of 4 centres (0, 0.375, 0.75, 0.375 km) = 0.375 km; farthest pixel = Aqua's
    # 1 km pixel at the centre (half diagonal 0.707) -> radius 0.707
    assert np.isclose(clusters.loc[clusters.passes_avg_frp_mw == 14.5, "radius_km"].iloc[0], 0.5 * np.hypot(1, 1), atol=1e-3)
    print("\nselftest OK")


# ============================================================================ run
ANNUAL_GUIDE = """ANNUAL FIRE PIXELS (fire_calendar.py)

fire_pixels_<year>.csv contains one row per original vegetation detection (type 0).
MODIS Terra/Aqua and VIIRS SNPP (satellite N) use the same columns; original
satellite labels, confidence and pixel FRP in MW are preserved. This is spatial
and temporal grouping, not statistical FRP calibration.

Columns, in order:
{columns}

country: source country; sensor: MODIS or VIIRS; satellite: original satellite.
time_utc: observation timestamp; local_date: UTC + longitude/15 hours, date only.
daynight: D or N; lat/lon: original pixel centre in degrees.
scan_km/track_km: original pixel dimensions; frp: original pixel FRP in MW.
bt_mir/bt_tir: brightness temperatures in kelvin; confidence: original value
(MODIS 0-100, VIIRS l/n/h).

fire_id identifies one connected fire on one local solar day within a country.
pass_id identifies one satellite fly-over (a gap >10 minutes starts a new pass).
pass_fire_id identifies connected pixels within that pass and local day.
Same-pass distance limit: 0.75 * (size_a + size_b).
Different-pass distance limit: size_a/2 + size_b/2 + 0.5 km.
size = max(scan_km, track_km). Locations and FRP are never invented or calibrated.
Do not count pixel rows as fires or sum a fire's FRP across different passes.

All three integer IDs are unique across countries within an annual export.
Across years use (source year, ID). IDs restart on each annual run; rebuilding a
different country selection can change IDs. Countries and years are independent:
no merging across borders or source-year boundaries. The file year is the input
year; local_date may fall in an adjacent year. Rows are ordered by country,
fire_id and time_utc. Missing sensors are allowed; empty years have headers only.

run_summary_<year>.csv records each country's available sensors, retained pixel
counts, original per-sensor FRP sums, fire counts and processing seconds.
Pixel FRP sums are conservation checks, not multi-pass fire-energy estimates.
Annual CSVs are staged, read back in chunks and checked before replacement.
Rerunning rebuilds the selected year's file, including only selected countries.
No cluster CSV is written in annual-pixels mode.

Run all available years:
  python fire_calendar.py --all --all-years --layout annual-pixels --out harmonized
Run one year:
  python fire_calendar.py --all --year 2025 --layout annual-pixels --out harmonized
"""

ANNUAL_SUMMARY_COLS = ["country", "sensors", "modis_pixels", "viirs_pixels",
                       "modis_pixel_frp_mw", "viirs_pixel_frp_mw", "fires", "seconds"]


def verify_annual(path, summary):
    """Check the serialized file against retained source counts and FRP sums."""
    if list(pd.read_csv(path, nrows=0).columns) != PIXEL_COLS:
        raise ValueError(f"Invalid pixel columns: {path}")
    counts, totals = {}, {}
    for chunk in pd.read_csv(path, usecols=["country", "sensor", "frp"], chunksize=250_000,
                             keep_default_na=False):
        for key, group in chunk.groupby(["country", "sensor"]):
            counts[key] = counts.get(key, 0) + len(group)
            totals[key] = totals.get(key, 0.0) + group.frp.sum()
    expected = set()
    for row in summary.to_dict("records"):
        for sensor in ["MODIS", "VIIRS"]:
            key = (row["country"], sensor)
            expected.add(key)
            if counts.get(key, 0) != row[f"{sensor.lower()}_pixels"]:
                raise ValueError(f"Pixel count mismatch for {key}: {path}")
            if not np.isclose(totals.get(key, 0.0), row[f"{sensor.lower()}_pixel_frp_mw"],
                              rtol=1e-10, atol=1e-6):
                raise ValueError(f"Pixel FRP mismatch for {key}: {path}")
    if set(counts) - expected:
        raise ValueError(f"Unexpected country/sensor in {path}")


def run_annual(countries, year, sensors, out_dir):
    """Stream one country at a time into a checked annual pixel export."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    countries = sorted(set(countries))
    offsets = dict.fromkeys(["fire_id", "pass_id", "pass_fire_id"], 0)
    rows = []
    start = time.time()
    # Temporary files live on the destination filesystem so replace is atomic.
    with tempfile.NamedTemporaryFile(dir=out_dir, prefix=f"fire_pixels_{year}_",
                                     suffix=".tmp", delete=False) as handle:
        staged = Path(handle.name)
    staged_summary = None
    try:
        with staged.open("w", encoding="utf-8", newline="") as output:
            pd.DataFrame(columns=PIXEL_COLS).to_csv(output, index=False)
            for k, country in enumerate(countries, 1):
                t0 = time.time()
                row = dict.fromkeys(ANNUAL_SUMMARY_COLS, 0)
                row["country"] = country
                available, parts = [], []
                for sensor in sensors:
                    path = ROOT / FILE_PATTERN[sensor].format(year=year, country=country)
                    if not path.is_file():
                        continue
                    part = load_country(sensor, country, year)
                    available.append(sensor)
                    row[f"{sensor.lower()}_pixels"] = len(part)
                    row[f"{sensor.lower()}_pixel_frp_mw"] = float(part.frp.sum())
                    if len(part):
                        parts.append(part)
                    del part
                if not available:
                    raise FileNotFoundError(f"No input for {year}/{country} under {ROOT}")
                row["sensors"] = "+".join(available)
                if parts:
                    px = pd.concat(parts, ignore_index=True)
                    parts.clear()
                    pixels, clusters = build(px, country)
                    check(pixels, clusters, len(px), px.frp.sum())
                    del px
                    for col in offsets:
                        pixels[col] += offsets[col]
                        offsets[col] = int(pixels[col].max()) + 1
                    pixels.to_csv(output, index=False, header=False)
                    row["fires"] = len(clusters)
                    del pixels, clusters
                row["seconds"] = round(time.time() - t0, 2)
                rows.append(row)
                print(f"[{year} {k}/{len(countries)}] {country}: "
                      f"{row['modis_pixels'] + row['viirs_pixels']:,} pixels -> "
                      f"{row['fires']:,} fires ({row['seconds']}s)", flush=True)
        summary = pd.DataFrame(rows, columns=ANNUAL_SUMMARY_COLS)
        print(f"[{year}] Verifying serialized annual pixels...", flush=True)
        verify_annual(staged, summary)
        with tempfile.NamedTemporaryFile(dir=out_dir, prefix=f"run_summary_{year}_",
                                         suffix=".tmp", delete=False) as handle:
            staged_summary = Path(handle.name)
        summary.to_csv(staged_summary, index=False)
        staged.replace(out_dir / f"fire_pixels_{year}.csv")
        staged_summary.replace(out_dir / f"run_summary_{year}.csv")
        (out_dir / "README_fire_pixels.txt").write_text(
            ANNUAL_GUIDE.format(columns=", ".join(PIXEL_COLS)), encoding="utf-8")
        print(f"DONE {year}: {len(summary)} countries, {time.time() - start:.1f}s", flush=True)
        return summary
    finally:
        staged.unlink(missing_ok=True)
        if staged_summary is not None:
            staged_summary.unlink(missing_ok=True)


def run(countries, year, sensors, out_dir):
    out_dir = Path(out_dir)
    (out_dir / "fire_clusters").mkdir(parents=True, exist_ok=True)
    (out_dir / "fire_pixels").mkdir(parents=True, exist_ok=True)
    (out_dir / f"README_fire_files_{year}.txt").write_text(
        FILE_GUIDE.format(year=year, touch=TOUCH_FACTOR, slack=SLACK_KM), encoding="utf-8")

    offset = {"fire_id": 0, "pass_id": 0, "pass_fire_id": 0}       # make ids unique across countries
    summary = []
    t_start = time.time()
    for k, country in enumerate(countries, 1):
        t0 = time.time()
        parts = []
        for s in sensors:
            try:
                parts.append(load_country(s, country, year))
            except FileNotFoundError:
                pass
        parts = [p for p in parts if len(p)]
        if not parts:
            print(f"[{k}/{len(countries)}] {country}: no vegetation pixels, skipped", flush=True)
            continue
        px = pd.concat(parts, ignore_index=True)
        n_modis, n_viirs = int((px.sensor == "MODIS").sum()), int((px.sensor == "VIIRS").sum())
        n_in, frp_in = len(px), px["frp"].sum()

        pixels, clusters = build(px, country)
        del px
        check(pixels, clusters, n_in, frp_in)
        for col, off in offset.items():
            pixels[col] += off
        clusters["fire_id"] += offset["fire_id"]
        for col in offset:
            offset[col] = int(pixels[col].max()) + 1

        clusters.round({"lat": 5, "lon": 5, "radius_km": 3, "passes_avg_frp_mw": 3, "passes_min_frp_mw": 3,
                        "passes_max_frp_mw": 3, "modis_frp_mw": 3, "viirs_frp_mw": 3}).to_csv(
            out_dir / "fire_clusters" / f"fire_clusters_{year}_{country}.csv", index=False)
        pixels.to_csv(out_dir / "fire_pixels" / f"fire_pixels_{year}_{country}.csv", index=False)

        both = clusters.seen_by_modis & clusters.seen_by_viirs
        summary.append({"country": country, "modis_pixels": n_modis, "viirs_pixels": n_viirs,
                        "fires": len(clusters), "fires_seen_by_both": int(both.sum()),
                        "fires_modis_only": int((clusters.seen_by_modis & ~clusters.seen_by_viirs).sum()),
                        "fires_viirs_only": int((clusters.seen_by_viirs & ~clusters.seen_by_modis).sum()),
                        "total_frp_mw": round(clusters.passes_avg_frp_mw.sum(), 1),
                        "median_fire_frp_mw": round(clusters.passes_avg_frp_mw.median(), 2),
                        "median_radius_km": round(clusters.radius_km.median(), 3),
                        "max_radius_km": round(clusters.radius_km.max(), 3),
                        "seconds": round(time.time() - t0, 1)})
        print(f"[{k}/{len(countries)}] {country}: {n_in:,} pixels -> {len(clusters):,} fires, "
              f"FRP {clusters.passes_avg_frp_mw.sum():,.0f} MW, {time.time() - t0:.1f}s", flush=True)
        del pixels, clusters

    s = pd.DataFrame(summary)
    summary_file = out_dir / f"run_summary_{year}.csv"
    if summary_file.exists():          # re-running some countries: keep the other countries' lines
        old = pd.read_csv(summary_file)
        s = pd.concat([old[~old.country.isin(s.country)], s]).sort_values("country").reset_index(drop=True)
    s.to_csv(summary_file, index=False)
    new = pd.DataFrame(summary)
    print(f"\nDONE {len(new)} countries in {time.time() - t_start:.0f}s: "
          f"{new.modis_pixels.sum() + new.viirs_pixels.sum():,} pixels -> {new.fires.sum():,} fires, "
          f"total FRP {new.total_frp_mw.sum():,.0f} MW -> {out_dir}", flush=True)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("countries", nargs="*", help="country names as in the file names (default: --all)")
    ap.add_argument("--all", action="store_true", help="every country that has a MODIS or VIIRS file")
    years = ap.add_mutually_exclusive_group()
    years.add_argument("--year", type=int, default=2025)
    years.add_argument("--all-years", action="store_true", help="process all discovered input years")
    ap.add_argument("--sensors", nargs="+", choices=list(FILE_PATTERN), default=["MODIS", "VIIRS"])
    ap.add_argument("--layout", choices=["country", "annual-pixels"], default="country")
    ap.add_argument("--out", default=str(ROOT / "new_outputs"))
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        selftest()
    else:
        sensors = list(dict.fromkeys(a.sensors))
        selected_years = list_years(sensors) if a.all_years else [a.year]
        if not selected_years:
            ap.error(f"no input years found under {ROOT / 'modis'} or {ROOT / 'viirs'}")
        for year in selected_years:
            todo = list_countries(year, sensors) if (a.all or not a.countries) else a.countries
            if not todo:
                ap.error(f"no input country CSVs found for {year}")
            runner = run_annual if a.layout == "annual-pixels" else run
            runner(todo, year, sensors, a.out)


if __name__ == "__main__":
    main()
