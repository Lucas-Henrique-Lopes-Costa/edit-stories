import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, benefits, targetAudience, price, objections } = body;
  if (name !== undefined && !name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(benefits !== undefined && { benefits }),
      ...(targetAudience !== undefined && { targetAudience }),
      ...(price !== undefined && { price }),
      ...(objections !== undefined && { objections }),
    },
  });
  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
