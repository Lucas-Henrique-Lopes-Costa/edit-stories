import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { prompt, productId, quantity = 1, referenceVideoId } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  }

  // Gather context
  const [company, product, bestVideos, refVideo] = await Promise.all([
    prisma.company.findFirst(),
    productId ? prisma.product.findUnique({ where: { id: productId } }) : null,
    // Best ROAS videos with transcription
    prisma.video.findMany({
      where: { metrics: { isNot: null }, transcription: { isNot: null } },
      include: { metrics: true, transcription: true, products: { include: { product: true } } },
      orderBy: { metrics: { salesValue: "desc" } },
      take: 3,
    }),
    referenceVideoId
      ? prisma.video.findUnique({ where: { id: referenceVideoId }, include: { transcription: true } })
      : null,
  ]);

  // Build context block
  const contextParts: string[] = [];

  if (company?.name) {
    contextParts.push(`## Empresa\nNome: ${company.name}${company.description ? `\nDescrição: ${company.description}` : ""}${company.tone ? `\nTom de comunicação: ${company.tone}` : ""}`);
  }

  if (product) {
    const fields = [
      `Nome: ${product.name}`,
      product.description && `Descrição: ${product.description}`,
      product.benefits && `Benefícios: ${product.benefits}`,
      product.targetAudience && `Público-alvo: ${product.targetAudience}`,
      product.price && `Preço: ${product.price}`,
      product.objections && `Objeções comuns: ${product.objections}`,
    ].filter(Boolean);
    contextParts.push(`## Produto\n${fields.join("\n")}`);
  }

  if (refVideo?.transcription) {
    contextParts.push(`## Vídeo de referência enviado pelo usuário\n${refVideo.transcription.rawText}`);
  }

  if (bestVideos.length > 0) {
    const transcriptions = bestVideos
      .filter((v) => v.transcription)
      .map((v, i) => {
        const productNames = v.products.map((vp) => vp.product.name).join(", ");
        return `### Roteiro de melhor performance ${i + 1}${productNames ? ` (${productNames})` : ""}\n${v.transcription!.rawText}`;
      })
      .join("\n\n");
    if (transcriptions) {
      contextParts.push(`## Criativos de melhor performance (referência)\n${transcriptions}`);
    }
  }

  const context = contextParts.join("\n\n");

  const systemPrompt = `Você é um especialista em criação de roteiros para vídeos de marketing digital e anúncios nas redes sociais.
Crie roteiros envolventes, diretos e persuasivos para vídeos curtos (Reels, TikTok, Stories).
Cada roteiro deve ter no máximo 60 segundos de fala (aproximadamente 150-180 palavras).
Use linguagem natural e conversacional.

Quando o formato for "caixinha de pergunta" ou similar, forneça:
- O texto da pergunta para colocar na caixinha
- O roteiro completo de como responder no vídeo

Para outros formatos, forneça o roteiro completo com indicações de cena quando relevante.

${context ? `\n\nContexto disponível:\n${context}` : ""}`;

  const userMessage = quantity === 1
    ? `Crie 1 roteiro com base nesta solicitação: ${prompt}`
    : `Crie ${quantity} roteiros diferentes com base nesta solicitação: ${prompt}

Separe cada roteiro com "---ROTEIRO X---" onde X é o número do roteiro.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.8,
  });

  const rawContent = completion.choices[0].message.content ?? "";

  // Split into individual scripts
  let scriptTexts: string[];
  if (quantity > 1) {
    scriptTexts = rawContent
      .split(/---ROTEIRO \d+---/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (scriptTexts.length < quantity) scriptTexts = [rawContent];
  } else {
    scriptTexts = [rawContent];
  }

  // Detect format from prompt
  const formatMatch = prompt.toLowerCase();
  let detectedFormat: string | null = null;
  if (formatMatch.includes("caixinha")) detectedFormat = "caixinha_pergunta";
  else if (formatMatch.includes("testemunho") || formatMatch.includes("depoimento")) detectedFormat = "testemunho";
  else if (formatMatch.includes("tutorial") || formatMatch.includes("como fazer")) detectedFormat = "tutorial";
  else if (formatMatch.includes("antes e depois")) detectedFormat = "antes_depois";
  else if (formatMatch.includes("storytelling") || formatMatch.includes("história")) detectedFormat = "storytelling";

  // Save all scripts to DB
  const created = await Promise.all(
    scriptTexts.map((content) =>
      prisma.script.create({
        data: {
          prompt: prompt.trim(),
          content,
          format: detectedFormat,
          productId: productId ?? null,
          status: "TO_RECORD",
          updatedAt: new Date(),
        },
        include: {
          product: true,
          video: { select: { id: true, originalName: true, shortName: true, shortNameAuto: true, fileName: true } },
        },
      })
    )
  );

  return NextResponse.json({ scripts: created });
}
