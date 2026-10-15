/**
 * LRC parsing and tx3g (3GPP timed text) sample encoding utilities.
 *
 * Used by the Apple Music lyrics packaging feature: an LRC file and an
 * AAC/M4A audio file are combined into a single M4A whose text track carries
 * the timed lyrics.
 */

export interface LyricLine {
  /** Start time in seconds. */
  startTime: number;
  /** End time in seconds (start of the next line, or start + fallback). */
  endTime: number;
  /** Lyric text. */
  text: string;
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** Fallback duration (seconds) applied to the last line when unknown. */
const DEFAULT_LAST_LINE_DURATION = 5;

function parseTimeTag(minutes: string, seconds: string, fraction?: string): number {
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  let ms = 0;
  if (fraction) {
    // LRC allows 2 or 3 digit fractions; treat them as hundredths / thousandths.
    ms = fraction.length === 3 ? parseInt(fraction, 10) : parseInt(fraction, 10) * 10;
  }
  return m * 60 + s + ms / 1000;
}

/**
 * Parse LRC text into a sorted timeline of `{ startTime, endTime, text }`.
 *
 * Supports multiple time tags per line (`[00:01.00][00:05.00]text`) and skips
 * metadata tags such as `[ar:...]`, `[ti:...]` and `[offset:...]`.
 * The `[offset:+/-ms]` tag is honoured when present.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  const rawLines = lrcText.replace(/\r\n?/g, "\n").split("\n");

  // First pass: collect offset if provided.
  let offsetMs = 0;
  for (const line of rawLines) {
    const m = line.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
    if (m) {
      offsetMs = parseInt(m[1], 10);
      break;
    }
  }

  const entries: { startTime: number; text: string }[] = [];

  for (const rawLine of rawLines) {
    TIME_TAG.lastIndex = 0;
    const times: number[] = [];
    let match: RegExpExecArray | null;
    let lastTagEnd = 0;

    while ((match = TIME_TAG.exec(rawLine)) !== null) {
      times.push(
        parseTimeTag(match[1], match[2], match[3]) + offsetMs / 1000
      );
      lastTagEnd = match.index + match[0].length;
    }

    if (times.length === 0) continue;

    const text = rawLine.slice(lastTagEnd).trim();
    // Skip timestamp-only / blank lines. They would otherwise become
    // zero-length tx3g samples, which Apple's lyric decoder rejects.
    if (text.length === 0) continue;
    for (const t of times) {
      entries.push({ startTime: Math.max(0, t), text });
    }
  }

  entries.sort((a, b) => a.startTime - b.startTime);

  const lines: LyricLine[] = entries.map((entry, i) => {
    const next = entries[i + 1];
    const endTime = next
      ? next.startTime
      : entry.startTime + DEFAULT_LAST_LINE_DURATION;
    return {
      startTime: entry.startTime,
      endTime,
      text: entry.text,
    };
  });

  return lines;
}

/**
 * Serialize a lyric timeline back to LRC text (used when saving edits).
 */
export function serializeLrc(lines: LyricLine[]): string {
  const formatTime = (seconds: number): string => {
    const total = Math.max(0, seconds);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.round((total - Math.floor(total)) * 100);
    return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
  };
  return lines.map((l) => `${formatTime(l.startTime)}${l.text}`).join("\n");
}

/** Sort lines by start time and recompute end times from neighbours. */
export function normalizeLines(
  lines: LyricLine[],
  fallbackDuration = DEFAULT_LAST_LINE_DURATION
): LyricLine[] {
  const sorted = [...lines].sort((a, b) => a.startTime - b.startTime);
  return sorted.map((line, i) => {
    const next = sorted[i + 1];
    const endTime = next
      ? next.startTime
      : Math.max(line.startTime + 1, line.startTime + fallbackDuration);
    return { ...line, endTime };
  });
}

// ---------------------------------------------------------------------------
// tx3g (3GPP timed text) sample encoding
// ---------------------------------------------------------------------------

/**
 * Encode a single line of text as a tx3g sample.
 *
 * Sample layout (ISO/IEC 14496-17 / 3GPP TS 26.245):
 *   uint16 textLength (bytes, big-endian)
 *   UTF-8 text
 * The text is encoded as UTF-8 by default (Apple Music accepts UTF-8 tx3g).
 */
export function encodeTx3gSample(text: string): Uint8Array<ArrayBuffer> {
  const textBytes = new TextEncoder().encode(text);
  const out = new Uint8Array(2 + textBytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, textBytes.length, false);
  out.set(textBytes, 2);
  return out;
}

/**
 * Total byte size of a tx3g sample for the given text.
 */
export function tx3gSampleSize(text: string): number {
  return 2 + new TextEncoder().encode(text).length;
}
