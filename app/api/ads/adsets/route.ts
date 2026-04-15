import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "../settings/route";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId obrigatório." }, { status: 400 });
  }

  const settings = readSettings();
  if (!settings.accessToken) {
    return NextResponse.json({ error: "Credenciais não configuradas." }, { status: 400 });
  }

  const params = new URLSearchParams({
    fields: "id,name,status",
    limit: "200",
    access_token: settings.accessToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${campaignId}/adsets?${params}`
  );
  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 });
  }

  return NextResponse.json({ adsets: data.data ?? [] });
}
