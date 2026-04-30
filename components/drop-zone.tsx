"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  mobileLabel?: string;
  hint?: string;
}

export function DropZone({
  onFilesAdded,
  disabled,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  label,
  mobileLabel,
  hint,
}: DropZoneProps) {
  const t = useTranslations("dropzone");
  const resolvedLabel = label ?? t("dragImage");
  const resolvedMobileLabel = mobileLabel ?? t("addImage");
  const resolvedHint = hint ?? t("imageHint");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesAdded(files);
      }
    },
    [disabled, onFilesAdded]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesAdded(files);
      }
      e.target.value = "";
    },
    [onFilesAdded]
  );

  return (
    <Card
      className={cn(
        "relative cursor-pointer border-2 border-dashed transition-all duration-200",
        isDragOver && !disabled
          ? "border-primary bg-primary/5 ring-4 ring-primary/10"
          : "border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center justify-center py-5 sm:py-12 px-4">
        <div
          className={cn(
            "rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 transition-colors duration-200",
            isDragOver && !disabled
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isDragOver ? (
            <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
          ) : (
            <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
          )}
        </div>
        <p className="text-base sm:text-lg font-medium mb-1">
          {isDragOver ? t("release") : (
            <>
              <span className="sm:hidden">{resolvedMobileLabel}</span>
              <span className="hidden sm:inline">{resolvedLabel}</span>
            </>
          )}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {resolvedHint}
        </p>
      </div>
    </Card>
  );
}
