/**
 * M4A + timed-lyrics muxer built on mp4box.js.
 *
 * Produces a *non-fragmented* M4A (ftyp + mdat(s) + moov) that:
 *   - keeps the original AAC audio track byte-for-byte (no re-encoding), and
 *   - adds a `tx3g` (3GPP timed text) track carrying the lyrics, which Apple
 *     Music / iOS use for synced lyrics on side-loaded files.
 *
 * Why not the `addTrack`/`addSample` helper API? In mp4box 2.4.x `addSample`
 * writes one `moof`+`mdat` pair per sample on the top level, i.e. it can only
 * produce a *fragmented* MP4. Apple Music ignores lyrics in fragmented files,
 * so we instead parse the source file and inject a hand-built text track.
 */
import {
  createFile,
  MP4BoxBuffer,
  BoxParser,
  type Box,
  type ISOFile,
  type Movie,
} from "mp4box";
import { encodeTx3gSample, type LyricLine } from "./lyrics-utils";

export interface MuxResult {
  blob: Blob;
  durationSec: number;
  audioSampleCount: number;
  lyricLineCount: number;
}

const TEXT_TIMESCALE = 1000; // milliseconds

/**
 * Pack a 3-letter ISO-639-2/T language code into the 15-bit form used by the
 * `mdhd` box (three 5-bit values offset from 'a'). Mirrors mp4box's own
 * `parseLanguage` so `mdhd.write()` emits a valid code instead of 0.
 */
function packLanguage(code: string): number {
  const c = (code.toLowerCase() + "\u0000\u0000\u0000").slice(0, 3);
  const v = (i: number) => {
    const n = c.charCodeAt(i) - 0x60;
    return n >= 1 && n <= 26 ? n : 0;
  };
  return (v(0) << 10) | (v(1) << 5) | v(2);
}

interface ParsedAudio {
  lines: LyricLine[];
  movieTimescale: number;
  movieDuration: number; // in movie timescale
  brands: string[];
  udta: Box | undefined;
  audioSampleCount: number;
}

/** Parse the source M4A: validate it, grab brands/udta/mvhd, and keep mdat. */
function inspectSource(buffer: ArrayBuffer): Promise<ParsedAudio> {
  return new Promise((resolve, reject) => {
    // keepMdatData=true so the audio payload survives the round-trip.
    const file = createFile(true) as ISOFile;
    let resolved = false;
    const fail = (msg: string) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(msg));
      }
    };

    file.onError = (_m: string, msg: string) => fail(msg);

    file.onReady = (info: Movie) => {
      const audio = info.tracks.find((t) => t.type === "audio");
      if (!audio) return fail("NO_AUDIO_TRACK");
      if (!audio.codec || !audio.codec.startsWith("mp4a")) return fail("NOT_AAC");

      const moov = file.moov as unknown as { mvhd?: { timescale: number; duration: number } };
      const movieTimescale = moov.mvhd?.timescale ?? 1000;
      const movieDuration = moov.mvhd?.duration ?? Math.round(audio.duration);

      const ftyp = (file as unknown as { ftyp?: { major_brand: string; compatible_brands: string[] } }).ftyp;
      const brands =
        ftyp?.compatible_brands?.length
          ? [ftyp.major_brand, ...ftyp.compatible_brands]
          : ["M4A ", "M4A ", "isom", "iso2"];

      const udta =
        (moov as { udta?: Box }).udta ??
        (file.moov?.boxes?.find((b: Box) => b.type === "udta") as Box | undefined);

      resolved = true;
      resolve({
        lines: [],
        movieTimescale,
        movieDuration,
        brands,
        udta,
        audioSampleCount: audio.nb_samples ?? 0,
      });
    };

    try {
      file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
      file.flush();
    } catch (err) {
      fail(err instanceof Error ? err.message : "PARSE_FAILED");
    }
  });
}

/** Guarantee `M4A ` leads the brand list and standard brands are present. */
function normalizeBrands(source: string[]): string[] {
  const brands = source.filter(Boolean);
  if (!brands.includes("M4A ")) brands.unshift("M4A ");
  if (!brands.includes("isom")) brands.push("isom");
  if (!brands.includes("iso2")) brands.push("iso2");
  return Array.from(new Set(brands));
}

/** Default tx3g sample-description style record (30 bytes, no styling). */
function createTx3gDescription(): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(30);
  const dv = new DataView(data.buffer);
  // box_record: top/left/bottom/right = -1 (auto)
  dv.setInt16(12, -1);
  dv.setInt16(14, -1);
  dv.setInt16(16, -1);
  dv.setInt16(18, -1);
  // style_record: startChar/endChar=0, fontID=1, styleFlags=0, fontSize=18, color=white
  dv.setUint16(22, 1);
  dv.setUint8(25, 18);
  data[26] = 0xff;
  data[27] = 0xff;
  data[28] = 0xff;
  return data;
}

interface BuiltTrak {
  trak: Box;
  samples: { data: Uint8Array<ArrayBuffer>; duration: number; cts: number }[];
  stco: { chunk_offsets: number[] };
}

/**
 * Build a complete `tx3g` text `trak` (with empty stco to be filled later).
 */
