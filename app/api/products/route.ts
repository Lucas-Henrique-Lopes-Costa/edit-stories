import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const product = await prisma.product.create({
    data: { id: randomUUID(), name: name.trim() },
  });
  return NextResponse.json({ product });
}
