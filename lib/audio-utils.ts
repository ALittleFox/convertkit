import { createFileValidator } from "./file-utils";

const audioValidator = createFileValidator(
  [
    "audio/mpeg",
    "audio/mp3",
    "audio/aac",
    "audio/ogg",
    "audio/wav",
    "audio/flac",
    "audio/webm",
    "audio/x-m4a",
    "audio/mp4",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ],
  500 * 1024 * 1024,
  "500MB"
);

export const validateAudioFile = audioValidator.validate;
export const filterValidAudioFiles = audioValidator.filterValid;

export function getAudioOutputMime(format: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    aac: "audio/aac",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    wav: "audio/wav",
  };
  return map[format] || "audio/mpeg";
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio");
    const url = URL.createObjectURL(file);

    el.preload = "metadata";

    el.onloadedmetadata = () => {
      const duration = el.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };

    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio metadata"));
    };

    el.src = url;
  });
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}
