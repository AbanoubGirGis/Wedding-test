import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { get, put } from "@vercel/blob";

const require = createRequire(import.meta.url);
const blobPath = "wishes.json";
const filePath = join(process.cwd(), "data", "wishes.json");
const recipients = new Set(["groom", "bride", "both"]);

let filePassword = "";
try {
  filePassword = require("../appsettings.json")?.Wishes?.Password || "";
} catch {
  filePassword = "";
}

let tail = Promise.resolve();

function exclusive(task) {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function password() {
  return process.env.WISHES_PASSWORD || filePassword || "";
}

function storageMode() {
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.VERCEL) return "missing";
  return "file";
}

export function passwordMatches(provided) {
  const expected = password();
  if (!expected) return false;
  const actual = createHash("sha256").update(String(provided), "utf8").digest();
  const required = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actual, required);
}

export function parseWish(input) {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name ?? "").trim();
  const to = String(input.to ?? "").trim();
  const message = String(input.message ?? "").trim();
  if (typeof input.attending !== "boolean") return null;
  if (name.length === 0 || name.length > 80 || !recipients.has(to) || message.length > 2000) return null;
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    name,
    to,
    message,
    attending: input.attending
  };
}

function view(notes) {
  return notes
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .map((item) => ({
      at: item.at,
      name: item.name,
      to: item.to,
      message: item.message,
      attending: Boolean(item.attending)
    }));
}

async function readFileStore() {
  try {
    const text = await readFile(filePath, "utf8");
    if (!text.trim()) return [];
    const notes = JSON.parse(text);
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeFileStore(notes) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(notes, null, 2), "utf8");
}

async function readBlobStore() {
  let result;
  try {
    result = await get(blobPath, { access: "private", useCache: false });
  } catch (error) {
    if (error && error.name === "BlobNotFoundError") return { notes: [], etag: null };
    throw error;
  }
  if (!result || result.statusCode !== 200 || !result.stream) return { notes: [], etag: null };
  const text = await new Response(result.stream).text();
  if (!text.trim()) return { notes: [], etag: result.blob.etag };
  const notes = JSON.parse(text);
  return { notes: Array.isArray(notes) ? notes : [], etag: result.blob.etag };
}

async function writeBlobStore(notes, etag) {
  await put(blobPath, JSON.stringify(notes, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {})
  });
}

async function readStored() {
  if (storageMode() === "missing") {
    throw new Error("Connect a Vercel Blob store to this project so guest notes can be saved.");
  }
  if (storageMode() === "file") return { notes: await readFileStore(), etag: null };
  return readBlobStore();
}

async function writeStored(notes, etag) {
  if (storageMode() === "file") {
    await writeFileStore(notes);
    return;
  }
  await writeBlobStore(notes, etag);
}

export function readNotes() {
  return exclusive(async () => view((await readStored()).notes));
}

export function saveWish(entry) {
  return exclusive(async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { notes, etag } = await readStored();
      if (notes.some((item) => item.id === entry.id)) return;
      try {
        await writeStored(notes.concat(entry), etag);
      } catch (error) {
        if (error && error.name === "BlobPreconditionFailedError") continue;
        throw error;
      }
      if (etag) return;
      const saved = await readStored();
      if (saved.notes.some((item) => item.id === entry.id)) return;
    }
    throw new Error("Could not save the note");
  });
}

function gateToken() {
  return createHmac("sha256", password()).update("open").digest("base64url");
}

export function isOpen(request) {
  if (!password()) return false;
  const header = request.headers.get("cookie") || "";
  const match = header.match(/(?:^|;\s*)wishes-gate=([^;]*)/);
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(gateToken());
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

export function gateCookie(request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  const secure = forwarded === "https" || new URL(request.url).protocol === "https:";
  const parts = [
    `wishes-gate=${gateToken()}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=14400"
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
