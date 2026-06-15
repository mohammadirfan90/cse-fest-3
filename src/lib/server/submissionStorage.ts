import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

export const SUBMISSIONS_ROOT = path.join(
  process.cwd(),
  process.env.SUBMISSIONS_DIR ?? "storage/submissions"
);

export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

const competitionSlugCache = new Map<string, string>();

export async function getCompetitionSlug(compId: string): Promise<string> {
  if (competitionSlugCache.has(compId)) return competitionSlugCache.get(compId)!;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .select("slug")
    .eq("id", compId)
    .single();
  if (error || !data) {
    throw new Error(`Unable to fetch slug for competition ${compId}: ${error?.message}`);
  }
  competitionSlugCache.set(compId, data.slug);
  return data.slug;
}

// Removed unused placeholder function

export function getCompetitionCategory(compName: string): "software" | "iot" | "idea" {
  const name = compName.toLowerCase();
  if (name.includes("software")) return "software";
  if (name.includes("iot")) return "iot";
  if (name.includes("idea")) return "idea";
  return "software"; // Default fallback
}

export function submissionDirPath(categoryOrSlug: string, teamId: string): string {
  // Determine if the argument is a slug (alphanumeric, hyphens) or a legacy category
  const folder = isSlug(categoryOrSlug) ? categoryOrSlug : getCompetitionCategory(categoryOrSlug);
  return path.join(SUBMISSIONS_ROOT, folder, teamId);
}

export function isSlug(value: string): boolean {
  // Slug consists of lowercase alphanumerics and hyphens, no spaces
  return /^[a-z0-9-]+$/.test(value);
}

export function isValidPDFSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

export function isValidVideoSignature(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // WebM/MKV container (starts with EBML header: 1A 45 DF A3)
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return true;
  }
  // MP4 check: contains ftyp starting at offset 4
  if (buffer.length >= 8) {
    const ftyp = buffer.toString("ascii", 4, 8);
    if (ftyp === "ftyp") return true;
  }
  return false;
}

export async function writeSubmissionFile(
  categoryOrSlug: string,
  teamId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const folder = isSlug(categoryOrSlug) ? categoryOrSlug : getCompetitionCategory(categoryOrSlug);
  const safeFileName = `${crypto.randomUUID()}${path.extname(fileName)}`;

  // Bypass physical fs writes on Vercel serverless environment
  if (process.env.VERCEL) {
    return `${folder}/${teamId}/${safeFileName}`;
  }

  const dir = submissionDirPath(categoryOrSlug, teamId);
  await fs.mkdir(dir, { recursive: true });

  const absPath = path.join(dir, safeFileName);
  await fs.writeFile(absPath, buffer);

  // Return the relative path from root to store in DB
  return path.relative(SUBMISSIONS_ROOT, absPath).replace(/\\/g, "/");
}

export async function deleteSubmissionFile(relativeUrl: string): Promise<void> {
  if (!relativeUrl) return;
  if (process.env.VERCEL) return; // Bypass fs operations on Vercel
  try {
    const absPath = path.join(SUBMISSIONS_ROOT, relativeUrl);
    // Path traversal protection
    if (!absPath.startsWith(SUBMISSIONS_ROOT)) {
      throw new Error("Directory traversal attempt blocked.");
    }
    await fs.unlink(absPath);
  } catch {
    // Best effort cleanup: ignore error if file doesn't exist
  }
}

export async function streamSubmissionFile(
  relativeUrl: string,
  req: Request,
  contentType: string
): Promise<Response> {
  const absPath = path.join(SUBMISSIONS_ROOT, relativeUrl);
  // Path traversal protection
  if (!absPath.startsWith(SUBMISSIONS_ROOT)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.stat(absPath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunksize = end - start + 1;
      const fileHandle = await fs.open(absPath, "r");
      const readBuffer = Buffer.alloc(chunksize);
      await fileHandle.read(readBuffer, 0, chunksize, start);
      await fileHandle.close();

      return new Response(readBuffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    } else {
      const data = await fs.readFile(absPath);
      return new Response(data, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (err) {
    return new Response("File not found", { status: 404 });
  }
}
