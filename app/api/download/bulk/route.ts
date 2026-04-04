import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import archiver from "archiver";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { PassThrough } from "stream";

export async function POST(req: NextRequest) {
  const { videoIds } = await req.json() as { videoIds: string[] };

  if (!videoIds?.length) {
    return NextResponse.json({ error: "No videoIds provided" }, { status: 400 });
  }

  const jobs = await prisma.exportJob.findMany({
    where: { videoId: { in: videoIds }, status: "DONE" },
    include: {
      video: { select: { shortName: true, shortNameAuto: true, originalName: true } },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["videoId"],
  });

  if (jobs.length === 0) {
    return NextResponse.json({ error: "No exported videos found" }, { status: 404 });
  }

  const archive = archiver("zip", { zlib: { level: 0 } }); // level 0 = store (videos already compressed)
  const pass = new PassThrough();
  archive.pipe(pass);

  for (const job of jobs) {
    if (!job.outputPath || !existsSync(job.outputPath)) continue;
    const name = job.video.shortName ?? job.video.shortNameAuto ?? job.video.originalName;
    const safeName = name.replace(/[^a-zA-Z0-9À-ÿ _\-]/g, "").trim().slice(0, 60) || "video";
    const ext = path.extname(job.outputPath);
    archive.append(createReadStream(job.outputPath), { name: `${safeName}${ext}` });
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
      "Content-Disposition": `attachment; filename="videos_${Date.now()}.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
