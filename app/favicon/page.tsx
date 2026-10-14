"use client";

import { useState, useCallback, useRef } from "react";
import { Palette, Download, Upload, Trash2, Info, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FAVICON_SIZES,
  loadImage,
  resizeImage,
  canvasToPngDataUrl,
  generateIco,
  downloadBlob,
  type FaviconSize,
} from "@/lib/favicon-utils";
import { cn } from "@/lib/utils";

export default function FaviconPage() {
  const t = useTranslations("favicon");
  const tc = useTranslations("common");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceElement, setSourceElement] = useState<HTMLImageElement | null>(
    null
  );
  const [sizes, setSizes] = useState<FaviconSize[]>(FAVICON_SIZES);
  const [previews, setPreviews] = useState<
    { size: number; dataUrl: string }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    setSourceImage(url);

    try {
      const img = await loadImage(url);
      setSourceElement(img);
    } catch {
      console.error("Failed to load image");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const toggleSize = useCallback((index: number) => {
    setSizes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  }, []);

  const selectAll = useCallback(() => {
    setSizes((prev) => prev.map((s) => ({ ...s, selected: true })));
  }, []);

  const selectNone = useCallback(() => {
    setSizes((prev) => prev.map((s) => ({ ...s, selected: false })));
  }, []);

  const generatePreviews = useCallback(() => {
    if (!sourceElement) return;

    const selectedSizes = sizes.filter((s) => s.selected);
    const newPreviews = selectedSizes.map((s) => {
      const canvas = resizeImage(sourceElement, s.size);
      return {
        size: s.size,
        dataUrl: canvasToPngDataUrl(canvas),
      };
    });
    setPreviews(newPreviews);
  }, [sourceElement, sizes]);

  const downloadPng = useCallback(
    (size: number, dataUrl: string) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `favicon-${size}x${size}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  const downloadAllPng = useCallback(() => {
    previews.forEach((p) => {
      downloadPng(p.size, p.dataUrl);
    });
  }, [previews, downloadPng]);

  const downloadIco = useCallback(async () => {
    if (!sourceElement) return;

    const selectedSizes = sizes.filter((s) => s.selected);
    if (selectedSizes.length === 0) return;

    const icoSizes = selectedSizes.filter((s) => s.size <= 256);

    const images = await Promise.all(
      icoSizes.map(async (s) => {
        const canvas = resizeImage(sourceElement, s.size);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Failed"))),
            "image/png"
          );
        });
        return {
          size: s.size,
          pngData: new Uint8Array(await blob.arrayBuffer()),
        };
      })
    );

    const icoBlob = await generateIco(images);
    downloadBlob(icoBlob, "favicon.ico");
  }, [sourceElement, sizes]);

  const clearImage = useCallback(() => {
    if (sourceImage) URL.revokeObjectURL(sourceImage);
    setSourceImage(null);
    setSourceElement(null);
    setPreviews([]);
  }, [sourceImage]);

  const selectedCount = sizes.filter((s) => s.selected).length;
  const usageTips = t.raw("usageTips") as string[];

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* Left: Upload & Preview */}
        <div className="space-y-6">
          {/* Upload Area */}
          {!sourceImage ? (
            <Card
              className={cn(
                "relative cursor-pointer border-2 border-dashed transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                  : "border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/30"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                <div className="rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 bg-muted text-muted-foreground">
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <p className="text-base sm:text-lg font-medium mb-1">
                  {isDragging ? t("dragRelease") : t("upload")}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("uploadHint")}
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={sourceImage}
                        alt="Source"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">{t("sourceImage")}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {t("change")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearImage}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {tc("remove")}
                      </Button>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          {sourceImage && previews.length === 0 && (
            <Button onClick={generatePreviews} className="w-full">
              {t("generatePreview")}
            </Button>
          )}

          {/* Preview Grid */}
          {previews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("previewTitle")}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadAllPng}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("downloadAllPng")}
                  </Button>
                  <Button size="sm" onClick={downloadIco}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("downloadIco")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previews.map((preview) => (
                  <Card
                    key={preview.size}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => downloadPng(preview.size, preview.dataUrl)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-3 bg-[conic-gradient(#e5e7eb_90deg,#d1d5db_90deg_180deg,#e5e7eb_180deg_270deg,#d1d5db_270deg)] rounded">
                        <img
                          src={preview.dataUrl}
                          alt={`${preview.size}x${preview.size}`}
                          className="border"
                          style={{
                            width: Math.min(preview.size, 64),
                            height: Math.min(preview.size, 64),
                            imageRendering:
                              preview.size <= 32 ? "pixelated" : "auto",
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium">
                        {preview.size}x{preview.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("clickToDownload")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("sizeSelect")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {t("selectAll")}
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  {t("selectNone")}
                </Button>
              </div>
              <div className="space-y-2">
                {sizes.map((size, index) => (
                  <div
                    key={size.size}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`size-${size.size}`}
                      checked={size.selected}
                      onCheckedChange={() => toggleSize(index)}
                    />
                    <Label
                      htmlFor={`size-${size.size}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {size.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {size.size <= 32
                        ? "favicon"
                        : size.size === 180
                        ? "Apple"
                        : size.size <= 192
                        ? "Android"
                        : "PWA"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("selectedCount", { count: selectedCount })}
              </p>
            </CardContent>
          </Card>

          
        </div>
      </div>
<Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("usage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-2">
                {usageTips.map((tip: string, i: number) => (
                  <li key={i}>- {tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
      <div className="rounded-xl border bg-muted/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("pageIntro")}
          </p>
        </div>
        <div className="flex items-start gap-3 mt-3">
          <Shield className="h-5 w-5 mt-0.5 shrink-0 text-green-500" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("privacyNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
