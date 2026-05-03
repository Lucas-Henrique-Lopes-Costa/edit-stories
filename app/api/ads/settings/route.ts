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
  const fromFile = (() => {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")); } catch { return {}; }
  })();

  // Fall back to .env values when not set in the saved file
  return {
    accessToken: process.env.META_ACCESS_TOKEN || "",
    adAccountId: process.env.META_AD_ACCOUNT_ID || "",
    ...fromFile,
  };
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
