import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";

// POST /api/process — enqueue videos for processing
// body: { videoIds: string[] }
export async function POST(req: NextRequest) {
  const { videoIds } = await req.json() as { videoIds: string[] };

  if (!videoIds || videoIds.length === 0) {
    return NextResponse.json({ error: "No videoIds provided" }, { status: 400 });
  }

  // Mark all as TRANSCRIBING immediately
  await prisma.video.updateMany({
    where: { id: { in: videoIds }, status: { in: ["PENDING", "ERROR"] } },
    data: { status: "TRANSCRIBING", errorMessage: null },
  });

  // Fire-and-forget: spawn Python worker for each video
  for (const videoId of videoIds) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) continue;

    const scriptPath = path.join(process.cwd(), "python", "worker.py");
    const child = spawn("python3", [scriptPath, videoId, video.filePath], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    });
    child.unref();
  }

  return NextResponse.json({ queued: videoIds.length });
}
