import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "fs";

const src = "node_modules/@ffmpeg/core/dist/esm";
const dest = "public/ffmpeg";
const versionFile = `${dest}/.version`;

const currentVersion = JSON.parse(readFileSync("node_modules/@ffmpeg/core/package.json", "utf8")).version;

if (existsSync(versionFile) && readFileSync(versionFile, "utf8") === currentVersion) {
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  copyFileSync(`${src}/${file}`, `${dest}/${file}`);
}

writeFileSync(versionFile, currentVersion);
console.log(`@ffmpeg/core v${currentVersion} copied to ${dest}`);
