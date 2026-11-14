"""Annual export integration tests using small, real-schema FIRMS CSV fixtures."""
import contextlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

import fire_calendar as fc


class AnnualExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / "harmonized"
        self.root_patch = patch.object(fc, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)

    def source(self, sensor, country, year=2025, vegetation=True, lon=0):
        row = dict(latitude=0, longitude=lon, scan=0.375, track=0.375,
                   acq_date=f"{year}-01-01", acq_time="0023",
                   satellite="N" if sensor == "VIIRS" else "Aqua",
                   confidence="n" if sensor == "VIIRS" else "55", frp=7.5,
                   daynight="N", type=0 if vegetation else 2)
        row.update({"bright_ti4" if sensor == "VIIRS" else "brightness": 330,
                    "bright_ti5" if sensor == "VIIRS" else "bright_t31": 300})
        path = self.root / fc.FILE_PATTERN[sensor].format(year=year, country=country)
        path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame([row]).to_csv(path, index=False)
        return path

    def run_year(self, countries, year=2025):
        with contextlib.redirect_stdout(io.StringIO()):
            return fc.run_annual(countries, year, ["MODIS", "VIIRS"], self.out)

    def test_merge_single_sensor_empty_and_rerun(self):
        self.source("MODIS", "A")
        self.source("VIIRS", "A")
        self.source("VIIRS", "B")
        self.source("MODIS", "C", vegetation=False)
        summary = self.run_year(["C", "B", "A"])
        path = self.out / "fire_pixels_2025.csv"
        first = path.read_bytes()
        px = pd.read_csv(path)
        self.assertEqual(list(px.columns), fc.PIXEL_COLS)
        self.assertEqual(len(px), 3)
        self.assertEqual(px.country.tolist(), ["A", "A", "B"])
        self.assertEqual(px[px.country == "A"].fire_id.nunique(), 1)
        self.assertEqual(set(px[px.sensor == "VIIRS"].satellite), {"N"})
        for col in ["fire_id", "pass_id", "pass_fire_id"]:
            self.assertTrue(set(px[px.country == "A"][col]).isdisjoint(px[px.country == "B"][col]))
        self.assertEqual(summary.set_index("country").loc["C", "fires"], 0)
        self.assertEqual(summary.viirs_pixels.sum(), 2)
        self.assertEqual(summary.modis_pixel_frp_mw.sum(), 7.5)
        self.assertFalse((self.out / "fire_clusters").exists())
        self.run_year(["A", "B", "C"])
        self.assertEqual(path.read_bytes(), first)
        self.assertEqual(path.read_text().count(",".join(fc.PIXEL_COLS)), 1)

    def test_empty_year_and_header_only_input(self):
        path = self.source("MODIS", "Empty", vegetation=False)
        self.source("VIIRS", "Empty", vegetation=False)
        pd.read_csv(path).iloc[:0].to_csv(path, index=False)
        summary = self.run_year(["Empty"])
        px = pd.read_csv(self.out / "fire_pixels_2025.csv")
        self.assertTrue(px.empty)
        self.assertEqual(list(px.columns), fc.PIXEL_COLS)
        self.assertEqual(summary.fires.sum(), 0)

    def test_failure_preserves_published_files(self):
        self.source("MODIS", "A")
        self.run_year(["A"])
        paths = [self.out / "fire_pixels_2025.csv", self.out / "run_summary_2025.csv"]
        before = [p.read_bytes() for p in paths]
        bad = self.source("VIIRS", "Z")
        bad.write_text("broken\nvalue\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "viirs-snpp_2025_Z.csv"):
            self.run_year(["A", "Z"])
        self.assertEqual([p.read_bytes() for p in paths], before)
        self.assertFalse(list(self.out.glob("*.tmp")))

    def test_discovery_all_years_and_source_year_boundary(self):
        self.source("VIIRS", "Only_Viirs", year=2012, lon=-170)
        self.source("MODIS", "Only_Modis", year=2025)
        self.assertEqual(fc.list_years(["MODIS", "VIIRS"]), [2012, 2025])
        self.assertEqual(fc.list_countries(2012, ["MODIS", "VIIRS"]), ["Only_Viirs"])
        with contextlib.redirect_stdout(io.StringIO()):
            fc.main(["--all-years", "--layout", "annual-pixels", "--out", str(self.out)])
        px = pd.read_csv(self.out / "fire_pixels_2012.csv")
        self.assertEqual(px.local_date.iloc[0], "2011-12-31")
        self.assertEqual(px.time_utc.iloc[0], "2012-01-01 00:23:00")
        self.assertEqual(px.fire_id.iloc[0], 0)
        self.assertEqual(pd.read_csv(self.out / "fire_pixels_2025.csv").fire_id.iloc[0], 0)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            fc.main(["--year", "2025", "--all-years"])

    def test_verification_failure_preserves_file(self):
        self.source("MODIS", "A")
        self.run_year(["A"])
        path = self.out / "fire_pixels_2025.csv"
        before = path.read_bytes()
        with patch.object(fc, "verify_annual", side_effect=ValueError("check failed")):
            with self.assertRaisesRegex(ValueError, "check failed"):
                self.run_year(["A"])
        self.assertEqual(path.read_bytes(), before)

    def test_serialized_frp_corruption_is_detected(self):
        self.source("MODIS", "A")
        summary = self.run_year(["A"])
        path = self.out / "fire_pixels_2025.csv"
        px = pd.read_csv(path)
        px["frp"] = 99
        px.to_csv(path, index=False)
        with self.assertRaisesRegex(ValueError, "FRP mismatch"):
            fc.verify_annual(path, summary)

    def test_legacy_country_export(self):
        self.source("MODIS", "A")
        with contextlib.redirect_stdout(io.StringIO()):
            fc.main(["A", "--year", "2025", "--out", str(self.out)])
        self.assertTrue((self.out / "fire_pixels/fire_pixels_2025_A.csv").exists())
        self.assertTrue((self.out / "fire_clusters/fire_clusters_2025_A.csv").exists())

    def test_missing_timestamp_reports_source_path(self):
        path = self.source("VIIRS", "MissingTime")
        source = pd.read_csv(path)
        source["acq_time"] = ""
        source.to_csv(path, index=False)
        with self.assertRaisesRegex(ValueError, "viirs-snpp_2025_MissingTime.csv"):
            self.run_year(["MissingTime"])
        self.assertFalse((self.out / "fire_pixels_2025.csv").exists())


if __name__ == "__main__":
    unittest.main()
