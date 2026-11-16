"use strict";

const MAX_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 256;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;

function fail() {
  process.exitCode = 1;
}

function checkDocxArchive(buffer) {
  if (buffer.length < 22 || buffer.length > MAX_INPUT_BYTES) throw new Error("invalid archive");

  const firstEocd = Math.max(0, buffer.length - 22 - 0xffff);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= firstEocd; offset--) {
    if (buffer.readUInt32LE(offset) !== 0x06054b50) continue;
    const commentLength = buffer.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === buffer.length) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("invalid archive");

  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const diskEntries = buffer.readUInt16LE(eocd + 8);
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (
    disk !== 0 || centralDisk !== 0 || diskEntries !== entries ||
    entries < 3 || entries > MAX_ENTRIES || entries === 0xffff ||
    centralSize === 0xffffffff || centralOffset === 0xffffffff ||
    centralSize > 1024 * 1024 || centralOffset + centralSize !== eocd
  ) throw new Error("unsupported archive layout");

  const names = new Set();
  const ranges = [];
  let totalUncompressed = 0;
  let cursor = centralOffset;
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > eocd || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("invalid directory");
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const diskNumber = buffer.readUInt16LE(cursor + 34);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > eocd || nameLength < 1 || localOffset + 30 > centralOffset) throw new Error("invalid directory entry");
    if ((flags & 1) !== 0 || ![0, 8].includes(method) || diskNumber !== 0) throw new Error("unsupported entry");
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error("zip64 unsupported");
    if (uncompressedSize > MAX_ENTRY_BYTES || compressedSize > MAX_INPUT_BYTES) throw new Error("entry too large");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_BYTES || (uncompressedSize > 0 && compressedSize === 0)) throw new Error("archive too large");

    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (
      !name || name.includes("\0") || name.includes("\\") || name.startsWith("/") ||
      name.split("/").some((part) => part === ".." || part === ".") || names.has(name)
    ) throw new Error("unsafe archive path");
    if (!(name === "[Content_Types].xml" || name.startsWith("_rels/") || name.startsWith("docProps/") || name.startsWith("word/"))) {
      throw new Error("unexpected archive entry");
    }
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0xf000) === 0xa000) throw new Error("symbolic link not allowed");
    names.add(name);

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("invalid local header");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const localName = buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString("utf8");
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (localName !== name || dataStart > centralOffset || dataEnd > centralOffset) throw new Error("invalid local entry");
    ranges.push([localOffset, dataEnd]);
    cursor = recordEnd;
  }
  if (cursor !== centralOffset + centralSize) throw new Error("directory size mismatch");
  ranges.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ranges.length; i++) if (ranges[i][0] < ranges[i - 1][1]) throw new Error("overlapping entries");
  for (const required of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) {
    if (!names.has(required)) throw new Error("required document part missing");
  }
}

const chunks = [];
let inputSize = 0;
process.stdin.on("data", (chunk) => {
  inputSize += chunk.length;
  if (inputSize > MAX_INPUT_BYTES) {
    process.stdin.destroy();
    fail();
    return;
  }
  chunks.push(chunk);
});
process.stdin.on("end", async () => {
  try {
    const buffer = Buffer.concat(chunks);
    checkDocxArchive(buffer);
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (typeof result.value !== "string" || result.value.length > MAX_TEXT_CHARS) throw new Error("text too large");
    process.stdout.write(JSON.stringify({ text: result.value }));
  } catch {
    fail();
  }
});
