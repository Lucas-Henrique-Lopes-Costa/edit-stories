import { NextRequest } from "next/server";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import os from "os";
import { PassThrough } from "stream";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) return new Response("Missing jobId", { status: 400 });

  const clipsDir = path.join(os.tmpdir(), "splitter-" + jobId, "clips");
  if (!fs.existsSync(clipsDir)) {
    return new Response("Job não encontrado ou expirado", { status: 404 });
  }

  const files = fs.readdirSync(clipsDir).filter((f) => f.endsWith(".mp4") && !f.startsWith("_tmp_"));
  if (files.length === 0) {
    return new Response("Nenhum recorte gerado", { status: 404 });
  }

  const archive = archiver("zip", { zlib: { level: 0 } });
  const pass = new PassThrough();
  archive.pipe(pass);

  for (const f of files) {
    archive.append(fs.createReadStream(path.join(clipsDir, f)), { name: f });
  }
  archive.finalize();

  const chunks: Buffer[] = [];
  for await (const chunk of pass) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="recortes_${Date.now()}.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
