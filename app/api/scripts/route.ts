import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const scripts = await prisma.script.findMany({
    include: {
      product: true,
      video: { select: { id: true, originalName: true, shortName: true, shortNameAuto: true, fileName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ scripts });
}