function buildTextTrak(
  trackId: number,
  lines: LyricLine[],
  movieTimescale: number,
  movieDuration: number,
  language: string,
  trackEndMs: number
): BuiltTrak {
  const bx = BoxParser.box;

  // Build a clean, gap-free sample list:
  //  - drop blank/whitespace-only lines (a zero-length tx3g sample is invalid
  //    and makes Apple's lyric decoder reject the whole track);
  //  - force the timeline to be seamless: each sample ends exactly when the
  //    next begins, so any pause between two lines is absorbed by the earlier
  //    sample rather than leaving a hole in the track.
  const cleaned = lines
    .map((l) => ({ ...l, text: l.text.trim() }))
    .filter((l) => l.text.length > 0)
    .sort((a, b) => a.startTime - b.startTime);

  const samples = cleaned.map((l, i) => {
    const startMs = Math.max(0, Math.round(l.startTime * TEXT_TIMESCALE));
    const next = cleaned[i + 1];
    let endMs: number;
    if (next) {
      endMs = Math.max(startMs + 1, Math.round(next.startTime * TEXT_TIMESCALE));
    } else {
      // Last line: hold it until the end of the audio so the lyric track's
      // media duration covers the whole song. A shorter track (lyrics stopping
      // before the music ends) makes some players treat the file as broken.
      endMs = Math.max(
        startMs + 1,
        Math.round(l.endTime * TEXT_TIMESCALE),
        trackEndMs
      );
    }
    return {
      data: encodeTx3gSample(l.text),
      duration: Math.max(1, endMs - startMs),
      cts: startMs,
    };
  });
  const mediaDuration = samples.reduce((sum, s) => sum + s.duration, 0);

  const trak = new bx.trak();

  const tkhd = new bx.tkhd();
  Object.assign(tkhd, {
    version: 0,
    flags: 3, // enabled | in movie | in preview
    creation_time: 0,
    modification_time: 0,
    track_id: trackId,
    duration: movieDuration,
    layer: 0,
    alternate_group: 0,
    volume: 0,
    width: 0,
    height: 0,
    matrix: [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824],
  });
  trak.addBox(tkhd);

  const mdia = new bx.mdia();
  trak.addBox(mdia);

  const mdhd = new bx.mdhd();
  Object.assign(mdhd, {
    version: 0,
    flags: 0,
    creation_time: 0,
    modification_time: 0,
    timescale: TEXT_TIMESCALE,
    duration: mediaDuration,
    // mdhd stores the language as a packed 15-bit ISO-639-2/T code (see
    // mp4box `parseLanguage`), NOT the raw string. Passing a string leaves the
    // field as 0, which players read as an invalid language and may reject.
    language: packLanguage(language),
  });
  mdia.addBox(mdhd);

  const hdlr = new bx.hdlr();
  Object.assign(hdlr, { version: 0, flags: 0, handler: "text", name: "Lyrics" });
  mdia.addBox(hdlr);

  const minf = new bx.minf();
  mdia.addBox(minf);
  minf.addBox(new bx.sthd());

  const dinf = new bx.dinf();
  minf.addBox(dinf);
  const dref = new bx.dref() as unknown as { entry_count: number; addEntry?: (b: Box) => void; boxes?: Box[] };
  dinf.addBox(dref as unknown as Box);
  const urlBox = new bx["url "] as unknown as { flags: number };
  urlBox.flags = 1; // self-contained
  if (typeof dref.addEntry === "function") dref.addEntry(urlBox as unknown as Box);
  else {
    dref.boxes = dref.boxes ?? [];
    dref.boxes.push(urlBox as unknown as Box);
    dref.entry_count = 1;
  }

  const stbl = new bx.stbl();
  minf.addBox(stbl);

  const stsd = new bx.stsd() as unknown as {
    entry_count: number;
    entries: Box[];
    addEntry?: (b: Box) => void;
  };
  stbl.addBox(stsd as unknown as Box);
  const entry = new (BoxParser.sampleEntry.tx3g)() as unknown as {
    data_reference_index: number;
    data: Uint8Array<ArrayBuffer>;
  };
  entry.data_reference_index = 1;
  entry.data = createTx3gDescription();
  if (typeof stsd.addEntry === "function") stsd.addEntry(entry as unknown as Box);
  else {
    stsd.entries = stsd.entries ?? [];
    stsd.entries.push(entry as unknown as Box);
    stsd.entry_count = 1;
  }

  // stts: run-length encode equal durations
  const stts = new bx.stts() as unknown as { sample_counts: number[]; sample_deltas: number[] };
  stts.sample_counts = [];
  stts.sample_deltas = [];
  for (const s of samples) {
    const last = stts.sample_deltas.length - 1;
    if (last >= 0 && stts.sample_deltas[last] === s.duration) {
      stts.sample_counts[last] += 1;
    } else {
      stts.sample_deltas.push(s.duration);
      stts.sample_counts.push(1);
    }
  }
  stbl.addBox(stts as unknown as Box);

  // stsc: one sample per chunk
  const stsc = new bx.stsc() as unknown as {
    first_chunk: number[];
    samples_per_chunk: number[];
    sample_description_index: number[];
  };
  Object.assign(stsc, {
    first_chunk: [1],
    samples_per_chunk: [1],
    sample_description_index: [1],
  });
  stbl.addBox(stsc as unknown as Box);

  // stsz: sample_size MUST be 0 to emit per-sample sizes
  const stsz = new bx.stsz() as unknown as { sample_size: number; sample_sizes: number[] };
  stsz.sample_size = 0;
  stsz.sample_sizes = samples.map((s) => s.data.length);
  stbl.addBox(stsz as unknown as Box);

  const stco = new bx.stco() as unknown as { chunk_offsets: number[] };
  stco.chunk_offsets = [];
  stbl.addBox(stco as unknown as Box);

  return { trak, samples, stco };
}

