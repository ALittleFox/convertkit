import { getFilenameWithoutExt } from "./file-utils";
import { parseLrc, type LyricLine } from "./lyrics-utils";

/** Status of a lyric packaging project row. */
export type LyricsProjectStatus =
  | "ready" // has both audio + lrc, not packaged yet
  | "packaging"
  | "packaged"
  | "error";

/**
 * One packaging row: an M4A audio file plus its same-named LRC file.
 * `lrcFile` and `audioFile` may be missing (the row is then incomplete).
 */
export interface LyricsProject {
  /** Project name = the shared base filename (without extension). */
  name: string;
  audioFile?: File;
  lrcFile?: File;
  /** Parsed lyric timeline (populated when both files are present). */
  lines?: LyricLine[];
  status: LyricsProjectStatus;
  /** Output file name once packaged. */
  outputName?: string;
  error?: string;
  /** Result blob URL for downloading. */
  resultUrl?: string;
}

export interface LyricsScanResult {
  projects: LyricsProject[];
  /** File names that could not be grouped (no counterpart yet). */
  unmatched: string[];
}

const AUDIO_EXTENSIONS = new Set(["m4a", "mp4", "aac", "m4b"]);
const LRC_EXTENSIONS = new Set(["lrc", "txt"]);

function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Group a flat list of uploaded files into project rows by base filename.
 * Audio and LRC files sharing the same base name are paired together.
 */
export function groupFilesIntoProjects(files: File[]): LyricsScanResult {
  const byName = new Map<string, LyricsProject>();
  const unmatched: string[] = [];

  const ensure = (name: string): LyricsProject => {
    let project = byName.get(name);
    if (!project) {
      project = { name, status: "ready" };
      byName.set(name, project);
    }
    return project;
  };

  for (const file of files) {
    const ext = extOf(file.name);
    const base = getFilenameWithoutExt(file.name);

    if (AUDIO_EXTENSIONS.has(ext)) {
      // Prefer M4A when several audio variants share a name.
      const project = ensure(base);
      if (!project.audioFile || ext === "m4a") {
        project.audioFile = file;
      }
    } else if (LRC_EXTENSIONS.has(ext)) {
      ensure(base).lrcFile = file;
    } else {
      unmatched.push(file.name);
    }
  }

  const projects = Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return { projects, unmatched };
}

/** A project is complete only when both audio and lrc are present. */
export function isComplete(project: LyricsProject): boolean {
  return Boolean(project.audioFile && project.lrcFile);
}

/**
 * Parse the LRC content of a project and attach the resulting timeline.
 */
export async function loadProjectLyrics(
  project: LyricsProject
): Promise<LyricsProject> {
  if (!project.lrcFile) return project;
  const text = await project.lrcFile.text();
  const lines = parseLrc(text);
  return { ...project, lines };
}
