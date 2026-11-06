"""Test di scripts/prepara-foto.py — lanciare con:
python3 -m unittest tests/test_prepara_foto.py -v
"""
import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("prepara_foto", ROOT / "scripts" / "prepara-foto.py")
pf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pf)


def make_jpeg(path, size=(400, 300), exif=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, (200, 40, 200))
    kwargs = {"exif": exif} if exif is not None else {}
    img.save(path, "JPEG", **kwargs)
    return path


def opened(path):
    """Apre un'immagine, ne copia dimensioni/formato/metadati e la chiude."""
    with Image.open(path) as img:
        return {"size": img.size, "format": img.format, "exif": img.getexif(), "info": dict(img.info)}


class TempDirTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.src = self.tmp / "src" / "2026-10-23"
        self.out = self.tmp / "foto"

    def tearDown(self):
        self._tmp.cleanup()


class EventDatesTest(unittest.TestCase):
    def test_event_dates(self):
        js = '''
        { id: "a", start: "2026-10-23T20:30:00", end: "00:00" },
        { id: "b", start: "2026-04-07T00:30:00", end: "02:00" },
        '''
        self.assertEqual(pf.event_dates(js), {"2026-10-23", "2026-04-07"})


class OrderedSourcesTest(TempDirTest):
    def test_ordered_sources_cover_first_and_case_insensitive(self):
        for name in ["b.JPG", "a.jpg", "copertina.jpeg"]:
            make_jpeg(self.src / name)
        for name in ["video.MP4", "meta.json", ".DS_Store"]:
            (self.src / name).write_bytes(b"x")
        names = [p.name for p in pf.ordered_sources(self.src)]
        self.assertEqual(names, ["copertina.jpeg", "a.jpg", "b.JPG"])


class ProcessDateTest(TempDirTest):
    def test_process_date_sizes_and_names(self):
        make_jpeg(self.src / "a.jpg", (4000, 3000))
        make_jpeg(self.src / "b.jpg", (800, 600))
        entry, warnings = pf.process_date(self.src, self.out, "2026-10-23")
        d = self.out / "2026-10-23"
        self.assertEqual(opened(d / "grandi" / "001.webp")["size"], (1600, 1200))
        self.assertEqual(opened(d / "mini" / "001.webp")["size"], (600, 450))
        self.assertEqual(opened(d / "grandi" / "002.webp")["size"], (800, 600))
        self.assertEqual(entry["cover"], 0)
        self.assertEqual(entry["photos"][0], {"file": "001.webp", "w": 1600, "h": 1200, "tw": 600, "th": 450})
        self.assertEqual(len(entry["photos"]), 2)
        self.assertEqual(warnings, [])

    def test_process_date_applies_orientation(self):
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation: ruotata di 90° in senso orario
        make_jpeg(self.src / "a.jpg", (400, 200), exif=exif)
        pf.process_date(self.src, self.out, "2026-10-23")
        self.assertEqual(opened(self.out / "2026-10-23" / "grandi" / "001.webp")["size"], (200, 400))

    def test_process_date_strips_exif_gps(self):
        exif = Image.Exif()
        exif[0x010F] = "Apple"  # Make
        gps = exif.get_ifd(0x8825)
        gps[1] = "N"
        gps[2] = (45.0, 39.0, 0.0)
        make_jpeg(self.src / "a.jpg", exif=exif)
        self.assertIn(0x8825, opened(self.src / "a.jpg")["exif"])  # il sorgente ha davvero il GPS
        pf.process_date(self.src, self.out, "2026-10-23")
        for size in ["grandi", "mini"]:
            out = opened(self.out / "2026-10-23" / size / "001.webp")
            self.assertEqual(len(out["exif"]), 0)
            self.assertNotIn("exif", out["info"])
            self.assertNotIn("xmp", out["info"])

    def test_process_date_rerun_removes_stale(self):
        for name in ["a.jpg", "b.jpg", "c.jpg"]:
            make_jpeg(self.src / name)
        pf.process_date(self.src, self.out, "2026-10-23")
        (self.src / "c.jpg").unlink()
        entry, _ = pf.process_date(self.src, self.out, "2026-10-23")
        files = sorted(p.name for p in (self.out / "2026-10-23" / "grandi").iterdir())
        self.assertEqual(files, ["001.webp", "002.webp"])
        self.assertEqual(len(entry["photos"]), 2)

    def test_process_date_corrupt_file_warns_and_continues(self):
        self.src.mkdir(parents=True)
        (self.src / "rotto.jpg").write_bytes(os.urandom(2048))
        make_jpeg(self.src / "buona.jpg")
        entry, warnings = pf.process_date(self.src, self.out, "2026-10-23")
        self.assertEqual(len(entry["photos"]), 1)
        self.assertTrue(any("rotto.jpg" in w for w in warnings), warnings)

    def test_process_date_no_valid_photos_returns_none(self):
        self.src.mkdir(parents=True)
        (self.src / "video.mp4").write_bytes(b"x")
        entry, _ = pf.process_date(self.src, self.out, "2026-10-23")
        self.assertIsNone(entry)
        self.assertFalse((self.out / "2026-10-23").exists())

    @unittest.skipUnless(shutil.which("sips"), "sips non disponibile")
    def test_process_date_heic(self):
        jpg = make_jpeg(self.tmp / "tmp.jpg", (640, 480))
        self.src.mkdir(parents=True)
        subprocess.run(["sips", "-s", "format", "heic", str(jpg), "--out", str(self.src / "IMG_0001.HEIC")],
                       check=True, capture_output=True)
        entry, warnings = pf.process_date(self.src, self.out, "2026-10-23")
        self.assertEqual(warnings, [])
        self.assertEqual(entry["photos"][0]["w"], 640)
        self.assertEqual(opened(self.out / "2026-10-23" / "grandi" / "001.webp")["format"], "WEBP")


class UpdateManifestTest(TempDirTest):
    def test_update_manifest_merges_and_removes(self):
        self.out.mkdir()
        old = {"cover": 0, "photos": [{"file": "001.webp", "w": 1, "h": 1, "tw": 1, "th": 1}]}
        (self.out / "foto.json").write_text(json.dumps({"2026-04-07": old}))
        new = {"cover": 0, "photos": [{"file": "001.webp", "w": 2, "h": 2, "tw": 2, "th": 2}]}
        result = pf.update_manifest(self.out, {"2026-10-23": new, "2026-04-07": None})
        self.assertEqual(result, {"2026-10-23": new})
        self.assertEqual(json.loads((self.out / "foto.json").read_text()), {"2026-10-23": new})


class MainTest(TempDirTest):
    def test_main_skips_bad_folder_names_and_warns_unknown_date(self):
        src = self.tmp / "src"
        make_jpeg(src / "appunti" / "a.jpg")
        make_jpeg(src / "2025-01-01" / "a.jpg")
        eventi = self.tmp / "eventi.js"
        eventi.write_text('{ start: "2026-10-23T20:30:00" }')
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = pf.main([str(src), "--out", str(self.out), "--eventi", str(eventi)])
        out = buf.getvalue()
        self.assertEqual(code, 0)
        self.assertIn("appunti", out)
        self.assertIn("2025-01-01", out)
        self.assertIn("nessun raduno", out)
        manifest = json.loads((self.out / "foto.json").read_text())
        self.assertIn("2025-01-01", manifest)

    def test_main_missing_source_returns_1(self):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            code = pf.main([str(self.tmp / "non-esiste"), "--out", str(self.out)])
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