/**
 * Combine an M4A audio file with a lyric timeline into a new M4A blob.
 * Audio is copied losslessly; lyrics are written as a tx3g track.
 */
export async function muxLyricsIntoM4A(
  audioFile: File,
  lines: LyricLine[]
): Promise<MuxResult> {
  const buffer = await audioFile.arrayBuffer();
  const meta = await inspectSource(buffer);

  // Re-parse keeping mdat data for the actual write pass.
  const file = createFile(true) as ISOFile;
  await new Promise<void>((resolve, reject) => {
    file.onError = (_m: string, msg: string) => reject(new Error(msg));
    file.onReady = () => resolve();
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
    file.flush();
  });

  if (meta.audioSampleCount === 0) throw new Error("NO_AUDIO_SAMPLES");

  const bx = BoxParser.box;

  // Ignore blank lines when computing the movie duration too.
  const meaningfulLines = lines.filter((l) => l.text.trim().length > 0);

  // Extend movie duration if lyrics run past the audio.
  const lyricEnd = meaningfulLines.length
    ? meaningfulLines[meaningfulLines.length - 1].endTime
    : 0;
  const lyricDurationMovieTs = Math.round(lyricEnd * meta.movieTimescale);
  const finalDuration = Math.max(meta.movieDuration, lyricDurationMovieTs);
  const mvhd = (file.moov as unknown as { mvhd: { duration: number } }).mvhd;
  if (mvhd) mvhd.duration = finalDuration;

  // Build + attach the text trak.
  const nextTrackId =
    (file.moov as unknown as { mvhd?: { next_track_id?: number } }).mvhd?.next_track_id ?? 2;
  // Hold the last lyric until the end of the movie (in text timescale) so the
  // lyric track spans the whole song.
  const trackEndMs = Math.round((finalDuration / meta.movieTimescale) * 1000);
  const { trak, samples, stco } = buildTextTrak(
    nextTrackId,
    lines,
    meta.movieTimescale,
    finalDuration,
    // Chinese lyric text -> mark the track as Chinese; players use this for
    // localisation matching.
    "zho",
    trackEndMs
  );
  (file.moov as unknown as { mvhd: { next_track_id: number } }).mvhd.next_track_id =
    nextTrackId + 1;
  file.moov.addBox(trak);

  // Pack all text samples into one mdat placed *before* moov, so its byte
  // offset does not depend on the (stco-dependent) size of moov.
  const total = samples.reduce((sum, s) => sum + s.data.length, 0);
  const flat = new Uint8Array(total);
  let cursor = 0;
  for (const s of samples) {
    flat.set(s.data, cursor);
    cursor += s.data.length;
  }
  const textMdat = new bx.mdat() as unknown as { data: Uint8Array };
  textMdat.data = flat;

  const boxes = file.boxes;
  const moovIdx = boxes.findIndex((b) => b.type === "moov");
  if (moovIdx >= 0) boxes.splice(moovIdx, 0, textMdat as unknown as Box);
  else boxes.push(textMdat as unknown as Box);

  // Compute each sample's absolute offset within the file.
  let offset = 0;
  for (const b of boxes) {
    if (b === (textMdat as unknown as Box)) break;
    if (!b.size) {
      try {
        (b as unknown as { computeSize: () => void }).computeSize();
      } catch {
        /* ignore */
      }
    }
    offset += b.size || 0;
  }
  offset += 8; // mdat header (size + fourcc)
  stco.chunk_offsets = [];
  for (const s of samples) {
    stco.chunk_offsets.push(offset);
    offset += s.data.length;
  }

  // Re-apply the M4A brands (the parsed file keeps the source ftyp, but make
  // sure it leads with `M4A `).
  const ftyp = (file as unknown as { ftyp?: { major_brand: string; compatible_brands: string[] } }).ftyp;
  if (ftyp) {
    const brands = normalizeBrands([ftyp.major_brand, ...(ftyp.compatible_brands || [])]);
    ftyp.major_brand = brands[0];
    ftyp.compatible_brands = brands;
  }

  const outName = audioFile.name.replace(/\.[^.]+$/, "") + ".m4a";
  const blob = file.save(outName);

  return {
    blob,
    durationSec: finalDuration / meta.movieTimescale,
    audioSampleCount: meta.audioSampleCount,
    lyricLineCount: samples.length,
  };
}
