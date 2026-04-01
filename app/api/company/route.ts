import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { id: "singleton", name: "", updatedAt: new Date() },
    });
  }
  return NextResponse.json({ company });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { name, description, tone } = body;
  const company = await prisma.company.upsert({
    where: { id: "singleton" },
    update: { name: name ?? "", description, tone, updatedAt: new Date() },
    create: { id: "singleton", name: name ?? "", description, tone, updatedAt: new Date() },
  });
  return NextResponse.json({ company });
}
