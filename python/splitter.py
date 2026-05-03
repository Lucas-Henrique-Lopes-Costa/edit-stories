#!/usr/bin/env python3
"""
splitter.py — split a video by silence and transcribe each speech segment with Whisper.
Usage: python3 splitter.py <input_video> <output_dir>
Outputs JSON to stdout: list of { file, text, start, end }
"""

import sys
import os
import re
import json
import subprocess


def detect_speech_segments(input_path, silence_db=-30, min_silence=0.6):
    """Run ffmpeg silencedetect, return list of (start, end) for non-silent ranges."""
    cmd = [
        "ffmpeg", "-i", input_path,
        "-af", f"silencedetect=noise={silence_db}dB:d={min_silence}",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    log = result.stderr

    starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([\d.]+)", log)]

    # Get total duration
    duration = 0.0
    dur_match = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", log)
    if dur_match:
        h, m, s = dur_match.groups()
        duration = int(h) * 3600 + int(m) * 60 + float(s)

    # Pair starts/ends — if a silence_start has no matching end, treat end-of-file as end
    speech = []
    cursor = 0.0
    for i, s in enumerate(starts):
        if s > cursor + 0.05:
            speech.append((cursor, s))
        cursor = ends[i] if i < len(ends) else duration
    if cursor < duration - 0.05:
        speech.append((cursor, duration))

    return speech


def cut_clip(input_path, start, end, output_path):
    """Re-encode the segment so the cut starts on the exact frame (copy mode is keyframe-aligned)."""
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ss", f"{start:.3f}",
        "-to", f"{end:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"cut_clip failed: {r.stderr[-500:]}")


def extract_audio(video_path, audio_path):
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-ac", "1", "-ar", "16000", audio_path],
        check=True, capture_output=True,
    )


def safe_filename(text, max_len=80):
    text = re.sub(r"[\\/:*?\"<>|]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.strip(". ")
    return text[:max_len] if text else ""


def get_duration(input_path):
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", input_path]
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(json.loads(r.stdout)["format"]["duration"])
    except Exception:
        return 0.0


def main():
    if len(sys.argv) < 3:
        print("Usage: splitter.py <input_video> <output_dir> [pad_before] [pad_after]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    pad_before = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    pad_after = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
    os.makedirs(output_dir, exist_ok=True)

    print("[splitter] detecting speech segments...", file=sys.stderr)
    segments = detect_speech_segments(input_path)
    print(f"[splitter] {len(segments)} segment(s) found", file=sys.stderr)

    total_duration = get_duration(input_path)
    if pad_before > 0 or pad_after > 0:
        padded = []
        for s, e in segments:
            ns = max(0.0, s - pad_before)
            ne = e + pad_after
            if total_duration > 0:
                ne = min(total_duration, ne)
            padded.append((ns, ne))
        segments = padded
        print(f"[splitter] applied padding: -{pad_before}s / +{pad_after}s", file=sys.stderr)

    print("[splitter] loading whisper...", file=sys.stderr)
    import whisper  # type: ignore
    model = whisper.load_model("base")

    results = []
    used_names = set()

    for i, (s, e) in enumerate(segments):
        if e - s < 0.6:
            continue
        print(f"[splitter] clip {i+1}/{len(segments)} ({s:.1f}s -> {e:.1f}s)", file=sys.stderr)

        tmp_clip = os.path.join(output_dir, f"_tmp_{i}.mp4")
        cut_clip(input_path, s, e, tmp_clip)

        tmp_audio = os.path.join(output_dir, f"_tmp_{i}.wav")
        extract_audio(tmp_clip, tmp_audio)

        try:
            tr = model.transcribe(tmp_audio, language="pt")
            text = (tr.get("text") or "").strip()
        except Exception as ex:
            print(f"[splitter] whisper error on clip {i}: {ex}", file=sys.stderr)
            text = ""
        finally:
            if os.path.exists(tmp_audio):
                os.remove(tmp_audio)

        base = safe_filename(text) or f"clip_{i+1:02d}"
        candidate = base
        n = 2
        while candidate.lower() in used_names:
            candidate = f"{base} ({n})"
            n += 1
        used_names.add(candidate.lower())

        final_path = os.path.join(output_dir, f"{candidate}.mp4")
        os.rename(tmp_clip, final_path)

        results.append({
            "file": os.path.basename(final_path),
            "text": text,
            "start": round(s, 2),
            "end": round(e, 2),
        })

    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
