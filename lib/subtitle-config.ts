// Subtitle visual style configuration
// All values can be overridden per project or per video in a future version

export const SUBTITLE_CONFIG = {
  // Font
  fontSize: 36,
  fontFamily: "Arial",
  fontWeight: "bold" as const,
  textColor: "#FFFFFF",

  // Box / background
  backgroundColor: "rgba(0, 0, 0, 0.82)",
  borderRadius: 10,
  paddingX: 22,
  paddingY: 12,
  maxWidthPercent: 88, // % of video width

  // Position — fraction from top where the subtitle CENTER sits
  verticalCenterRatio: 0.75, // 0 = top, 1 = bottom

  // Timing
  maxCharsPerLine: 38,
  maxLines: 2,
  minDisplayMs: 500,

  // Kept for backwards compat (unused — verticalCenterRatio is the source of truth)
  verticalPositionPercent: 67,
};
