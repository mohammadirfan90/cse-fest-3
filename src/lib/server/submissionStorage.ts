import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

const uploadDirEnv = process.env.UPLOAD_DIR || process.env.SUBMISSIONS_DIR || "storage/submissions";
export const SUBMISSIONS_ROOT = path.isAbsolute(uploadDirEnv)
  ? uploadDirEnv
  : path.join(process.cwd(), uploadDirEnv);

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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word, non-space, non-hyphen
    .replace(/[\s_]+/g, "-")  // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

export function submissionDirPath(compSlug: string, teamSlug: string): string {
  return path.join(SUBMISSIONS_ROOT, "csefest", "competitions", compSlug, "teams", teamSlug);
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
  compSlug: string,
  teamSlug: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const fileExt = path.extname(fileName) || ".pdf";
  const isVideo = isValidVideoSignature(buffer);
  const standardName = isVideo ? `demo_video${fileExt}` : `proposal_v1${fileExt}`;

  const relativePath = `csefest/competitions/${compSlug}/teams/${teamSlug}/${standardName}`;

  if (process.env.VERCEL) {
    return relativePath;
  }

  const dir = submissionDirPath(compSlug, teamSlug);
  await fs.mkdir(dir, { recursive: true });

  const absPath = path.join(dir, standardName);
  await fs.writeFile(absPath, buffer);

  return relativePath;
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
    // Best effort cleanup
  }
}

export async function streamSubmissionFile(
  relativeUrl: string,
  req: Request,
  contentType: string
): Promise<Response> {
  // Return a mock inline PDF document if using the vercel placeholder path
  if (relativeUrl.startsWith("mock-vercel-uploads/")) {
    if (contentType === "application/pdf") {
      const mockPdf = `%PDF-1.4
1 0 obj < /Type /Catalog /Pages 2 0 R > endobj
2 0 obj < /Type /Pages /Kids [3 0 R] /Count 1 > endobj
3 0 obj < /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> > endobj
4 0 obj < /Length 51 > stream
BT /F1 24 Tf 100 700 Td (PDF Upload Bypassed on Vercel) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000212 00000 n 
trailer < /Size 5 /Root 1 0 R >
startxref
314
%%EOF`;
      return new Response(Buffer.from(mockPdf, "utf-8"), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=placeholder.pdf",
        },
      });
    } else {
      return new Response("Video placeholder is not streamable.", { status: 404 });
    }
  }

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
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
