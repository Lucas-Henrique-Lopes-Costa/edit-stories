import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";

// POST /api/export — export approved videos
// body: { videoIds: string[] }
export async function POST(req: NextRequest) {
  const { videoIds } = await req.json() as { videoIds: string[] };

  if (!videoIds || videoIds.length === 0) {
    return NextResponse.json({ error: "No videoIds provided" }, { status: 400 });
  }

  const results = [];

  for (const videoId of videoIds) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { segments: { orderBy: { index: "asc" } } },
    });

    if (!video || video.status !== "APPROVED") {
      results.push({ videoId, error: "Video not found or not approved" });
      continue;
    }

    // Create export job record
    const job = await prisma.exportJob.create({
      data: { videoId, status: "PENDING" },
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EXPORTING" },
    });

    const scriptPath = path.join(process.cwd(), "python", "exporter.py");
    const child = spawn("python3", [scriptPath, job.id, videoId, video.filePath], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    });
    child.unref();

    results.push({ videoId, jobId: job.id });
  }

  return NextResponse.json({ results });
}
