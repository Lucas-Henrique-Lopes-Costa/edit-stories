"use client";

import { SegmentData } from "@/lib/types";
import { SUBTITLE_CONFIG } from "@/lib/subtitle-config";

interface Props {
  currentTime: number;
  segments: SegmentData[];
}

export function SubtitlePreview({ currentTime, segments }: Props) {
  const active = segments.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  if (!active) return null;

  const text = active.editedText ?? active.originalText;

  // Place the center of the box at verticalCenterRatio from the top
  const topPercent = SUBTITLE_CONFIG.verticalCenterRatio * 100;

  return (
    <div
      style={{
        position: "absolute",
        top: `${topPercent}%`,
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: `${SUBTITLE_CONFIG.maxWidthPercent}%`,
        backgroundColor: SUBTITLE_CONFIG.backgroundColor,
        color: SUBTITLE_CONFIG.textColor,
        fontFamily: SUBTITLE_CONFIG.fontFamily,
        fontSize: `${SUBTITLE_CONFIG.fontSize}px`,
        fontWeight: SUBTITLE_CONFIG.fontWeight,
        borderRadius: `${SUBTITLE_CONFIG.borderRadius}px`,
        padding: `${SUBTITLE_CONFIG.paddingY}px ${SUBTITLE_CONFIG.paddingX}px`,
        textAlign: "center",
        lineHeight: 1.4,
        pointerEvents: "none",
        zIndex: 10,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  );
}
