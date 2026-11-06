#!/usr/bin/env python3
"""Prepara le foto dei raduni per la galleria del sito.

Flusso per aggiungere le foto di un raduno:
  1. Scarica le foto da Google Foto in una cartella con la data del raduno,
     es. ~/Desktop/foto-raduni/2026-10-23/ (rinomina la copertina in
     "copertina.jpg" se vuoi sceglierla; altrimenti si usa la prima).
  2. Lancia:  python3 scripts/prepara-foto.py ~/Desktop/foto-raduni [2026-10-23 ...]
  3. Controlla il sito in locale, poi commit e push.

Per ogni foto crea due WebP senza metadati (niente GPS): una grande
(lato lungo 1600px) e una miniatura (600px), in foto/<data>/grandi e
foto/<data>/mini, e aggiorna foto/foto.json. Ogni data elaborata viene
rigenerata da zero; le altre restano intatte.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
HEIC_EXTS = {".heic", ".heif"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FULL = (1600, 80)   # lato lungo massimo, qualità WebP
THUMB = (600, 75)


def event_dates(eventi_js: str) -> set:
    """Date AAAA-MM-GG dei raduni, lette dai campi start di js/eventi.js."""
    return set(re.findall(r'start:\s*"(\d{4}-\d{2}-\d{2})T', eventi_js))


def ordered_sources(folder: Path) -> list:
    """Immagini della cartella in ordine di nome, con copertina.* per prima."""
    files = [p for p in folder.iterdir()
             if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXTS]
    files.sort(key=lambda p: (p.stem.lower() != "copertina", p.name.lower()))
    return files


def _open_rgb(path: Path, tmpdir: Path) -> Image.Image:
    if path.suffix.lower() in HEIC_EXTS:
        jpg = tmpdir / (path.stem + ".jpg")
        subprocess.run(["sips", "-s", "format", "jpeg", str(path), "--out", str(jpg)],
                       check=True, capture_output=True)
        path = jpg
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        icc = img.info.get("icc_profile")
        img = img.convert("RGB")
    if icc:
        img.info["icc_profile"] = icc
    return img


def _save_webp(img: Image.Image, dest: Path, spec) -> tuple:
    size, quality = spec
    copy = img.copy()
    copy.thumbnail((size, size), Image.Resampling.LANCZOS)
    kwargs = {"quality": quality, "method": 6}
    icc = img.info.get("icc_profile")
    if icc:
        kwargs["icc_profile"] = icc
    copy.save(dest, "WEBP", **kwargs)
    return copy.size


def process_date(src: Path, out_root: Path, date: str):
    """Rigenera out_root/<date>/ dalle foto di src. Ritorna (voce manifest | None, avvisi).

    Le foto vengono preparate in una cartella temporanea e sostituiscono quelle
    pubblicate solo a lavoro finito: se lo script si interrompe, la galleria
    online resta com'era.
    """
    warnings = []
    final = out_root / date
    dest = out_root / f".{date}.tmp"
    if dest.exists():
        shutil.rmtree(dest)
    (dest / "grandi").mkdir(parents=True)
    (dest / "mini").mkdir(parents=True)
    try:
        return _fill(src, dest, final, warnings)
    finally:
        if dest.exists():
            shutil.rmtree(dest)


def _fill(src: Path, dest: Path, final: Path, warnings: list):

    for p in src.iterdir():
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() not in IMAGE_EXTS:
            warnings.append(f"{p.name}: saltato (non è una foto)")

    photos = []
    with tempfile.TemporaryDirectory() as tmp:
        for path in ordered_sources(src):
            try:
                img = _open_rgb(path, Path(tmp))
                name = f"{len(photos) + 1:03d}.webp"
                w, h = _save_webp(img, dest / "grandi" / name, FULL)
                tw, th = _save_webp(img, dest / "mini" / name, THUMB)
            except (OSError, Image.DecompressionBombError, subprocess.CalledProcessError) as exc:
                warnings.append(f"{path.name}: saltato ({exc.__class__.__name__})")
                continue
            photos.append({"file": name, "w": w, "h": h, "tw": tw, "th": th})

    if final.exists():
        shutil.rmtree(final)
    if not photos:
        return None, warnings
    dest.rename(final)
    return {"cover": 0, "photos": photos}, warnings


def update_manifest(out_root: Path, entries: dict) -> dict:
    """Unisce le voci a foto.json (None = rimuovi la data) e lo riscrive."""
    path = out_root / "foto.json"
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            manifest = {}
    except (OSError, ValueError):
        manifest = {}
    for date, entry in entries.items():
        if entry is None:
            manifest.pop(date, None)
        else:
            manifest[date] = entry
    out_root.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


def _size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / 1_000_000


def main(argv) -> int:
    ap = argparse.ArgumentParser(description="Prepara le foto dei raduni per la galleria.")
    ap.add_argument("sorgente", type=Path, help="cartella con le sottocartelle AAAA-MM-GG")
    ap.add_argument("date", nargs="*", help="elabora solo queste date (AAAA-MM-GG)")
    ap.add_argument("--out", type=Path, default=ROOT / "foto")
    ap.add_argument("--eventi", type=Path, default=ROOT / "js" / "eventi.js")
    args = ap.parse_args(argv)

    if not args.sorgente.is_dir():
        print(f"Cartella non trovata: {args.sorgente}", file=sys.stderr)
        return 1

    try:
        known = event_dates(args.eventi.read_text(encoding="utf-8"))
    except OSError:
        known = None
        print(f"Attenzione: {args.eventi} non trovato, non controllo le date dei raduni.")

    folders = sorted(p for p in args.sorgente.iterdir() if p.is_dir())
    if args.date:
        wanted = set(args.date)
        folders = [p for p in folders if p.name in wanted]
        for missing in sorted(wanted - {p.name for p in folders}):
            print(f"{missing}: cartella non trovata in {args.sorgente}")

    for folder in folders:
        if not DATE_RE.match(folder.name):
            print(f"{folder.name}: saltata (il nome deve essere una data AAAA-MM-GG)")
            continue
        date = folder.name
        if known is not None and date not in known:
            print(f"{date}: attenzione, nessun raduno con questa data in {args.eventi.name}")
        entry, warnings = process_date(folder, args.out, date)
        for w in warnings:
            print(f"{date}: {w}")
        update_manifest(args.out, {date: entry})  # subito: un'interruzione non lascia il manifest indietro
        if entry is None:
            print(f"{date}: nessuna foto valida, data rimossa dalla galleria")
        else:
            print(f"{date}: {len(entry['photos'])} foto, {_size_mb(args.out / date):.1f} MB")

    print(f"Totale foto/: {_size_mb(args.out):.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
