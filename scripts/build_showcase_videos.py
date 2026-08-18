#!/usr/bin/env python3
"""Build 7-second downloadable before/after MP4 showcases for published portfolio cases.

Global iGlow video standard:
- 3 seconds Before
- 1 second crossfade transition
- 3 seconds After
- subtle service/title overlay plus BEFORE/AFTER cue

Source image files are never modified.
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
HOLD_SECONDS = 3
TRANSITION_SECONDS = 1
SEGMENT_SECONDS = HOLD_SECONDS + TRANSITION_SECONDS
EXPECTED_DURATION = (HOLD_SECONDS * 2) + TRANSITION_SECONDS

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
            headers={"User-Agent": "iGlow-showcase-video-builder/2.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            destination.write_bytes(response.read())
        return destination

    path = ROOT / ref.removeprefix("./")
    if not path.is_file():
        raise SystemExit(f"Missing local showcase source: {path}")
    return path


def build_segment(
    ffmpeg: str,
    font: Path,
    source: Path,
    output: Path,
    title: str,
    cue: str,
) -> None:
    font_ref = escape_drawtext(str(font))
    cue_ref = escape_drawtext(cue)
    filter_chain = (
        f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
        f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,"
        f"drawtext=fontfile='{font_ref}':text='{title}':"
        "fontcolor=0xD4AF37@0.84:fontsize=42:"
        "box=1:boxcolor=black@0.24:boxborderw=15:"
        "x=(w-text_w)/2:y=42,"
        f"drawtext=fontfile='{font_ref}':text='{cue_ref}':"
        "fontcolor=white@0.82:fontsize=28:"
        "box=1:boxcolor=black@0.28:boxborderw=11:"
        "x=34:y=h-72,"
        f"fps={FPS},format=yuv420p"
    )

    command = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-loop",
        "1",
        "-framerate",
        str(FPS),
        "-t",
        str(SEGMENT_SECONDS),
        "-i",
        str(source),
        "-vf",
        filter_chain,
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
        "-an",
        str(output),
    ]
    subprocess.run(command, check=True)


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

    with tempfile.TemporaryDirectory(prefix=f"iglow-{item_id.lower()}-") as temp_name:
        temp_dir = Path(temp_name)
        before = resolve_media(str(before_ref), temp_dir, "before")
        after = resolve_media(str(after_ref), temp_dir, "after")
        before_segment = temp_dir / "before-segment.mp4"
        after_segment = temp_dir / "after-segment.mp4"

        build_segment(ffmpeg, font, before, before_segment, title, "BEFORE")
        build_segment(ffmpeg, font, after, after_segment, title, "AFTER")

        transition_filter = (
            f"[0:v][1:v]xfade=transition=fade:duration={TRANSITION_SECONDS}:"
            f"offset={HOLD_SECONDS},format=yuv420p[v]"
        )
        command = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(before_segment),
            "-i",
            str(after_segment),
            "-filter_complex",
            transition_filter,
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
        f"{HOLD_SECONDS}s Before + {TRANSITION_SECONDS}s transition + {HOLD_SECONDS}s After • "
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
    print(f"Built {built} downloadable 7-second showcase MP4(s) using the global iGlow video standard.")


if __name__ == "__main__":
    main()
