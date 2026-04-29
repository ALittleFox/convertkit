import { zip } from "fflate";

export async function downloadAsZip(
  files: { name: string; data: ArrayBuffer }[],
  zipName: string = "images.zip"
): Promise<void> {
  const zipData: Record<string, Uint8Array> = {};

  for (const file of files) {
    zipData[file.name] = new Uint8Array(file.data);
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(zipData, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
  downloadBlob(blob, zipName);
}

export function downloadSingle(data: ArrayBuffer, filename: string, mime: string): void {
  const blob = new Blob([data], { type: mime });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
