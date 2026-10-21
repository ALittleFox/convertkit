import { downloadBlob } from "./zip-stream";
export { downloadBlob };

export interface FaviconSize {
  size: number;
  label: string;
  selected: boolean;
}

/**
 * All sizes are selected by default: generating the full set is cheap and
 * means the user can download everything without thinking about which sizes
 * they need.
 */
export const FAVICON_SIZES: FaviconSize[] = [
  { size: 16, label: "16×16", selected: true },
  { size: 32, label: "32×32", selected: true },
  { size: 48, label: "48×48", selected: true },
  { size: 96, label: "96×96", selected: true },
  { size: 180, label: "180×180", selected: true },
  { size: 192, label: "192×192", selected: true },
  { size: 512, label: "512×512", selected: true },
];

export function resizeImage(
  source: HTMLImageElement | HTMLCanvasElement,
  size: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Use better image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(source, 0, 0, size, size);
  return canvas;
}

export function canvasToPngBlob(canvas: CanvasImageSource & { width: number; height: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, 0);
    tempCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create PNG blob"));
      },
      "image/png"
    );
  });
}

export function canvasToPngDataUrl(canvas: CanvasImageSource & { width: number; height: number }): string {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const ctx = tempCanvas.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0);
  return tempCanvas.toDataURL("image/png");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Generate ICO file from PNG data
 * ICO format: Header + Directory entries + PNG data
 */
export async function generateIco(
  images: { size: number; pngData: Uint8Array }[]
): Promise<Blob> {
  // ICO Header: 6 bytes
  // - Reserved: 2 bytes (0)
  // - Type: 2 bytes (1 for ICO)
  // - Count: 2 bytes (number of images)

  // Directory entry: 16 bytes each
  // - Width: 1 byte (0 means 256)
  // - Height: 1 byte (0 means 256)
  // - Color palette: 1 byte (0)
  // - Reserved: 1 byte (0)
  // - Color planes: 2 bytes (1)
  // - Bits per pixel: 2 bytes (32)
  // - Image size: 4 bytes
  // - Image offset: 4 bytes

  const headerSize = 6;
  const entrySize = 16;
  const directorySize = entrySize * images.length;
  const dataOffset = headerSize + directorySize;

  // Calculate total size
  let totalSize = dataOffset;
  for (const img of images) {
    totalSize += img.pngData.length;
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write ICO header
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type: ICO
  view.setUint16(4, images.length, true); // Count

  // Write directory entries and image data
  let currentOffset = dataOffset;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const entryOffset = headerSize + i * entrySize;

    // Width (0 means 256)
    view.setUint8(entryOffset, img.size >= 256 ? 0 : img.size);
    // Height (0 means 256)
    view.setUint8(entryOffset + 1, img.size >= 256 ? 0 : img.size);
    // Color palette
    view.setUint8(entryOffset + 2, 0);
    // Reserved
    view.setUint8(entryOffset + 3, 0);
    // Color planes
    view.setUint16(entryOffset + 4, 1, true);
    // Bits per pixel
    view.setUint16(entryOffset + 6, 32, true);
    // Image size
    view.setUint32(entryOffset + 8, img.pngData.length, true);
    // Image offset
    view.setUint32(entryOffset + 12, currentOffset, true);

    // Copy PNG data
    bytes.set(img.pngData, currentOffset);
    currentOffset += img.pngData.length;
  }

  return new Blob([buffer], { type: "image/x-icon" });
}
