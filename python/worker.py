#!/usr/bin/env python3
"""
worker.py — transcribes a video with Whisper and stores segments in DB.
Usage: python3 worker.py <video_id> <file_path>
"""

import sys
import os
import json
import sqlite3
import subprocess
import tempfile
import datetime

# Load .env manually (no dotenv dependency required)
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

# Feature flag: set ENABLE_AI_NAMING=true in .env to use Claude for short name generation
ENABLE_AI_NAMING = os.environ.get("ENABLE_AI_NAMING", "false").lower() == "true"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def update_status(conn, video_id: str, status: str, error: str = None):
    now = datetime.datetime.utcnow().isoformat() + "Z"
    if error:
        conn.execute(
            "UPDATE Video SET status=?, errorMessage=?, updatedAt=? WHERE id=?",
            (status, error, now, video_id),
        )
    else:
        conn.execute(
            "UPDATE Video SET status=?, updatedAt=? WHERE id=?",
            (status, now, video_id),
        )
    conn.commit()


def extract_audio(video_path: str, out_path: str):
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-ac", "1", "-ar", "16000", out_path],
        check=True,
        capture_output=True,
    )


def get_duration(video_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_streams", video_path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    info = json.loads(result.stdout)
    for stream in info.get("streams", []):
        if "duration" in stream:
            return float(stream["duration"])
    return 0.0


def transcribe(audio_path: str) -> dict:
    import whisper  # type: ignore

    model = whisper.load_model("base")
    result = model.transcribe(audio_path, word_timestamps=False)
    return result


def generate_short_name(text: str) -> str:
    """Generate a short name using Claude API (if ENABLE_AI_NAMING=true). Falls back to first 5 words."""
    if not ENABLE_AI_NAMING:
        words = text.split()[:5]
        return " ".join(words)

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        words = text.split()[:5]
        return " ".join(words)

    try:
        import anthropic  # type: ignore

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=50,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Leia a transcrição a seguir e gere um nome curto de NO MÁXIMO 5 PALAVRAS "
                        "que identifique o tema/produto/assunto principal do vídeo. "
                        "Responda APENAS com o nome, sem pontuação extra.\n\n"
                        f"Transcrição:\n{text[:500]}"
                    ),
                }
            ],
        )
        return message.content[0].text.strip()
    except Exception as e:
        print(f"[naming] Claude API error: {e}", file=sys.stderr)
        words = text.split()[:5]
        return " ".join(words)


def main():
    if len(sys.argv) < 3:
        print("Usage: worker.py <video_id> <file_path>", file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]
    file_path = sys.argv[2]

    conn = get_db()

    try:
        update_status(conn, video_id, "TRANSCRIBING")

        # Get video duration
        try:
            duration = get_duration(file_path)
            now = datetime.datetime.utcnow().isoformat() + "Z"
            conn.execute(
                "UPDATE Video SET duration=?, updatedAt=? WHERE id=?",
                (duration, now, video_id),
            )
            conn.commit()
        except Exception as e:
            print(f"[duration] {e}", file=sys.stderr)

        # Extract audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            audio_path = tmp.name

        try:
            extract_audio(file_path, audio_path)

            # Transcribe
            result = transcribe(audio_path)
        finally:
            os.unlink(audio_path)

        raw_text = result.get("text", "").strip()
        language = result.get("language", "")
        segments = result.get("segments", [])

        # Store transcription
        now = datetime.datetime.utcnow().isoformat() + "Z"
        import uuid as uuid_mod

        trans_id = str(uuid_mod.uuid4())
        conn.execute(
            "INSERT OR REPLACE INTO Transcription (id, videoId, rawText, language, createdAt) VALUES (?, ?, ?, ?, ?)",
            (trans_id, video_id, raw_text, language, now),
        )
        conn.commit()

        # Store segments
        conn.execute("DELETE FROM Segment WHERE videoId=?", (video_id,))
        for i, seg in enumerate(segments):
            seg_id = str(uuid_mod.uuid4())
            conn.execute(
                'INSERT INTO Segment (id, videoId, "index", startTime, endTime, originalText, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (seg_id, video_id, i, seg["start"], seg["end"], seg["text"].strip(), now, now),
            )
        conn.commit()

        # Generate short name
        update_status(conn, video_id, "GENERATING")
        short_name = generate_short_name(raw_text)
        conn.execute(
            "UPDATE Video SET shortNameAuto=?, shortName=?, updatedAt=? WHERE id=?",
            (short_name, short_name, now, video_id),
        )
        conn.commit()

        update_status(conn, video_id, "READY")
        print(f"[worker] Done: {video_id} — '{short_name}'")

    except Exception as e:
        import traceback
        traceback.print_exc()
        update_status(conn, video_id, "ERROR", str(e))
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
