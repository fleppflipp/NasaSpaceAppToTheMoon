FIRE OUTPUT FILES  (made by fire_calendar.py from FIRMS MODIS + VIIRS 2025, vegetation fires only = type 0)
=====================================================================================================

For every country there are TWO files with different names and different columns:

  fire_clusters/fire_clusters_2025_<Country>.csv   ONE ROW PER FIRE    (use this for counting, maps, calendar)
  fire_pixels/fire_pixels_2025_<Country>.csv       ONE ROW PER PIXEL   (the raw detections behind each fire)

They are linked by fire_id: all rows in fire_pixels with fire_id = 123 are the pixels of the fire
with fire_id = 123 in fire_clusters. Ids are unique across ALL countries of this run.
run_summary_2025.csv has one line per country (pixels in, fires out, total FRP).

What is a "fire" here?
  All MODIS (Terra, Aqua) and VIIRS (NOAA-20 = "N20") pixels of one LOCAL SOLAR DAY
  (local time = UTC + longitude/15 hours) that are joined by these two rules:
    - same pass (same satellite, same fly-over):   pixels TOUCH   if distance <= 0.75 x (size_a + size_b)
      -> one big fire spread over several neighbouring pixels becomes one fire
    - different pass or satellite:                  pixels OVERLAP if distance <= size_a/2 + size_b/2 + 0.5 km
      -> the same fire seen again by another pass / satellite is the SAME fire (counted once)
  size = max(scan, track) of the pixel in km. A fire can have 1 pixel or many.

-----------------------------------------------------------------------------------------------------
FILE 1: fire_clusters_2025_<Country>.csv  - one row per fire
-----------------------------------------------------------------------------------------------------
  country            country of the input file
  fire_id            id of the fire (links to fire_pixels)
  local_date         local solar date of the fire
  lat, lon           centre of the fire = average position of all its pixel centres (degrees)
  radius_km          radius of a circle around (lat, lon) that contains EVERY pixel of the fire completely
                     (distance to the farthest pixel centre + half that pixel's diagonal). A 1-pixel fire has
                     radius = half its pixel diagonal (VIIRS ~0.27-0.6 km, MODIS ~0.7-2.6 km).
  frp_mw             FRP of the WHOLE fire in megawatts:
                       1) for each pass, add up the FRP of all the fire's pixels in that pass
                          (the pixels are different parts of the fire at the same moment)
                       2) take the AVERAGE of these pass totals
                     FRP is never added across passes: a fire seen by 3 passes is not 3x bigger.
  frp_min_mw         smallest pass total
  frp_max_mw         largest pass total
  modis_frp_mw       average of the MODIS pass totals (empty if MODIS did not see the fire)
  viirs_frp_mw       average of the VIIRS pass totals (empty if VIIRS did not see the fire)
  n_passes           how many passes saw the fire that day
  n_day_passes       ... of which in daytime
  n_night_passes     ... of which at night
  n_modis_passes     ... of which MODIS (Terra or Aqua)
  n_viirs_passes     ... of which VIIRS (NOAA-20)
  satellites         which satellites saw it, e.g. "Aqua+N20"
  seen_by_modis      True / False
  seen_by_viirs      True / False   (seen_by_viirs True and seen_by_modis False = a fire only VIIRS caught)
  n_pixels           number of pixel rows in fire_pixels for this fire (all passes together; NOT an area)
  n_pixels_max_pass  pixels of the fire in its largest single pass (a better size measure)
  first_seen_utc     time of the first pass that saw the fire (UTC)
  last_seen_utc      time of the last pass that saw the fire (UTC)

-----------------------------------------------------------------------------------------------------
FILE 2: fire_pixels_2025_<Country>.csv  - one row per pixel (= one row of the original FIRMS files)
-----------------------------------------------------------------------------------------------------
  country            country of the input file
  fire_id            the fire this pixel belongs to (many pixels -> one fire)
  pass_id            the pass this pixel comes from (one satellite, one fly-over; one pass contains many fires)
  pass_fire_id       the fire as seen in this ONE pass (the touching pixels of one picture). One fire_id can
                     have several pass_fire_ids (one per pass, sometimes more if a picture shows the fire in pieces)
  sensor             MODIS or VIIRS
  satellite          Terra, Aqua (MODIS) or N20 (VIIRS on NOAA-20)
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
  fire_clusters = the summary: 1 row = 1 fire. Count rows to count fires; sum frp_mw to get total FRP.
                  A circle (lat, lon, radius_km) shows where the fire is.
  fire_pixels   = the detail: 1 row = 1 detection. Use it for the exact shape of a fire (draw each pixel as a
                  scan_km x track_km rectangle around lat, lon), or for individual pixel FRP values.
                  Do NOT count rows here as fires and do NOT sum frp over all rows of a fire
                  (that would add the same fire seen by several passes several times).
