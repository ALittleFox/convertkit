import { test, expect } from "@playwright/test";
import path from "path";

const AUDIO = path.join(__dirname, "fixtures/石满仓 - 黄土谣.m4a");
const LRC = path.join(__dirname, "fixtures/石满仓 - 黄土谣.lrc");
const PROJECT = "石满仓 - 黄土谣";

// Force the Simplified Chinese locale so assertions are stable.
const PAGE = "/lyrics/zh-Hans";

test.describe("Lyrics page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test("shows the page heading and a multi-file drop zone", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("歌词");
    const input = page.locator('input[type="file"]');
    await expect(input).toHaveAttribute("multiple");
    await expect(input).toHaveAttribute("accept", /lrc/);
  });

  test("pairs same-named audio and lrc into one project row", async ({ page }) => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([AUDIO, LRC]);

    await expect(page.getByText(PROJECT, { exact: false }).first()).toBeVisible();
    await expect(page.getByText("就绪")).toBeVisible();
  });

  test("marks a lone audio file as incomplete and unselectable", async ({
    page,
  }) => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([AUDIO]);

    await expect(page.getByText("不完整")).toBeVisible();
    const checkbox = page.getByRole("checkbox").last();
    await expect(checkbox).toBeDisabled();
  });

  test("packages a complete project into an M4A with AAC + tx3g tracks", async ({
    page,
  }) => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([AUDIO, LRC]);

    await page.getByRole("button", { name: "封装", exact: true }).click();
    await expect(
      page.getByRole("main").getByText("已封装", { exact: true })
    ).toBeVisible({ timeout: 60_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载" }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${PROJECT}.m4a`);

    // Validate the produced M4A: audio track must carry a real `esds`
    // decoder config (regression guard for the "misidentified as FLAC" bug),
    // and the lyrics must be present as a tx3g text track.
    const outPath = test.info().outputPath("packaged.m4a");
    await download.saveAs(outPath);
    const buf = (await import("fs")).readFileSync(outPath);
    const MP4Box = await import("mp4box");
    const file = MP4Box.createFile();

    const result = await new Promise<{
      audioCodec?: string;
      hasEsds: boolean;
      oti?: number;
      hasTextTrack: boolean;
      textTrackFlags?: number;
      texts: string[];
      emptySampleCount: number;
      textTrackLanguage?: number;
      textTrackMediaDuration?: number;
      movieDurationTicks?: number;
      brands?: string[];
      moofCount: number;
      mdatCount: number;
    }>((resolve, reject) => {
      file.onError = (_m: string, msg: string) => reject(new Error(msg));
      file.onReady = (info: {
        tracks: { id: number; type?: string; codec: string }[];
        brands: string[];
      }) => {
        const audio = info.tracks.find((t) => t.type === "audio");
        const text = info.tracks.find((t) => (t.codec ?? "").includes("tx3g"));

        let hasEsds = false;
        let oti: number | undefined;
        if (audio) {
          const trak = file.getTrackById(audio.id);
          const entry = trak.mdia.minf.stbl.stsd.entries[0] as {
            boxes?: { type: string; esd?: { descs?: { oti?: number }[] } }[];
          };
          const esds = (entry.boxes ?? []).find((b) => b.type === "esds");
          hasEsds = Boolean(esds);
          oti = esds?.esd?.descs?.[0]?.oti;
        }

        let textTrackFlags: number | undefined;
        let textTrackLanguage: number | undefined;
        let textTrackMediaDuration: number | undefined;
        if (text) {
          const trak = file.getTrackById(text.id);
          textTrackFlags = trak.tkhd.flags;
          const mdia = trak.boxes?.find((b) => b.type === "mdia");
          const mdhd = mdia?.boxes?.find((b) => b.type === "mdhd") as
            | { language?: number; duration?: number }
            | undefined;
          textTrackLanguage = mdhd?.language;
          textTrackMediaDuration = mdhd?.duration;
        }

        const boxCounts = file.boxes.reduce<Record<string, number>>((acc, b) => {
          acc[b.type] = (acc[b.type] ?? 0) + 1;
          return acc;
        }, {});

        const texts: string[] = [];
        let emptySampleCount = 0;
        if (text) {
          const parser = new MP4Box.TX3GParser();
          file.setExtractionOptions(text.id, null, { nbSamples: 10000 });
          file.onSamples = (_id: number, _u: unknown, samples: { data?: Uint8Array; size: number }[]) => {
            for (const s of samples) {
              if (s.size <= 2) {
                emptySampleCount++;
                continue;
              }
              const raw = parser.parseSample(s as never) as string | undefined;
              if (typeof raw !== "string") continue;
              // mp4box returns a latin1 string; re-decode the bytes as UTF-8.
              const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0) & 0xff);
              texts.push(new TextDecoder("utf-8").decode(bytes));
            }
          };
          file.start();
        }

        setTimeout(
          () =>
            resolve({
              audioCodec: audio?.codec,
              hasEsds,
              oti,
              hasTextTrack: Boolean(text),
              textTrackFlags,
              textTrackLanguage,
              textTrackMediaDuration,
              movieDurationTicks: (file.moov as { mvhd?: { duration?: number } }).mvhd?.duration,
              texts,
              emptySampleCount,
              brands: info.brands,
              moofCount: boxCounts.moof ?? 0,
              mdatCount: boxCounts.mdat ?? 0,
            }),
          150
        );
      };
      file.appendBuffer(
        MP4Box.MP4BoxBuffer.fromArrayBuffer(
          buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
          0
        )
      );
      file.flush();
    });

    // Audio must be identified as AAC (not FLAC/unknown).
    expect(result.audioCodec).toMatch(/^mp4a/);
    expect(result.hasEsds).toBe(true);
    expect(result.oti).toBe(0x40); // MPEG-4 AAC
    expect(result.brands?.[0]).toBe("M4A ");
    // Must be a NON-fragmented file (no moof boxes); Apple Music ignores
    // lyrics in fragmented MP4s.
    expect(result.moofCount).toBe(0);
    expect(result.mdatCount).toBeGreaterThan(0);
    // Lyrics track present, enabled, and populated.
    expect(result.hasTextTrack).toBe(true);
    expect(result.textTrackFlags).toBe(3); // enabled | in movie | in preview
    expect(result.texts.length).toBeGreaterThan(0);
    // No zero-length tx3g samples: a size<=2 sample (empty text) is invalid
    // and makes Apple's lyric decoder reject the track.
    expect(result.emptySampleCount).toBe(0);
    // mdhd must carry a valid packed language code (0 = invalid).
    expect(result.textTrackLanguage).toBeGreaterThan(0);
    // Lyric track must span the whole song (no premature truncation).
    expect(result.textTrackMediaDuration).toBe(result.movieDurationTicks);
  });

  test("opens the lyrics timeline editor with parsed lines", async ({
    page,
  }) => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([AUDIO, LRC]);

    await page.getByRole("button", { name: new RegExp(PROJECT) }).first().click();

    await expect(page.getByText("歌词时间轴")).toBeVisible();
    // The real LRC has many lines; assert at least the editor rendered rows.
    const startInputs = page.locator('input[type="number"]');
    expect(await startInputs.count()).toBeGreaterThan(0);
  });

  test("batch-packages all selected projects", async ({ page }) => {
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([AUDIO, LRC]);

    const batchButton = page.getByRole("button", { name: /封装已选/ });
    await expect(batchButton).toContainText("1");
    await batchButton.click();

    // The project status badge should flip to "已封装" (scope to main to avoid
    // the toast notification which shows the same text).
    await expect(
      page.getByRole("main").getByText("已封装", { exact: true })
    ).toBeVisible({ timeout: 60_000 });
  });
});
