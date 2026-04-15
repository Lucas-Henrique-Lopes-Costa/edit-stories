import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const EXPORTS_DIR = path.join(process.cwd(), "exports");
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

function videoCount(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())).length;
}

function listVideos(dir: string): { name: string }[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => ({ name: f }));
}

export type FolderItem = { id: string; name: string };

// Recursively list all subdirectories (depth-first), returning relative paths
function listDirsRecursive(base: string, rel = ""): FolderItem[] {
  const abs = rel ? path.join(base, rel) : base;
  if (!fs.existsSync(abs)) return [];
  const result: FolderItem[] = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    const childAbs = path.join(base, childRel);
    const count = videoCount(childAbs);
    result.push({ id: childRel, name: `${childRel} (${count} vídeos)` });
    result.push(...listDirsRecursive(base, childRel));
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderPath = searchParams.get("path");

  if (folderPath) {
    let abs: string;
    if (folderPath === "__exports__") {
      abs = EXPORTS_DIR;
    } else {
      abs = path.join(UPLOADS_DIR, folderPath);
      if (!abs.startsWith(UPLOADS_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
    }
    return NextResponse.json({ files: listVideos(abs) });
  }

  // All nested subdirs inside uploads/ + exports as bonus
  const folders: FolderItem[] = listDirsRecursive(UPLOADS_DIR);

  const expCount = videoCount(EXPORTS_DIR);
  if (expCount > 0) {
    folders.push({ id: "__exports__", name: `Exportados com legenda (${expCount} vídeos)` });
  }

  return NextResponse.json({ folders });
}
