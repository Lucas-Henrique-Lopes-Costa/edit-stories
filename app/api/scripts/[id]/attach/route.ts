import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Attach an existing video to a script (or detach with videoId: null)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { videoId } = await req.json();

  const script = await prisma.script.update({
    where: { id },
    data: { videoId: videoId ?? null, updatedAt: new Date() },
    include: {
      product: true,
      video: { select: { id: true, originalName: true, shortName: true, shortNameAuto: true, fileName: true } },
    },
  });
  return NextResponse.json({ script });
}
