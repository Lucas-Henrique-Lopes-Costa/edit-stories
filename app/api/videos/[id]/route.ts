import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      transcription: true,
      segments: { orderBy: { index: "asc" } },
      exportJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ video });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ["shortName", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const video = await prisma.video.update({ where: { id }, data });
  return NextResponse.json({ video });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from DB (cascades to Segments, Transcription, ExportJobs)
  await prisma.video.delete({ where: { id } });

  // Best-effort: remove files from disk
  const { unlink } = await import("fs/promises");
  for (const path of [video.filePath]) {
    try { await unlink(path); } catch { /* ignore if already gone */ }
  }

  return NextResponse.json({ ok: true });
}
