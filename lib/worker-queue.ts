/**
 * In-process worker queue — limits concurrent Python workers to CONCURRENCY.
 * Uses globalThis so the singleton survives Next.js hot-reloads in dev.
 */
import { spawn } from "child_process";
import path from "path";

const CONCURRENCY = 2;

interface QueueItem {
  videoId: string;
  filePath: string;
}

interface QueueState {
  queue: QueueItem[];
  active: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __workerQueue: QueueState | undefined;
}

function getState(): QueueState {
  if (!globalThis.__workerQueue) {
    globalThis.__workerQueue = { queue: [], active: 0 };
  }
  return globalThis.__workerQueue;
}

function startNext() {
  const state = getState();
  while (state.active < CONCURRENCY && state.queue.length > 0) {
    const item = state.queue.shift()!;
    state.active++;

    const scriptPath = path.join(process.cwd(), "python", "worker.py");
    const child = spawn("python3", [scriptPath, item.videoId, item.filePath], {
      stdio: "ignore",
      env: { ...process.env },
    });

    child.on("close", () => {
      state.active--;
      startNext();
    });
  }
}

export function enqueueVideos(items: QueueItem[]) {
  const state = getState();
  state.queue.push(...items);
  startNext();
}

export function getQueueStatus(): { active: number; pending: number } {
  const { active, queue } = getState();
  return { active, pending: queue.length };
}
