import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import crypto from "crypto";

export const maxDuration = 600;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  const padBeforeRaw = formData.get("padBefore");
  const padAfterRaw = formData.get("padAfter");
  const padBefore = Math.max(0, Math.min(10, Number(padBeforeRaw ?? 0) || 0));
  const padAfter = Math.max(0, Math.min(10, Number(padAfterRaw ?? 0) || 0));

  const jobId = crypto.randomUUID();
  const jobDir = path.join(os.tmpdir(), "splitter-" + jobId);
  const outputDir = path.join(jobDir, "clips");
  fs.mkdirSync(outputDir, { recursive: true });

  const safeOriginal = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const inputPath = path.join(jobDir, safeOriginal);
  fs.writeFileSync(inputPath, Buffer.from(await file.arrayBuffer()));

  const scriptPath = path.join(process.cwd(), "python", "splitter.py");

  const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const proc = spawn("python3", [scriptPath, inputPath, outputDir, String(padBefore), String(padAfter)]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    proc.on("error", reject);
  });

  if (result.code !== 0) {
    return NextResponse.json(
      { error: "Falha ao processar vídeo", detail: result.stderr.slice(-2000) },
      { status: 500 }
    );
  }

  let clips: { file: string; text: string; start: number; end: number }[] = [];
  try {
    clips = JSON.parse(result.stdout.trim());
  } catch {
    clips = [];
  }

  // Cleanup the input file (we don't need it anymore)
  try { fs.unlinkSync(inputPath); } catch {}

  return NextResponse.json({ jobId, clips });
}
