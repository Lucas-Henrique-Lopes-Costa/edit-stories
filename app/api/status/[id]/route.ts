import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/status/:id — Server-Sent Events stream for a single video status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        try {
          const video = await prisma.video.findUnique({
            where: { id },
            select: { status: true, errorMessage: true, shortName: true },
          });

          if (!video) {
            clearInterval(interval);
            controller.close();
            return;
          }

          send(video);

          // Stop polling when terminal state reached
          if (["READY", "EXPORTED", "ERROR"].includes(video.status)) {
            clearInterval(interval);
            setTimeout(() => {
              if (!closed) controller.close();
            }, 500);
          }
        } catch {
          clearInterval(interval);
          if (!closed) controller.close();
        }
      }, 2000);

      // Cleanup when client disconnects
      return () => {
        closed = true;
        clearInterval(interval);
      };
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
