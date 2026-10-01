import fs from "node:fs";
import path from "node:path";
import { FormFillerData } from "@/lib/types/form-filler";
import { LOCAL_FILES_PATH } from "./mode";

/**
 * On-disk storage for local mode: the form in `.local-data/form.json` and
 * uploaded images in `.local-data/uploads/`.
 *
 * Reads and writes are synchronous on purpose: a read-check-write then can't
 * interleave with another request in this process, which is what makes the
 * `updated_at` conflict check below safe.
 */

const DATA_DIR = path.join(process.cwd(), ".local-data");
const FORM_FILE = path.join(DATA_DIR, "form.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const UPLOAD_ID = /^[A-Za-z0-9_-]{1,64}$/;
const UPLOAD_NAME = /^[A-Za-z0-9_-]{1,64}\.(jpg|png)$/;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

export interface LocalFormRow {
  form_data: FormFillerData;
  updated_at: string;
}

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

export function readLocalForm(): LocalFormRow | null {
  try {
    return JSON.parse(fs.readFileSync(FORM_FILE, "utf8")) as LocalFormRow;
  } catch (error) {
    // Only a missing file means "no form yet". A file that can't be parsed
    // must not be treated as empty, or the next save would overwrite it.
    if (isMissing(error)) return null;
    throw error;
  }
}

/**
 * Saves the form and returns its new `updated_at`, or null if it changed
 * since `loadedAt` (null: the caller saw no form). Leave `loadedAt` undefined
 * to save unconditionally.
 */
export function writeLocalForm(
  form: FormFillerData,
  loadedAt?: string | null
): string | null {
  const current = readLocalForm();
  if (loadedAt !== undefined && (current?.updated_at ?? null) !== loadedAt) {
    return null;
  }

  // Two saves in the same millisecond must still get different timestamps.
  let now = Date.now();
  if (current && now <= Date.parse(current.updated_at)) {
    now = Date.parse(current.updated_at) + 1;
  }
  const row: LocalFormRow = {
    form_data: form,
    updated_at: new Date(now).toISOString(),
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Write then rename, so a crash mid-write can't leave a truncated form.
  const tmp = `${FORM_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(row, null, 2));
  fs.renameSync(tmp, FORM_FILE);

  return row.updated_at;
}

export const isUploadId = (id: string) => UPLOAD_ID.test(id);

/** Stores an image and returns the URL the app serves it from. */
export function saveLocalUpload(id: string, extension: string, bytes: Buffer) {
  const name = `${id}.${extension}`;
  if (!UPLOAD_NAME.test(name)) throw new Error(`Invalid upload name: ${name}`);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, name), bytes);
  return `${LOCAL_FILES_PATH}/${name}`;
}

/** The URL of the stored upload with this id, or null if there is none. */
export function findLocalUpload(id: string): string | null {
  if (!isUploadId(id)) return null;

  for (const extension of Object.keys(CONTENT_TYPES)) {
    if (fs.existsSync(path.join(UPLOADS_DIR, id + extension))) {
      return `${LOCAL_FILES_PATH}/${id}${extension}`;
    }
  }
  return null;
}

export function readLocalUpload(name: string) {
  // The pattern allows no slashes or dots beyond the extension, so `name`
  // can't point outside the uploads folder.
  if (!UPLOAD_NAME.test(name)) return null;

  try {
    return {
      bytes: fs.readFileSync(path.join(UPLOADS_DIR, name)),
      contentType: CONTENT_TYPES[path.extname(name)],
    };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
