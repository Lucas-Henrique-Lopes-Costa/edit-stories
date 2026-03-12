import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await req.formData();
    const files = formData.getAll("videos") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const created = await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file.name);
        const fileName = `${uuid()}${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        return prisma.video.create({
          data: {
            originalName: file.name,
            fileName,
            filePath,
            status: "PENDING",
          },
        });
      })
    );

    return NextResponse.json({ videos: created });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
