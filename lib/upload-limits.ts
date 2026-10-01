// Shared by the upload API route and the form, so the two can't drift apart.
// Only JPG and PNG: the PDF renderer can't embed other image formats.
export const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const UPLOAD_ACCEPT = Object.keys(UPLOAD_EXTENSIONS).join(",");

export const MAX_UPLOAD_MB = 2;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const UPLOAD_HINT = `JPG or PNG, up to ${MAX_UPLOAD_MB} MB`;

export function validateUpload(file: File): string | null {
  if (!(file.type in UPLOAD_EXTENSIONS)) {
    return "Only JPG and PNG images are supported.";
  }
  if (file.size === 0) {
    return "The file is empty.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Larger than ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}
