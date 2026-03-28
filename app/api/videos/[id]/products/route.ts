import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/videos/[id]/products — replace all product links for a video
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { productIds }: { productIds: string[] } = await req.json();

  // Replace: delete existing links then insert new ones
  await prisma.videoProduct.deleteMany({ where: { videoId: id } });
  if (productIds.length > 0) {
    await prisma.videoProduct.createMany({
      data: productIds.map((productId) => ({ videoId: id, productId })),
    });
  }

  return NextResponse.json({ ok: true });
}
