"use client";

import { Lock, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { type VideoProcessOptions } from "@/lib/video-batch-engine";
import { useState, useCallback } from "react";

interface VideoSettingsPanelProps {
  options: VideoProcessOptions;
  onChange: (options: VideoProcessOptions) => void;
}

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
  { value: "mov", label: "MOV" },
  { value: "gif", label: "GIF" },
];

const CODEC_MAP: Record<string, { value: string; label: string }[]> = {
  mp4: [
    { value: "h264", label: "H.264" },
    { value: "h265", label: "H.265" },
  ],
  webm: [{ value: "vp9", label: "VP9" }],
  mov: [
    { value: "h264", label: "H.264" },
    { value: "h265", label: "H.265" },
  ],
  gif: [],
};

export function VideoSettingsPanel({
  options,
  onChange,
}: VideoSettingsPanelProps) {
  const t = useTranslations("transcode");
  const [aspectLocked, setAspectLocked] = useState(true);

  const availableCodecs = CODEC_MAP[options.outputFormat] || [];

  const handleFormatChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const codecs = CODEC_MAP[value] || [];
      const newCodec = codecs.length > 0 ? codecs[0].value : "h264";
      onChange({
        ...options,
        outputFormat: value as VideoProcessOptions["outputFormat"],
        videoCodec: newCodec as VideoProcessOptions["videoCodec"],
      });
    },
    [options, onChange]
  );

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const w = value ? parseInt(value, 10) : undefined;
      onChange({
        ...options,
        scaleWidth: w,
        scaleHeight: aspectLocked && w ? undefined : options.scaleHeight,
      });
    },
    [options, onChange, aspectLocked]
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const h = value ? parseInt(value, 10) : undefined;
      onChange({
        ...options,
        scaleHeight: h,
        scaleWidth: aspectLocked && h ? undefined : options.scaleWidth,
      });
    },
    [options, onChange, aspectLocked]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t("settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Output Format + Video Codec + Remove Audio */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3">
          <div className="space-y-2">
            <Label className="text-xs">{t("outputFormat")}</Label>
            <Select value={options.outputFormat} onValueChange={handleFormatChange}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {availableCodecs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">{t("videoCodec")}</Label>
              <Select
                value={options.videoCodec}
                onValueChange={(value) =>
                  onChange({
                    ...options,
                    videoCodec: (value || "h264") as VideoProcessOptions["videoCodec"],
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCodecs.map((codec) => (
                    <SelectItem key={codec.value} value={codec.value}>
                      {codec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs invisible">.</Label>
            <div className="flex items-center gap-1.5 h-8">
              <Checkbox
                id="remove-audio"
                checked={options.removeAudio}
                onCheckedChange={(checked) =>
                  onChange({ ...options, removeAudio: !!checked })
                }
              />
              <Label htmlFor="remove-audio" className="text-xs cursor-pointer whitespace-nowrap">
                {t("removeAudio")}
              </Label>
            </div>
          </div>
        </div>

        {/* CRF Quality */}
        {options.outputFormat !== "gif" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("crf")}</Label>
              <span className="text-xs text-muted-foreground">
                {options.crf}
              </span>
            </div>
            <Slider
              value={[options.crf]}
              min={0}
              max={51}
              step={1}
              onValueChange={(value) =>
                onChange({
                  ...options,
                  crf: Array.isArray(value) ? value[0] : value,
                })
              }
            />
            <p className="text-[10px] text-muted-foreground">
              {t("crfHint")}
            </p>
          </div>
        )}

        {/* Resolution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("resolution")}</Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setAspectLocked(!aspectLocked)}
            >
              {aspectLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder={t("width")}
              value={options.scaleWidth ?? ""}
              onChange={handleWidthChange}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              min={1}
            />
            <span className="text-xs text-muted-foreground">×</span>
            <input
              type="number"
              placeholder={t("height")}
              value={options.scaleHeight ?? ""}
              onChange={handleHeightChange}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              min={1}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("resolutionHint")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
