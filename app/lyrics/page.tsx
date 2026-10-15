"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Music,
  Download,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  FileText,
  Pencil,
  Info,
  Shield,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropZone } from "@/components/drop-zone";
import { LyricsEditor } from "@/components/lyrics-editor";
import { toast } from "sonner";
import {
  groupFilesIntoProjects,
  loadProjectLyrics,
  isComplete,
  type LyricsProject,
} from "@/lib/lyrics-projects";
import { normalizeLines, type LyricLine } from "@/lib/lyrics-utils";
import { muxLyricsIntoM4A } from "@/lib/lyrics-muxer";
import { getFilenameWithoutExt } from "@/lib/file-utils";
import { cn } from "@/lib/utils";

export default function LyricsPage() {
  const t = useTranslations("lyrics");

  const [projects, setProjects] = useState<LyricsProject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [editing, setEditing] = useState<LyricsProject | null>(null);

  const completeProjects = useMemo(
    () => projects.filter(isComplete),
    [projects]
  );

  const allSelected =
    completeProjects.length > 0 &&
    completeProjects.every((p) => selected.has(p.name));

  const updateProject = useCallback(
    (name: string, patch: Partial<LyricsProject>) => {
      setProjects((prev) =>
        prev.map((p) => (p.name === name ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      const { projects: grouped } = groupFilesIntoProjects(files);

      // Merge with existing projects by name.
      const map = new Map(projects.map((p) => [p.name, p]));
      for (const g of grouped) {
        const existing = map.get(g.name);
        if (existing) {
          map.set(g.name, {
            ...existing,
            audioFile: g.audioFile ?? existing.audioFile,
            lrcFile: g.lrcFile ?? existing.lrcFile,
          });
        } else {
          map.set(g.name, g);
        }
      }

      // Parse lyrics for all complete projects.
      const merged = await Promise.all(
        Array.from(map.values()).map(loadProjectLyrics)
      );
      merged.sort((a, b) => a.name.localeCompare(b.name));

      setProjects(merged);
      // Newly completed projects are selected by default.
      setSelected((prev) => {
        const next = new Set(prev);
        for (const p of merged) {
          if (isComplete(p) && !prev.has(p.name)) next.add(p.name);
        }
        return next;
      });
    },
    [projects]
  );

  const removeProject = useCallback((name: string) => {
    setProjects((prev) => prev.filter((p) => p.name !== name));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setProjects([]);
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((name: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(completeProjects.map((p) => p.name)) : new Set());
    },
    [completeProjects]
  );

  const packageProject = useCallback(
    async (project: LyricsProject): Promise<boolean> => {
      if (!project.audioFile || !project.lrcFile) return false;
      updateProject(project.name, { status: "packaging", error: undefined });
      try {
        const lines = project.lines ?? [];
        const result = await muxLyricsIntoM4A(project.audioFile, lines);
        const outputName =
          getFilenameWithoutExt(project.audioFile.name) + ".m4a";
        const url = URL.createObjectURL(result.blob);
        updateProject(project.name, {
          status: "packaged",
          outputName,
          resultUrl: url,
          error: undefined,
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "PACKAGE_FAILED";
        const friendly =
          message === "NOT_AAC"
            ? t("notAudio")
            : message === "NO_AUDIO_TRACK" || message === "NO_AUDIO_SAMPLES"
            ? t("missingAudio")
            : message;
        updateProject(project.name, { status: "error", error: friendly });
        return false;
      }
    },
    [updateProject, t]
  );

  const handlePackageSelected = useCallback(async () => {
    const targets = projects.filter(
      (p) => isComplete(p) && selected.has(p.name)
    );
    if (targets.length === 0) return;

    setIsProcessing(true);
    let ok = 0;
    let failed = 0;
    for (const project of targets) {
      const success = await packageProject(project);
      if (success) ok++;
      else failed++;
    }
    setIsProcessing(false);

    if (failed === 0) {
      toast.success(t("packaged"), { description: `${ok}` });
    } else {
      toast.warning(t("failed"), { description: `${ok} / ${failed}` });
    }
  }, [projects, selected, packageProject, t]);

  const handleSaveLines = useCallback(
    (name: string, lines: LyricLine[]) => {
      updateProject(name, {
        lines: normalizeLines(lines),
        status: "ready",
        resultUrl: undefined,
        outputName: undefined,
      });
    },
    [updateProject]
  );

  const handleDownload = useCallback((project: LyricsProject) => {
    if (!project.resultUrl || !project.outputName) return;
    const a = document.createElement("a");
    a.href = project.resultUrl;
    a.download = project.outputName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleDownloadAll = useCallback(() => {
    for (const project of projects) {
      if (project.status === "packaged" && project.resultUrl) {
        handleDownload(project);
      }
    }
  }, [projects, handleDownload]);

  const packagedCount = projects.filter((p) => p.status === "packaged").length;

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <DropZone
          onFilesAdded={handleFilesAdded}
          disabled={isProcessing}
          accept=".m4a,.mp4,.aac,.m4b,.lrc,.txt,audio/mp4,audio/mpeg,audio/aac,audio/x-m4a"
          label={t("dragAudio")}
          mobileLabel={t("dragAudio")}
          hint={`${t("dragLrc")} · ${t("lrcHint")}`}
        />
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("audioHint")}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handlePackageSelected}
                disabled={isProcessing || selected.size === 0}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isProcessing ? t("processing") : t("packageAll")}
                {selected.size > 0 && ` (${selected.size})`}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={clearAll}
                  disabled={isProcessing || projects.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownloadAll}
                  disabled={packagedCount === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("download")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Project table */}
      {projects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                aria-label={t("selectAll")}
              />
              <span className="text-sm text-muted-foreground">
                {selected.size} / {completeProjects.length}
              </span>
            </div>
          </div>

          <div className="rounded-xl border divide-y">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[40px_1fr_90px_90px_110px_120px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span />
              <span>{t("colProject")}</span>
              <span>{t("colAudio")}</span>
              <span>{t("colLrc")}</span>
              <span>{t("colStatus")}</span>
              <span className="text-right">{t("colAction")}</span>
            </div>

            {projects.map((project) => {
              const complete = isComplete(project);
              const checked = selected.has(project.name);
              return (
                <div
                  key={project.name}
                  className={cn(
                    "grid grid-cols-[40px_1fr] sm:grid-cols-[40px_1fr_90px_90px_110px_120px] gap-2 px-4 py-3 items-center",
                    !complete && "opacity-60"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={!complete}
                    onCheckedChange={(c) => toggleSelect(project.name, Boolean(c))}
                    aria-label={project.name}
                  />
                  <button
                    type="button"
                    className="text-left min-w-0"
                    disabled={!complete}
                    onClick={() => complete && setEditing(project)}
                  >
                    <span className="text-sm font-medium truncate block flex items-center gap-1.5">
                      {project.name}
                      {complete && (
                        <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {project.status === "error" && project.error
                        ? project.error
                        : project.lines
                        ? `${project.lines.length} ${t("colLrc")}`
                        : !complete
                        ? !project.audioFile
                          ? t("missingAudio")
                          : t("missingLrc")
                        : ""}
                    </span>
                  </button>

                  <span className="hidden sm:flex items-center">
                    <FileAudio
                      className={cn(
                        "h-4 w-4",
                        project.audioFile ? "text-green-500" : "text-muted-foreground/40"
                      )}
                    />
                  </span>
                  <span className="hidden sm:flex items-center">
                    <FileText
                      className={cn(
                        "h-4 w-4",
                        project.lrcFile ? "text-green-500" : "text-muted-foreground/40"
                      )}
                    />
                  </span>

                  <span className="hidden sm:block">
                    <StatusBadge status={project.status} complete={complete} />
                  </span>

                  <div className="hidden sm:flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => packageProject(project)}
                      disabled={!complete || isProcessing}
                    >
                      {project.status === "packaging" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("packageOne")
                      )}
                    </Button>
                    {project.status === "packaged" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDownload(project)}
                        aria-label={t("download")}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeProject(project.name)}
                      aria-label={t("cancel")}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <LyricsEditor
        key={editing?.name ?? "none"}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        lines={editing?.lines ?? []}
        title={editing?.name ?? ""}
        onSave={(lines) => editing && handleSaveLines(editing.name, lines)}
      />
    </div>
  );
}

function StatusBadge({
  status,
  complete,
}: {
  status: LyricsProject["status"];
  complete: boolean;
}) {
  const t = useTranslations("lyrics");

  if (!complete) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircle className="mr-1 h-3 w-3" />
        {t("incomplete")}
      </Badge>
    );
  }

  switch (status) {
    case "packaging":
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {t("packaging")}
        </Badge>
      );
    case "packaged":
      return (
        <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t("packaged")}
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          {t("failed")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-primary border-primary/30">
          {t("ready")}
        </Badge>
      );
  }
}
