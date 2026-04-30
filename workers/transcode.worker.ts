/// <reference lib="webworker" />

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface TranscodeMessage {
  id: string;
  fileData: ArrayBuffer;
  fileName: string;
  options: {
    outputFormat: string;
    videoCodec?: string;
    crf?: number;
    scaleWidth?: number;
    scaleHeight?: number;
    removeAudio?: boolean;
  };
}

let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function loadFFmpeg(): Promise<void> {
  if (loaded) return;

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }: { progress: number }) => {
    // progress is 0-1 from FFmpeg
  });

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

function buildArgs(
  inputName: string,
  outputName: string,
  options: TranscodeMessage["options"],
  duration: number | null
): string[] {
  const args: string[] = ["-i", inputName];

  // Video codec
  if (options.outputFormat !== "gif") {
    switch (options.videoCodec) {
      case "h264":
        args.push("-c:v", "libx264");
        break;
      case "h265":
        args.push("-c:v", "libx265");
        break;
      case "vp9":
        args.push("-c:v", "libvpx-vp9");
        break;
      default:
        args.push("-c:v", "libx264");
    }

    // CRF quality
    if (options.crf !== undefined) {
      args.push("-crf", String(options.crf));
    }
  }

  // Resolution scaling
  if (options.scaleWidth || options.scaleHeight) {
    const w = options.scaleWidth || -2; // -2 = auto (maintain aspect ratio)
    const h = options.scaleHeight || -2;
    args.push("-vf", `scale=${w}:${h}`);
  }

  // Audio
  if (options.removeAudio) {
    args.push("-an");
  }

  // GIF special handling
  if (options.outputFormat === "gif") {
    args.push("-f", "gif");
  }

  // Overwrite without asking
  args.push("-y");
  args.push(outputName);

  return args;
}

self.onmessage = async (e: MessageEvent<TranscodeMessage>) => {
  const { id, fileData, fileName, options } = e.data;

  try {
    await loadFFmpeg();

    if (!ffmpeg) throw new Error("FFmpeg not loaded");

    const ext = options.outputFormat || "mp4";
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

    // Parse duration from logs
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
    };

    ffmpeg.on("progress", progressHandler);
    ffmpeg.on("log", logHandler);

    // Build and run FFmpeg command
    const args = buildArgs(inputName, outputName, options, duration);
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
      error: error instanceof Error ? error.message : "转码失败",
    });
  }
};
