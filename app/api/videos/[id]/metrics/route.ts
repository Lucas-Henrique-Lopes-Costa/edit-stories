import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metrics = await prisma.videoMetrics.findUnique({ where: { videoId: id } });
  return NextResponse.json({ metrics });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data = {
    investedValue: body.investedValue != null ? Number(body.investedValue) : null,
    salesValue:    body.salesValue    != null ? Number(body.salesValue)    : null,
    salesCount:    body.salesCount    != null ? Math.round(Number(body.salesCount)) : null,
    impressions:   body.impressions   != null ? Math.round(Number(body.impressions)) : null,
    reach:         body.reach         != null ? Math.round(Number(body.reach))       : null,
  };

  const metrics = await prisma.videoMetrics.upsert({
    where:  { videoId: id },
    update: data,
    create: { id: randomUUID(), videoId: id, ...data },
  });

  return NextResponse.json({ metrics });
}
