import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";

export const maxDuration = 300;
export const runtime = "nodejs";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

export async function POST(req: NextRequest) {
  const { driveUrl } = await req.json() as { driveUrl: string };

  if (!driveUrl?.includes("drive.google.com")) {
    return NextResponse.json({ error: "URL do Google Drive inválida" }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  const outputDir = path.join(os.tmpdir(), "drive-" + jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  // Use gdown to download the folder
  const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const proc = spawn("python3", [
      "-m", "gdown",
      "--folder", driveUrl,
      "-O", outputDir,
      "--quiet",
    ]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    proc.on("error", reject);
  });

  if (result.code !== 0) {
    fs.rmSync(outputDir, { recursive: true, force: true });
    return NextResponse.json(
      { error: "Falha ao baixar pasta do Drive. Certifique-se de que o link está compartilhado como 'Qualquer pessoa com o link'.", detail: result.stderr.slice(-1000) },
      { status: 500 }
    );
  }

  // Find video files recursively
  function findVideos(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findVideos(full));
      } else if (VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        files.push(full);
      }
    }
    return files;
  }

  const videos = findVideos(outputDir);

  if (videos.length === 0) {
    fs.rmSync(outputDir, { recursive: true, force: true });
    return NextResponse.json({ error: "Nenhum vídeo encontrado na pasta do Drive." }, { status: 404 });
  }

  return NextResponse.json({
    tempPath: outputDir,
    files: videos.map((f) => ({ name: path.basename(f), path: f })),
  });
}
