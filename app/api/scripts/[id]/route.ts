import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { content, status, format, productId } = body;

  const script = await prisma.script.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
      ...(format !== undefined && { format }),
      ...(productId !== undefined && { productId }),
      updatedAt: new Date(),
    },
    include: {
      product: true,
      video: { select: { id: true, originalName: true, shortName: true, shortNameAuto: true, fileName: true } },
    },
  });
  return NextResponse.json({ script });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.script.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
