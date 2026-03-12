import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReadStream, statSync } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.exportJob.findFirst({
    where: { videoId: id, status: "DONE" },
    include: { video: { select: { shortName: true, shortNameAuto: true, originalName: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!job?.outputPath) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }

  try {
    const stat = statSync(job.outputPath);
    const fileName =
      path.basename(job.outputPath);

    const stream = createReadStream(job.outputPath);
    const body = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
