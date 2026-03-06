export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const SUPPORTED_FORMATS = ["image/gif", "video/mp4", "video/webm", "image/png"] as const;
export const SUPPORTED_ACCEPT = SUPPORTED_FORMATS.join(",");

export const TOOL_IDS = [
  "resize",
  "trim",
  "optimize",
  "text",
  "image",
  "stickers",
  "templates",
  "batch",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const TOOLS_ACTIVE: ToolId[] = ["resize", "trim", "optimize", "text", "image", "stickers", "templates", "batch"];

export const ERROR_MESSAGES = {
  UNSUPPORTED_TYPE: "This file type isn't supported. Try a GIF, MP4, or WebM.",
  FILE_TOO_LARGE: "This file exceeds 50 MB. Try a smaller file.",
  INVALID_URL: "Enter a valid http or https URL.",
  URL_FETCH_FAILED: "Couldn't fetch that URL. Check the link, CORS settings, or try downloading the file first.",
  EMPTY_URL_RESPONSE: "That URL returned an empty file.",
  WASM_LOAD_FAILED: "Processing engine failed to load. Check your connection and retry.",
  PROCESSING_FAILED: "Something went wrong during processing. Try again or use a different file.",
} as const;
