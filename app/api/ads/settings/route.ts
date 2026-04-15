import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "ads-settings.json");

export interface AdsSettings {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  websiteUrl: string;
  ctaType: string;
  caption: string;
}

export function readSettings(): Partial<AdsSettings> {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const current = readSettings();
  const updated = { ...current, ...body };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return NextResponse.json({ ok: true });
}
