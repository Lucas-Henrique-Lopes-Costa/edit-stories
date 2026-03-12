import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/videos/:id/segments — bulk update edited text for all segments
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { segments } = await req.json() as {
    segments: { id: string; editedText: string }[];
  };

  await Promise.all(
    segments.map((s) =>
      prisma.segment.update({
        where: { id: s.id, videoId: id },
        data: { editedText: s.editedText },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
