import { createFileValidator } from "./file-utils";

const videoValidator = createFileValidator(
  ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  500 * 1024 * 1024,
  "500MB"
);

export const validateVideoFile = videoValidator.validate;
export const filterValidVideoFiles = videoValidator.filterValid;

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function videoMimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
  };
  return map[mime] || "mp4";
}

export function getVideoOutputMime(format: string): string {
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    gif: "image/gif",
  };
  return map[format] || "video/mp4";
}

export function getVideoOutputExt(format: string): string {
  return format || "mp4";
}

export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to 10% of duration or 1s, whichever is smaller
      video.currentTime = Math.min(video.duration * 0.1, 1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } else {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to create canvas context"));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video for thumbnail"));
    };

    video.src = url;
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = url;
  });
}
