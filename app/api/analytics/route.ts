import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const videos = await prisma.video.findMany({
    include: {
      metrics: true,
      products: { include: { product: true } },
      exportJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ videos });
}
