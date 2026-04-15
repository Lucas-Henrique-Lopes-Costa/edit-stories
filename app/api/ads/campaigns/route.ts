import { NextResponse } from "next/server";
import { readSettings } from "../settings/route";

export async function GET() {
  const settings = readSettings();
  if (!settings.accessToken || !settings.adAccountId) {
    return NextResponse.json({ error: "Credenciais não configuradas." }, { status: 400 });
  }

  const adAccountId = settings.adAccountId.startsWith("act_")
    ? settings.adAccountId
    : `act_${settings.adAccountId}`;

  const params = new URLSearchParams({
    fields: "id,name,status,objective",
    effective_status: JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ARCHIVED"]),
    limit: "200",
    access_token: settings.accessToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${adAccountId}/campaigns?${params}`
  );
  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 });
  }

  return NextResponse.json({ campaigns: data.data ?? [] });
}
