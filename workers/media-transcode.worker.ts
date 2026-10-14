/// <reference lib="webworker" />

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

type MediaKind = "audio" | "video";

interface MediaTranscodeMessage {
  id: string;
  kind: MediaKind;
  fileData: ArrayBuffer;
  fileName: string;
  options: {
    // audio
    outputFormat: string;
    bitrate?: number;
    sampleRate?: number;
    // video
    videoCodec?: string;
    crf?: number;
    scaleWidth?: number;
    scaleHeight?: number;
    removeAudio?: boolean;
    // audio codec for video output
    audioBitrate?: number;
  };
}

let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function loadFFmpeg(): Promise<void> {
  if (loaded) return;

  ffmpeg = new FFmpeg();

  const baseURL = "/ffmpeg";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  loaded = true;
}

/**
 * Build ffmpeg arguments for audio transcoding / extraction.
 * Handles both audio inputs and video inputs (video track is dropped via -vn).
 */
function buildAudioArgs(
  inputName: string,
  outputName: string,
  options: MediaTranscodeMessage["options"]
): string[] {
  const args: string[] = ["-i", inputName];

  // Strip video track (for video-to-audio extraction)
  args.push("-vn");

  // Audio codec + bitrate
  switch (options.outputFormat) {
    case "mp3":
      args.push("-c:a", "libmp3lame");
      args.push("-b:a", `${options.bitrate || 192}k`);
      break;
    case "aac":
    case "m4a":
      args.push("-c:a", "aac");
      args.push("-b:a", `${options.bitrate || 192}k`);
      break;
    case "ogg":
      args.push("-c:a", "libopus");
      args.push("-b:a", `${options.bitrate || 128}k`);
      break;
    case "flac":
      args.push("-c:a", "flac");
      break;
    case "wav":
      args.push("-c:a", "pcm_s16le");
      break;
    default:
      args.push("-c:a", "libmp3lame");
      args.push("-b:a", `${options.bitrate || 192}k`);
  }

  // Sample rate
  if (options.sampleRate) {
    args.push("-ar", String(options.sampleRate));
  }

  // Overwrite without asking
  args.push("-y");
  args.push(outputName);

  return args;
}

/**
 * Build ffmpeg arguments for video transcoding.
 */
function buildVideoArgs(
  inputName: string,
  outputName: string,
  options: MediaTranscodeMessage["options"]
): string[] {
  const args: string[] = ["-i", inputName];

  // Video codec
  switch (options.videoCodec) {
    case "h264":
      args.push("-c:v", "libx264");
      // CRF quality
      if (options.crf !== undefined) {
        args.push("-crf", String(options.crf));
      }
      // Ensure broad compatibility across players.
      args.push("-pix_fmt", "yuv420p");
      break;
    case "h265":
      args.push("-c:v", "libx265");
      if (options.crf !== undefined) {
        args.push("-crf", String(options.crf));
      }
      args.push("-pix_fmt", "yuv420p");
      break;
    default:
      args.push("-c:v", "libx264");
      if (options.crf !== undefined) {
        args.push("-crf", String(options.crf));
      }
      args.push("-pix_fmt", "yuv420p");
  }

  // Resolution scaling
  if (options.scaleWidth || options.scaleHeight) {
    const w = options.scaleWidth || -2; // -2 = auto (maintain aspect ratio)
    const h = options.scaleHeight || -2;
    args.push("-vf", `scale=${w}:${h}`);
  }

  // Audio: MP4/MOV both accept AAC.
  if (options.removeAudio) {
    args.push("-an");
  } else {
    args.push("-c:a", "aac");
    args.push("-b:a", `${options.audioBitrate || 192}k`);
  }

  // Overwrite without asking
  args.push("-y");
  args.push(outputName);

  return args;
}

self.onmessage = async (e: MessageEvent<MediaTranscodeMessage>) => {
  const { id, kind, fileData, options } = e.data;
  const errorLogs: string[] = [];

  try {
    await loadFFmpeg();

    if (!ffmpeg) throw new Error("FFmpeg not loaded");

    const ext = options.outputFormat || (kind === "video" ? "mp4" : "mp3");
    const inputName = `input_${id}`;
    const outputName = `output_${id}.${ext}`;

    // Write input file to virtual FS
    await ffmpeg.writeFile(inputName, new Uint8Array(fileData));

    // Set up progress reporting
    let duration: number | null = null;
    const progressHandler = ({ progress }: { progress: number }) => {
      const pct = Math.min(Math.max(Math.round(progress * 100), 0), 100);
      self.postMessage({ id, type: "progress", progress: pct });
    };

    // Collect error-relevant log lines
    const logHandler = ({ message }: { message: string }) => {
      if (duration === null) {
        const durationMatch = message.match(
          /Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/
        );
        if (durationMatch) {
          const h = parseInt(durationMatch[1], 10);
          const m = parseInt(durationMatch[2], 10);
          const s = parseFloat(durationMatch[3]);
          duration = h * 3600 + m * 60 + s;
        }
      }
      if (message.includes("Error") || message.includes("error") || message.includes("Invalid")) {
        errorLogs.push(message.trim());
      }
    };

    ffmpeg.on("progress", progressHandler);
    ffmpeg.on("log", logHandler);

    // Build and run FFmpeg command
    const args =
      kind === "video"
        ? buildVideoArgs(inputName, outputName, options)
        : buildAudioArgs(inputName, outputName, options);
    await ffmpeg.exec(args);

    // Remove event listeners
    ffmpeg.off("progress", progressHandler);
    ffmpeg.off("log", logHandler);

    // Read output
    const result = await ffmpeg.readFile(outputName);

    // Cleanup virtual FS
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const resultData = (result as Uint8Array).buffer;

    self.postMessage(
      {
        id,
        type: "result",
        success: true,
        data: resultData,
        originalSize: fileData.byteLength,
        resultSize: (result as Uint8Array).byteLength,
      },
      [resultData]
    );
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      success: false,
      error: errorLogs.length > 0
        ? errorLogs.slice(-3).join("; ")
        : error instanceof Error
        ? error.message.slice(0, 200)
        : "转码失败",
    });
  }
};
