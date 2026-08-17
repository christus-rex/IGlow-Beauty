#!/usr/bin/env python3
"""Build 20-second downloadable before/after MP4 slideshows for published portfolio cases.

Each source image is shown for exactly 10 seconds. The case title is overlaid subtly,
with a small BEFORE/AFTER cue. Source image files are never modified.
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "transformations.json"
WIDTH = 1080
HEIGHT = 1440
FPS = 30
SEGMENT_SECONDS = 10
EXPECTED_DURATION = SEGMENT_SECONDS * 2

FONT_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
]


def require_tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise SystemExit(f"Required tool not found: {name}")
    return path


def find_font() -> Path:
    for candidate in FONT_CANDIDATES:
        if candidate.is_file():
            return candidate
    raise SystemExit("No supported font file found for FFmpeg drawtext overlays.")


def escape_drawtext(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def resolve_media(ref: str, temp_dir: Path, label: str) -> Path:
    if ref.startswith(("https://", "http://")):
        parsed = urllib.parse.urlparse(ref)
        suffix = Path(parsed.path).suffix or ".img"
        destination = temp_dir / f"{label}{suffix}"
        request = urllib.request.Request(
            ref,
            headers={"User-Agent": "iGlow-showcase-video-builder/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            destination.write_bytes(response.read())
        return destination

    path = ROOT / ref.removeprefix("./")
    if not path.is_file():
        raise SystemExit(f"Missing local showcase source: {path}")
    return path


def build_case(ffmpeg: str, ffprobe: str, font: Path, item: dict) -> Path:
    item_id = str(item.get("id") or "unknown")
    video_ref = item.get("showcase_video") or f"./assets/videos/{item_id.lower()}.mp4"

    before_ref = item.get("before_image")
    after_ref = item.get("after_image")
    if not before_ref or not after_ref:
        raise SystemExit(f"{item_id}: both before_image and after_image are required.")

    output = ROOT / str(video_ref).removeprefix("./")
    output.parent.mkdir(parents=True, exist_ok=True)
    title = escape_drawtext(str(item.get("title") or item.get("service") or "Client Transformation"))
    font_ref = escape_drawtext(str(font))

    with tempfile.TemporaryDirectory(prefix=f"iglow-{item_id.lower()}-") as temp_name:
        temp_dir = Path(temp_name)
        before = resolve_media(str(before_ref), temp_dir, "before")
        after = resolve_media(str(after_ref), temp_dir, "after")

        common = (
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
            f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,"
            f"drawtext=fontfile='{font_ref}':text='{title}':"
            "fontcolor=0xD4AF37@0.84:fontsize=42:"
            "box=1:boxcolor=black@0.24:boxborderw=15:"
            "x=(w-text_w)/2:y=42,"
        )
        before_filter = (
            common
            + "drawtext=fontfile='{}':text='BEFORE':fontcolor=white@0.82:fontsize=28:"
              "box=1:boxcolor=black@0.28:boxborderw=11:x=34:y=h-72,"
              "fade=t=in:st=0:d=0.30,fade=t=out:st=9.70:d=0.30,setpts=PTS-STARTPTS[b]"
        ).format(font_ref)
        after_filter = (
            common
            + "drawtext=fontfile='{}':text='AFTER':fontcolor=white@0.82:fontsize=28:"
              "box=1:boxcolor=black@0.28:boxborderw=11:x=34:y=h-72,"
              "fade=t=in:st=0:d=0.30,fade=t=out:st=9.70:d=0.30,setpts=PTS-STARTPTS[a]"
        ).format(font_ref)
        filter_complex = f"[0:v]{before_filter};[1:v]{after_filter};[b][a]concat=n=2:v=1:a=0[v]"

        command = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-loop",
            "1",
            "-t",
            str(SEGMENT_SECONDS),
            "-i",
            str(before),
            "-loop",
            "1",
            "-t",
            str(SEGMENT_SECONDS),
            "-i",
            str(after),
            "-filter_complex",
            filter_complex,
            "-map",
            "[v]",
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-an",
            str(output),
        ]
        subprocess.run(command, check=True)

    duration_text = subprocess.check_output(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(output),
        ],
        text=True,
    ).strip()
    duration = float(duration_text)
    if not math.isclose(duration, EXPECTED_DURATION, abs_tol=0.05):
        raise SystemExit(
            f"{item_id}: generated MP4 duration {duration:.3f}s, expected {EXPECTED_DURATION}s."
        )

    print(
        f"{item_id}: built {output.relative_to(ROOT)} • {duration:.3f}s • "
        f"{output.stat().st_size:,} bytes"
    )
    return output


def main() -> None:
    ffmpeg = require_tool("ffmpeg")
    ffprobe = require_tool("ffprobe")
    font = find_font()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))

    built = 0
    for item in catalog.get("transformations", []):
        if not (
            item.get("consent_confirmed") is True
            and item.get("publication_authorized") is True
            and item.get("before_image")
            and item.get("after_image")
        ):
            continue
        build_case(ffmpeg, ffprobe, font, item)
        built += 1

    if not built:
        raise SystemExit("No publishable showcase videos were configured.")
    print(f"Built {built} downloadable showcase MP4 slideshow(s).")


if __name__ == "__main__":
    main()
