"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProcessOptions } from "@/lib/batch-engine";

interface SettingsPanelProps {
  type: "compress" | "convert";
  options: ProcessOptions;
  onChange: (options: ProcessOptions) => void;
  files?: File[];
}

export function SettingsPanel({ type, options, onChange, files }: SettingsPanelProps) {
  const isPng =
    type === "convert"
      ? options.targetFormat === "png"
      : files && files.length > 0 && files.every((f) => f.type === "image/png");
  const updateOption = <K extends keyof ProcessOptions>(
    key: K,
    value: ProcessOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {type === "compress" ? "压缩设置" : "转换设置"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === "convert" && (
          <div className="space-y-2">
            <Label>目标格式</Label>
            <Select
              value={options.targetFormat || "webp"}
              onValueChange={(value) => updateOption("targetFormat", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="avif">AVIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isPng && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>质量</Label>
              <span className="text-sm text-muted-foreground">{options.quality}%</span>
            </div>
            <Slider
              value={[options.quality || 80]}
              onValueChange={(value) => updateOption("quality", Array.isArray(value) ? value[0] : value)}
              min={1}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              仅影响 JPEG、WebP、AVIF，PNG 使用无损优化
            </p>
          </div>
        )}

        {(type === "compress" || options.targetFormat === "webp") && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lossless"
              checked={options.lossless || false}
              onCheckedChange={(checked) => updateOption("lossless", !!checked)}
            />
            <Label htmlFor="lossless" className="text-sm font-normal">
              无损压缩
            </Label>
          </div>
        )}

        {(type === "compress" || options.targetFormat === "avif") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>压缩力度</Label>
              <span className="text-sm text-muted-foreground">{options.effort}</span>
            </div>
            <Slider
              value={[options.effort || 6]}
              onValueChange={(value) => updateOption("effort", Array.isArray(value) ? value[0] : value)}
              min={1}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              值越高速度越慢，质量越好
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
