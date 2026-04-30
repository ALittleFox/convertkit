/// <reference lib="webworker" />

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface AudioTranscodeMessage {
  id: string;
  fileData: ArrayBuffer;
  fileName: string;
  options: {
    outputFormat: string;
    bitrate?: number;
    sampleRate?: number;
  };
}

let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function loadFFmpeg(): Promise<void> {
  if (loaded) return;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

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
  options: AudioTranscodeMessage["options"]
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

self.onmessage = async (e: MessageEvent<AudioTranscodeMessage>) => {
  const { id, fileData, fileName, options } = e.data;

  try {
    await loadFFmpeg();

    if (!ffmpeg) throw new Error("FFmpeg not loaded");

    const ext = options.outputFormat || "mp3";
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
    const args = buildArgs(inputName, outputName, options);
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
