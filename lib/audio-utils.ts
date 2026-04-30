const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/flac",
  "audio/webm",
  "audio/x-m4a",
  "audio/mp4",
  // Video types accepted for audio extraction
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500MB

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAudioFile(file: File): AudioValidationResult {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的格式: ${file.type || "未知"}`,
    };
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB (最大 500MB)`,
    };
  }

  return { valid: true };
}

export function filterValidAudioFiles(files: File[]): {
  valid: File[];
  invalid: { file: File; error: string }[];
} {
  const valid: File[] = [];
  const invalid: { file: File; error: string }[] = [];

  for (const file of files) {
    const result = validateAudioFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error! });
    }
  }

  return { valid, invalid };
}

export function getAudioOutputMime(format: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    aac: "audio/aac",
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
