"use client";

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
import { type AudioProcessOptions } from "@/lib/audio-batch-engine";
import { useCallback } from "react";

interface AudioSettingsPanelProps {
  options: AudioProcessOptions;
  onChange: (options: AudioProcessOptions) => void;
}

const FORMAT_OPTIONS = [
  { value: "mp3", label: "MP3" },
  { value: "aac", label: "AAC" },
  { value: "ogg", label: "OGG (Opus)" },
  { value: "flac", label: "FLAC" },
  { value: "wav", label: "WAV" },
];

const BITRATE_OPTIONS = [
  { value: "64", label: "64 kbps" },
  { value: "128", label: "128 kbps" },
  { value: "192", label: "192 kbps" },
  { value: "256", label: "256 kbps" },
  { value: "320", label: "320 kbps" },
];

const SAMPLE_RATE_OPTIONS = [
  { value: "0", label: "Auto" },
  { value: "22050", label: "22050 Hz" },
  { value: "44100", label: "44100 Hz" },
  { value: "48000", label: "48000 Hz" },
];

const LOSSLESS_FORMATS = new Set(["flac", "wav"]);

export function AudioSettingsPanel({
  options,
  onChange,
}: AudioSettingsPanelProps) {
  const t = useTranslations("audio");

  const isLossless = LOSSLESS_FORMATS.has(options.outputFormat);

  const handleFormatChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const fmt = value as AudioProcessOptions["outputFormat"];
      // Reset bitrate for lossless formats
      const newOptions: AudioProcessOptions = {
        ...options,
        outputFormat: fmt,
      };
      if (LOSSLESS_FORMATS.has(fmt)) {
        newOptions.bitrate = 0;
      } else if (options.bitrate === 0) {
        newOptions.bitrate = 192;
      }
      onChange(newOptions);
    },
    [options, onChange]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t("settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Output Format */}
        <div className="space-y-2">
          <Label className="text-xs">{t("outputFormat")}</Label>
          <Select
            value={options.outputFormat}
            onValueChange={handleFormatChange}
          >
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

        {/* Bitrate — hidden for lossless */}
        {!isLossless && (
          <div className="space-y-2">
            <Label className="text-xs">{t("bitrate")}</Label>
            <Select
              value={String(options.bitrate)}
              onValueChange={(value) => {
                if (!value) return;
                onChange({
                  ...options,
                  bitrate: parseInt(value, 10),
                });
              }}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BITRATE_OPTIONS.map((br) => (
                  <SelectItem key={br.value} value={br.value}>
                    {br.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {t("bitrateHint")}
            </p>
          </div>
        )}

        {/* Sample Rate */}
        <div className="space-y-2">
          <Label className="text-xs">{t("sampleRate")}</Label>
          <Select
            value={String(options.sampleRate || 0)}
            onValueChange={(value) => {
              if (!value) return;
              const rate = parseInt(value, 10);
              onChange({
                ...options,
                sampleRate: rate || undefined,
              });
            }}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLE_RATE_OPTIONS.map((sr) => (
                <SelectItem key={sr.value} value={sr.value}>
                  {sr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            {t("sampleRateHint")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
