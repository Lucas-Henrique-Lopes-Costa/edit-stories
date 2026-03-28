import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueVideos, getQueueStatus } from "@/lib/worker-queue";

// POST /api/process — add videos to the processing queue (max 2 run at a time)
// body: { videoIds: string[] }
export async function POST(req: NextRequest) {
  const { videoIds } = await req.json() as { videoIds: string[] };

  if (!videoIds || videoIds.length === 0) {
    return NextResponse.json({ error: "No videoIds provided" }, { status: 400 });
  }

  // Clear error message for videos being requeued; leave status as PENDING
  // (the worker sets TRANSCRIBING when it actually starts)
  await prisma.video.updateMany({
    where: { id: { in: videoIds }, status: { in: ["PENDING", "ERROR"] } },
    data: { errorMessage: null },
  });

  // Fetch file paths for the queued videos
  const videos = await prisma.video.findMany({
    where: { id: { in: videoIds }, status: { in: ["PENDING", "ERROR"] } },
    select: { id: true, filePath: true },
  });

  enqueueVideos(videos.map((v) => ({ videoId: v.id, filePath: v.filePath })));

  const { active, pending } = getQueueStatus();
  return NextResponse.json({ queued: videos.length, active, pending });
}

// GET /api/process — queue status
export async function GET() {
  return NextResponse.json(getQueueStatus());
}
