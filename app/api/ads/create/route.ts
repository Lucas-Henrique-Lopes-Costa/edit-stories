import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const META_API = "https://graph.facebook.com/v20.0";
const META_VIDEO_API = "https://graph-video.facebook.com/v20.0";

export const maxDuration = 300;

interface CreateCampaignBody {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  pixelId?: string;
  websiteUrl: string;
  ctaType: string;
  caption: string;
  campaignName: string;
  adSetName: string;
  dailyBudget: number;
  ageMin: number;
  ageMax: number;
  genders: number[];
  countries: string[];
  folderPath: string;
}

// Meta Graph API prefers form-encoded. Nested objects go in as JSON strings.
async function metaPost(
  baseUrl: string,
  endpoint: string,
  token: string,
  body: Record<string, unknown>
) {
  const params = new URLSearchParams();
  params.set("access_token", token);

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      params.set(key, JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(
      `Meta API error: ${data.error.message} (code ${data.error.code})`
    );
  }
  return data;
}

// Safe ASCII filename for Meta API (avoids special-char issues in multipart)
function safeFileName(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-zA-Z0-9._\-]/g, "_")               // replace everything else
    .replace(/_+/g, "_");
}

async function uploadVideo(
  adAccountId: string,
  token: string,
  filePath: string,
  fileName: string
): Promise<string> {
  // Meta's chunked upload API is much more reliable with MP4 than MOV
  let actualFilePath = filePath;
  let actualFileName = fileName;
  let tempFile: string | null = null;

  if (path.extname(fileName).toLowerCase() === ".mov") {
    const mp4Name = path.parse(fileName).name + ".mp4";
    tempFile = path.join(os.tmpdir(), mp4Name);
    execSync(`ffmpeg -y -i "${filePath}" -c copy "${tempFile}"`, { stdio: "pipe" });
    actualFilePath = tempFile;
    actualFileName = mp4Name;
  }

  try {
    return await _doUpload(adAccountId, token, actualFilePath, actualFileName);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

async function _doUpload(
  adAccountId: string,
  token: string,
  filePath: string,
  fileName: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const safeName = safeFileName(fileName);
  const chunkSize = 1024 * 1024; // 1 MB — smaller chunks = more stable

  // Phase 1: start
  const startParams = new URLSearchParams({
    access_token: token,
    upload_phase: "start",
    file_size: String(fileSize),
  });
  const startRes = await fetch(`${META_VIDEO_API}/${adAccountId}/advideos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: startParams.toString(),
  });
  const startData = await startRes.json();
  if (startData.error) throw new Error(`Upload start: ${startData.error.message} (code ${startData.error.code})`);

  const videoId: string = startData.video_id;
  const uploadSessionId: string = startData.upload_session_id;
  let offset = Number(startData.start_offset ?? 0);

  // Phase 2: transfer chunks sequentially
  while (offset < fileSize) {
    const chunk = fileBuffer.slice(offset, offset + chunkSize);
    const form = new FormData();
    form.append("access_token", token);
    form.append("upload_phase", "transfer");
    form.append("upload_session_id", uploadSessionId);
    form.append("start_offset", String(offset));
    form.append("video_file_chunk", new Blob([chunk], { type: "application/octet-stream" }), safeName);

    const transferRes = await fetch(`${META_VIDEO_API}/${adAccountId}/advideos`, {
      method: "POST",
      body: form,
    });
    const transferData = await transferRes.json();
    if (transferData.error) throw new Error(`Upload chunk at ${offset}: ${transferData.error.message} (code ${transferData.error.code})`);
    offset = Number(transferData.end_offset);
  }

  // Phase 3: finish
  const finishForm = new FormData();
  finishForm.append("access_token", token);
  finishForm.append("upload_phase", "finish");
  finishForm.append("upload_session_id", uploadSessionId);
  // Send finish via multipart (avoids URLSearchParams encoding issues with long session IDs)
  const finishRes = await fetch(`${META_VIDEO_API}/${adAccountId}/advideos`, {
    method: "POST",
    body: finishForm,
  });
  const finishData = await finishRes.json();
  if (finishData.error) throw new Error(`Upload finish: ${finishData.error.message} (code ${finishData.error.code})`);

  return videoId;
}

async function waitForVideo(videoId: string, token: string, maxWaitMs = 300000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const params = new URLSearchParams({ fields: "status", access_token: token });
    const res = await fetch(`${META_API}/${videoId}?${params}`);
    const data = await res.json();
    if (!data.error) {
      const vs = data.status?.video_status;
      if (!vs || vs === "ready") return;
      if (vs === "error") throw new Error(`Meta rejeitou o vídeo ${videoId}: processamento falhou`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`Timeout: vídeo ${videoId} não ficou pronto em ${maxWaitMs / 1000}s`);
}

export async function POST(req: NextRequest) {
  const body: CreateCampaignBody = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: string) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`)
        );
      }
      function sendError(msg: string) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      }
      function sendDone() {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      }

      try {
        const {
          accessToken,
          adAccountId: rawAccountId,
          pageId,
          pixelId,
          websiteUrl,
          ctaType,
          caption,
          campaignName,
          adSetName,
          dailyBudget,
          ageMin,
          ageMax,
          genders,
          countries,
          folderPath,
        } = body;

        const adAccountId = rawAccountId.startsWith("act_")
          ? rawAccountId
          : `act_${rawAccountId}`;

        // Meta uses smallest currency unit (centavos for BRL)
        const budgetCents = Math.round(dailyBudget * 100);

        // --- 1. Create Campaign ---
        send(`Criando campanha: ${campaignName}...`);
        const campaign = await metaPost(META_API, `/${adAccountId}/campaigns`, accessToken, {
          name: campaignName,
          objective: "OUTCOME_SALES",
          status: "PAUSED",
          special_ad_categories: [],
        });
        send(`Campanha criada: ID ${campaign.id}`);

        // --- 2. Create Ad Set ---
        send(`Criando conjunto de anúncios: ${adSetName}...`);

        const hasPixel = Boolean(pixelId?.trim());
        const adSetBody: Record<string, unknown> = {
          name: adSetName,
          campaign_id: campaign.id,
          daily_budget: budgetCents,
          billing_event: "IMPRESSIONS",
          optimization_goal: hasPixel ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          destination_type: "WEBSITE",
          targeting: {
            age_min: ageMin,
            age_max: ageMax,
            genders: genders.length > 0 ? genders : undefined,
            geo_locations: { countries },
            publisher_platforms: ["facebook", "instagram"],
            facebook_positions: ["feed", "story", "reels", "video_feeds"],
            instagram_positions: ["stream", "story", "reels"],
          },
          status: "PAUSED",
        };

        if (hasPixel) {
          adSetBody.promoted_object = {
            pixel_id: pixelId,
            custom_event_type: "PURCHASE",
          };
        }

        const adSet = await metaPost(META_API, `/${adAccountId}/adsets`, accessToken, adSetBody);
        send(`Conjunto criado: ID ${adSet.id}`);

        // --- 3. List videos in folder ---
        const UPLOADS_DIR = path.join(process.cwd(), "uploads");
        const EXPORTS_DIR = path.join(process.cwd(), "exports");
        let folderAbs: string;
        if (path.isAbsolute(folderPath)) folderAbs = folderPath; // Drive temp dir
        else if (folderPath === "__exports__") folderAbs = EXPORTS_DIR;
        else if (folderPath === "__uploads__") folderAbs = UPLOADS_DIR;
        else folderAbs = path.join(UPLOADS_DIR, folderPath);

        const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
        const videoFiles = fs
          .readdirSync(folderAbs)
          .filter((f) => VIDEO_EXTS.has(path.extname(f).toLowerCase()));

        if (videoFiles.length === 0) {
          sendError("Nenhum vídeo encontrado na pasta selecionada.");
          return;
        }

        send(`${videoFiles.length} vídeo(s) encontrado(s). Processando em sequência (1 por vez)...`);

        // CTA only valid when websiteUrl is set (SHOP_NOW etc require value.link)
        const cta = ctaType && ctaType !== "NO_BUTTON" && websiteUrl
          ? { type: ctaType, value: { link: websiteUrl } }
          : undefined;

        // --- 4. Sequential: upload → wait → creative → ad ---
        let ok = 0;
        let failed = 0;
        for (let i = 0; i < videoFiles.length; i++) {
          const fileName = videoFiles[i];
          const label = `[${i + 1}/${videoFiles.length}]`;
          const filePath = path.join(folderAbs, fileName);
          const adName = path.parse(fileName).name;

          send(`${label} Upload: ${fileName}...`);
          let videoId: string;
          try {
            videoId = await uploadVideo(adAccountId, accessToken, filePath, fileName);
          } catch (err) {
            sendError(`${label} Falha no upload: ${err instanceof Error ? err.message : String(err)}`);
            failed++;
            continue;
          }

          send(`${label} Upload OK (ID: ${videoId}). Aguardando processamento na Meta...`);
          try {
            await waitForVideo(videoId, accessToken);
          } catch (err) {
            sendError(`${label} Vídeo não ficou pronto: ${err instanceof Error ? err.message : String(err)}`);
            failed++;
            continue;
          }

          send(`${label} Criando criativo...`);
          let creative: { id: string };
          try {
            creative = await metaPost(META_API, `/${adAccountId}/adcreatives`, accessToken, {
              name: adName,
              object_story_spec: {
                page_id: pageId,
                video_data: {
                  video_id: videoId,
                  message: caption || "",
                  ...(cta ? { call_to_action: cta } : {}),
                },
              },
            });
          } catch (err) {
            sendError(`${label} Falha no criativo: ${err instanceof Error ? err.message : String(err)}`);
            failed++;
            continue;
          }

          send(`${label} Criando anúncio...`);
          try {
            const ad = await metaPost(META_API, `/${adAccountId}/ads`, accessToken, {
              name: adName,
              adset_id: adSet.id,
              creative: { creative_id: creative.id },
              status: "PAUSED",
            });
            send(`${label} Anúncio criado: ID ${ad.id}`);
            ok++;
          } catch (err) {
            sendError(`${label} Falha ao criar anúncio: ${err instanceof Error ? err.message : String(err)}`);
            failed++;
          }
        }

        send(`Concluído! ${ok} anúncio(s) criado(s)${failed > 0 ? `, ${failed} falha(s)` : ""} (pausados).`);
        sendDone();
      } catch (err) {
        sendError(`Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
