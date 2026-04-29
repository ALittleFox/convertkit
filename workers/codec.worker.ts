/// <reference lib="webworker" />

import { encode as encodeJpeg, decode as decodeJpeg } from "@jsquash/jpeg";
import { encode as encodeWebp, decode as decodeWebp } from "@jsquash/webp";
import { encode as encodeAvif, decode as decodeAvif } from "@jsquash/avif";
import { encode as encodePng, decode as decodePng } from "@jsquash/png";
import { optimise as optimisePng } from "@jsquash/oxipng";

interface WorkerMessage {
  id: string;
  data: ArrayBuffer;
  type: "compress" | "convert";
  options: {
    quality?: number;
    lossless?: boolean;
    effort?: number;
    targetFormat?: string;
  };
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: ArrayBuffer;
  width?: number;
  height?: number;
  originalSize?: number;
  resultSize?: number;
  error?: string;
}

async function decodeImage(data: ArrayBuffer, mime: string): Promise<ImageData> {
  let result: ImageData | null = null;
  switch (mime) {
    case "image/jpeg":
      result = await decodeJpeg(data);
      break;
    case "image/webp":
      result = await decodeWebp(data);
      break;
    case "image/avif":
      result = await decodeAvif(data);
      break;
    case "image/png":
      result = await decodePng(data);
      break;
    default:
      throw new Error(`Unsupported format: ${mime}`);
  }
  if (!result) {
    throw new Error(`Failed to decode ${mime}`);
  }
  return result;
}


async function encodeImage(
  imageData: ImageData,
  format: string,
  options: WorkerMessage["options"]
): Promise<ArrayBuffer> {
  switch (format) {
    case "image/jpeg":
      return encodeJpeg(imageData, { quality: options.quality || 80 });
    case "image/webp":
      return encodeWebp(imageData, {
        quality: options.quality || 80,
        lossless: options.lossless ? 1 : 0,
      });
    case "image/avif":
      return encodeAvif(imageData, {
        quality: options.quality || 60,
        speed: options.effort || 6,
      });
    case "image/png": {
      const pngData = await encodePng(imageData);
      return optimisePng(pngData, { level: 2 });
    }
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function getOutputFormat(inputMime: string, type: string, targetFormat?: string): string {
  if (type === "convert" && targetFormat) {
    return `image/${targetFormat}`;
  }
  return inputMime;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, data, type, options } = e.data;

  try {
    const inputMime = detectMime(data);
    const imageData = await decodeImage(data, inputMime);
    const outputFormat = getOutputFormat(inputMime, type, options.targetFormat);

    let result = await encodeImage(imageData, outputFormat, options);

    // For same-format compression, return original if encoded result is larger
    if (inputMime === outputFormat && result.byteLength >= data.byteLength) {
      result = data;
    }

    const response: WorkerResponse = {
      id,
      success: true,
      data: result,
      width: imageData.width,
      height: imageData.height,
      originalSize: data.byteLength,
      resultSize: result.byteLength,
    };

    self.postMessage(response, [result]);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
};

function detectMime(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data.slice(0, 12));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "image/avif";
  }

  throw new Error("Unable to detect image format");
}
