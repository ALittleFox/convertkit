"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { normalizeLines, type LyricLine } from "@/lib/lyrics-utils";

interface LyricsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: LyricLine[];
  title: string;
  onSave: (lines: LyricLine[]) => void;
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(2);
}

export function LyricsEditor({
  open,
  onOpenChange,
  lines,
  title,
  onSave,
}: LyricsEditorProps) {
  const t = useTranslations("lyrics");
  const [draft, setDraft] = useState<LyricLine[]>(lines);

  const updateLine = (index: number, patch: Partial<LyricLine>) => {
    setDraft((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };

  const addLine = () => {
    const last = draft[draft.length - 1];
    const start = last ? last.endTime : 0;
    setDraft((prev) => [...prev, { startTime: start, endTime: start + 2, text: "" }]);
  };

  const deleteLine = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const cleaned = draft.filter((l) => l.text.trim().length > 0);
    onSave(normalizeLines(cleaned));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">
            {t("timeline")} · {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          {draft.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("noLines")}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[80px_80px_1fr_36px] gap-2 text-xs font-medium text-muted-foreground sticky top-0 bg-background py-1">
                <span>{t("startTime")}</span>
                <span>{t("endTime")}</span>
                <span>{t("text")}</span>
                <span />
              </div>
              {draft.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[80px_80px_1fr_36px] gap-2 items-center"
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatSeconds(line.startTime)}
                    onChange={(e) =>
                      updateLine(i, { startTime: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatSeconds(line.endTime)}
                    onChange={(e) =>
                      updateLine(i, { endTime: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => updateLine(i, { text: e.target.value })}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLine(i)}
                    aria-label={t("deleteLine")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t("addLine")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
