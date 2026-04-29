"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  hint?: string;
}

export function DropZone({
  onFilesAdded,
  disabled,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  label = "拖拽图片到此处",
  hint = "或点击选择文件 · 支持 JPEG, PNG, WebP, AVIF · 最大 100MB",
}: DropZoneProps) {
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
          ? "border-primary bg-primary/5 shadow-[0_0_0_4px_oklch(0.45_0.14_265/0.08)] dark:shadow-[0_0_0_4px_oklch(0.65_0.15_265/0.12)]"
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
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div
          className={cn(
            "rounded-2xl p-4 mb-4 transition-colors duration-200",
            isDragOver && !disabled
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isDragOver ? (
            <ImageIcon className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>
        <p className="text-lg font-medium mb-1">
          {isDragOver ? "释放以添加文件" : label}
        </p>
        <p className="text-sm text-muted-foreground">
          {hint}
        </p>
      </div>
    </Card>
  );
}
