export interface VideoMetrics {
  id: string;
  videoId: string;
  investedValue: number | null;
  salesValue: number | null;
  salesCount: number | null;
  impressions: number | null;
  reach: number | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  benefits?: string | null;
  targetAudience?: string | null;
  price?: string | null;
  objections?: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string | null;
  tone?: string | null;
  updatedAt: string;
}

export interface Script {
  id: string;
  productId: string | null;
  product: Product | null;
  videoId: string | null;
  video: { id: string; originalName: string; shortName: string | null; shortNameAuto: string | null; fileName: string } | null;
  prompt: string;
  content: string;
  format: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus =
  | "PENDING"
  | "TRANSCRIBING"
  | "GENERATING"
  | "READY"
  | "APPROVED"
  | "EXPORTING"
  | "EXPORTED"
  | "ERROR";

export type ExportStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";

export interface VideoWithRelations {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  status: VideoStatus;
  shortName: string | null;
  shortNameAuto: string | null;
  duration: number | null;
  errorMessage: string | null;
  subtitlePosition: number;
  fontSize: number;
  trimStart: number;
  trimEnd: number | null;
  withSubtitles: boolean;
  createdAt: string;
  updatedAt: string;
  products?: { product: Product }[];
  transcription?: {
    id: string;
    rawText: string;
    language: string | null;
  } | null;
  segments?: SegmentData[];
  exportJobs?: ExportJobData[];
}

export interface SegmentData {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  originalText: string;
  editedText: string | null;
}

export interface ExportJobData {
  id: string;
  status: ExportStatus;
  outputPath: string | null;
  error: string | null;
}

export const STATUS_LABELS: Record<VideoStatus, string> = {
  PENDING: "Aguardando",
  TRANSCRIBING: "Transcrevendo",
  GENERATING: "Gerando legenda",
  READY: "Pronto para revisão",
  APPROVED: "Aprovado",
  EXPORTING: "Exportando",
  EXPORTED: "Exportado",
  ERROR: "Erro",
};

export const STATUS_COLORS: Record<VideoStatus, string> = {
  PENDING: "bg-zinc-700 text-zinc-300",
  TRANSCRIBING: "bg-blue-900 text-blue-300",
  GENERATING: "bg-purple-900 text-purple-300",
  READY: "bg-yellow-900 text-yellow-300",
  APPROVED: "bg-green-900 text-green-300",
  EXPORTING: "bg-orange-900 text-orange-300",
  EXPORTED: "bg-emerald-900 text-emerald-300",
  ERROR: "bg-red-900 text-red-300",
};
