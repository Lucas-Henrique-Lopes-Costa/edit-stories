#!/usr/bin/env python3
"""
exporter.py — renders subtitles into a video using Pillow + FFmpeg overlay.
Does NOT require libass. Uses Pillow to render subtitle PNGs and FFmpeg
overlay filter to composite them onto the video.

Usage: python3 exporter.py <job_id> <video_id> <file_path>
"""

import sys
import os
import json
import sqlite3
import subprocess
import tempfile
import datetime
import shutil

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")

# Subtitle visual config — keep in sync with lib/subtitle-config.ts
FONT_SIZE = 36
PADDING_X = 22
PADDING_Y = 12
BORDER_RADIUS = 10
BG_COLOR = (0, 0, 0, 209)   # RGBA — semi-transparent black (0.82 * 255 ≈ 209)
TEXT_COLOR = (255, 255, 255, 255)
VERTICAL_CENTER_RATIO = 0.75   # fraction from top where subtitle CENTER sits
MAX_WIDTH_RATIO = 0.88          # max subtitle width as fraction of video width


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def update_job(conn, job_id, status, output_path=None, error=None):
    now = datetime.datetime.utcnow().isoformat() + "Z"
    conn.execute(
        "UPDATE ExportJob SET status=?, outputPath=?, error=?, updatedAt=? WHERE id=?",
        (status, output_path, error, now, job_id),
    )
    conn.commit()


def update_video(conn, video_id, status):
    now = datetime.datetime.utcnow().isoformat() + "Z"
    conn.execute(
        "UPDATE Video SET status=?, updatedAt=? WHERE id=?",
        (status, now, video_id),
    )
    conn.commit()


def get_video_dimensions(file_path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", file_path,
        ],
        capture_output=True, text=True, check=True,
    )
    info = json.loads(result.stdout)
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            return stream["width"], stream["height"]
    return 1920, 1080


def find_font():
    """Find a usable TTF font on macOS."""
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/Geneva.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def wrap_text(text, font, max_width, draw):
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_subtitle_png(text, video_w, video_h, out_path):
    """Render subtitle text as a transparent PNG at full video resolution."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (video_w, video_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_path = find_font()
    try:
        font = ImageFont.truetype(font_path, FONT_SIZE) if font_path else ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    max_text_w = int(video_w * MAX_WIDTH_RATIO)

    lines = wrap_text(text, font, max_text_w, draw)

    # Measure total text block
    line_bboxes = [draw.textbbox((0, 0), line, font=font) for line in lines]
    line_heights = [b[3] - b[1] for b in line_bboxes]
    line_widths = [b[2] - b[0] for b in line_bboxes]
    line_spacing = 6

    block_w = max(line_widths) if line_widths else 0
    block_h = sum(line_heights) + line_spacing * (len(lines) - 1)

    box_w = block_w + PADDING_X * 2
    box_h = block_h + PADDING_Y * 2

    box_x = (video_w - box_w) // 2
    # Center the box at VERTICAL_CENTER_RATIO from the top
    box_y = int(video_h * VERTICAL_CENTER_RATIO) - box_h // 2

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [box_x, box_y, box_x + box_w, box_y + box_h],
        radius=BORDER_RADIUS,
        fill=BG_COLOR,
    )

    # Draw each line of text centered
    y_cursor = box_y + PADDING_Y
    for i, line in enumerate(lines):
        lw = line_widths[i]
        x = box_x + (box_w - lw) // 2
        draw.text((x, y_cursor), line, font=font, fill=TEXT_COLOR)
        y_cursor += line_heights[i] + line_spacing

    img.save(out_path, "PNG")


def build_filter_complex(segments, tmp_dir, video_w, video_h):
    """
    Build FFmpeg filter_complex string that overlays each subtitle PNG
    at the right time range. Returns (filter_str, input_args).
    """
    input_args = []
    filter_parts = []

    # Input 0 is the source video. Inputs 1..N are subtitle PNGs.
    prev = "[0:v]"

    for i, seg in enumerate(segments):
        png_path = os.path.join(tmp_dir, f"sub_{i:04d}.png")
        input_args += ["-i", png_path]

        input_idx = i + 1  # 0 is the source video
        start = seg["startTime"]
        end = seg["endTime"]
        out_label = f"[v{i}]"

        filter_parts.append(
            f"{prev}[{input_idx}:v]overlay=x=0:y=0:"
            f"enable='between(t,{start},{end})'{out_label}"
        )
        prev = out_label

    # Final output label
    filter_str = ";".join(filter_parts)
    # Replace last label with [vout]
    if filter_parts:
        filter_str = filter_str[: filter_str.rfind(out_label)] + "[vout]"
    else:
        filter_str = "[0:v]copy[vout]"

    return filter_str, input_args


def main():
    if len(sys.argv) < 4:
        print("Usage: exporter.py <job_id> <video_id> <file_path>", file=sys.stderr)
        sys.exit(1)

    job_id = sys.argv[1]
    video_id = sys.argv[2]
    file_path = sys.argv[3]

    os.makedirs(EXPORTS_DIR, exist_ok=True)
    conn = get_db()
    tmp_dir = tempfile.mkdtemp(prefix="edit_stories_export_")

    try:
        update_job(conn, job_id, "PROCESSING")

        # Load segments
        rows = conn.execute(
            'SELECT id, startTime, endTime, originalText, editedText FROM Segment '
            'WHERE videoId=? ORDER BY "index" ASC',
            (video_id,),
        ).fetchall()
        segments = [dict(r) for r in rows]

        # Output file name
        row = conn.execute(
            "SELECT shortName, shortNameAuto, originalName FROM Video WHERE id=?",
            (video_id,),
        ).fetchone()
        base_name = (
            (row["shortName"] or row["shortNameAuto"] or row["originalName"])
            .replace(" ", "_")
            .replace("/", "-")[:50]
        )
        output_name = f"{base_name}_{video_id[:8]}_subtitled.mp4"
        output_path = os.path.join(EXPORTS_DIR, output_name)

        # Get video dimensions
        video_w, video_h = get_video_dimensions(file_path)
        print(f"[exporter] Video dimensions: {video_w}x{video_h}", file=sys.stderr)

        # Render subtitle PNGs
        print(f"[exporter] Rendering {len(segments)} subtitle images...", file=sys.stderr)
        for i, seg in enumerate(segments):
            text = (seg["editedText"] or seg["originalText"]).strip()
            png_path = os.path.join(tmp_dir, f"sub_{i:04d}.png")
            render_subtitle_png(text, video_w, video_h, png_path)

        # Build filter_complex
        filter_str, extra_inputs = build_filter_complex(segments, tmp_dir, video_w, video_h)

        # Run FFmpeg
        cmd = (
            ["ffmpeg", "-y", "-i", file_path]
            + extra_inputs
            + [
                "-filter_complex", filter_str,
                "-map", "[vout]",
                "-map", "0:a?",
                "-c:v", "libx264",
                "-crf", "18",
                "-preset", "fast",
                "-c:a", "aac",
                "-b:a", "192k",
                output_path,
            ]
        )

        print(f"[exporter] Running FFmpeg...", file=sys.stderr)
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error:\n{result.stderr[-2000:]}")

        update_job(conn, job_id, "DONE", output_path)
        update_video(conn, video_id, "EXPORTED")
        print(f"[exporter] Done: {output_path}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        update_job(conn, job_id, "ERROR", error=str(e))
        update_video(conn, video_id, "ERROR")
        sys.exit(1)
    finally:
        conn.close()
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
