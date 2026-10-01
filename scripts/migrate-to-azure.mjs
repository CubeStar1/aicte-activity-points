// One-shot migration of activity evidence from Supabase Storage to Azure Blob Storage.
//
//   node --env-file=.env.local scripts/migrate-to-azure.mjs --dry-run
//   node --env-file=.env.local scripts/migrate-to-azure.mjs
//
// 1. Backs up every activity_forms row to exports/activity_forms-backup-<time>.json
// 2. Copies every file referenced by a form to Azure under the same path
//    (from the local exports folder when present, otherwise from Supabase)
// 3. Rewrites the URLs in the database, only if every file made it across
//
// Safe to re-run: files already in Azure are skipped and nothing is deleted from Supabase.

import { createClient } from "@supabase/supabase-js";
import { BlobServiceClient } from "@azure/storage-blob";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
// Rewrite the database even if some referenced files could not be copied.
const SKIP_MISSING = process.argv.includes("--skip-missing");
const CONCURRENCY = 8;
const EXPORTS_DIR = "exports";
const SUPABASE_BUCKET = "activity-evidence";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ADMIN",
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_STORAGE_CONTAINER",
];
const missingEnv = required.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ADMIN,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const container = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
).getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

const OLD_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
const NEW_PREFIX = `${container.url}/`;

const CONTENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  pdf: "application/pdf",
};

function contentTypeFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

async function fetchAllForms() {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("activity_forms")
      .select("*")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

// Export files are named "<nn>-photo-<n>-<original>" or "<nn>-certificate-<original>".
async function indexLocalExports() {
  const index = new Map();
  let entries;
  try {
    entries = await readdir(EXPORTS_DIR, { recursive: true, withFileTypes: true });
  } catch {
    return index;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const original = entry.name.replace(/^\d+-(certificate|photo-\d+)-/, "");
    if (original === entry.name) continue;
    index.set(original, path.join(entry.parentPath, entry.name));
  }
  return index;
}

async function copyFile(urlPath, localIndex) {
  const blobName = decodeURIComponent(urlPath);
  const blob = container.getBlockBlobClient(blobName);
  if (await blob.exists()) return "skipped";

  let body;
  let contentType = contentTypeFor(blobName);
  let source = "local";
  const localPath = localIndex.get(blobName.split("/").pop());

  if (localPath) {
    body = await readFile(localPath);
  } else {
    source = "supabase";
    const res = await fetch(OLD_PREFIX + urlPath);
    if (!res.ok) throw new Error(`Supabase returned ${res.status}`);
    body = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") || contentType;
  }

  if (body.length === 0) throw new Error("Source file is empty");

  await blob.uploadData(body, { blobHTTPHeaders: { blobContentType: contentType } });
  return source;
}

async function runPool(items, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    })
  );
}

const forms = await fetchAllForms();
console.log(`Loaded ${forms.length} forms`);

await mkdir(EXPORTS_DIR, { recursive: true });
const backupPath = path.join(
  EXPORTS_DIR,
  `activity_forms-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
await writeFile(backupPath, JSON.stringify(forms, null, 2));
console.log(`Backup written to ${backupPath}`);

const urlPaths = new Set();
const formsToRewrite = [];
for (const form of forms) {
  const text = JSON.stringify(form.form_data);
  if (!text.includes(OLD_PREFIX)) continue;
  formsToRewrite.push(form);
  for (const part of text.split(OLD_PREFIX).slice(1)) {
    urlPaths.add(part.slice(0, part.indexOf('"')).split("?")[0]);
  }
}
console.log(`${urlPaths.size} files referenced by ${formsToRewrite.length} forms`);

const localIndex = await indexLocalExports();
console.log(`${localIndex.size} files found in local exports`);

if (!(await container.exists())) {
  console.error(`Azure container "${container.containerName}" does not exist. Create it first.`);
  process.exit(1);
}

if (DRY_RUN) {
  const local = [...urlPaths].filter((p) =>
    localIndex.has(decodeURIComponent(p).split("/").pop())
  ).length;
  console.log(`Dry run: ${local} would come from local exports, ${urlPaths.size - local} from Supabase`);
  console.log(`Dry run: URLs would change from\n  ${OLD_PREFIX}\nto\n  ${NEW_PREFIX}`);
  process.exit(0);
}

const counts = { skipped: 0, local: 0, supabase: 0 };
const failures = [];
let done = 0;
await runPool([...urlPaths], async (urlPath) => {
  try {
    counts[await copyFile(urlPath, localIndex)]++;
  } catch (error) {
    failures.push({ urlPath, message: error.message });
  }
  if (++done % 250 === 0) console.log(`  ${done}/${urlPaths.size}`);
});
console.log(
  `Copied ${counts.local} from local, ${counts.supabase} from Supabase, ${counts.skipped} already in Azure, ${failures.length} failed`
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED ${failure.urlPath}: ${failure.message}`);
  if (!SKIP_MISSING) {
    console.error("Database not touched. Fix the failures and re-run, or pass --skip-missing.");
    process.exit(1);
  }
  console.error("Continuing with --skip-missing: these URLs will point at files that do not exist.");
}

let rewritten = 0;
for (const form of formsToRewrite) {
  const formData = JSON.parse(
    JSON.stringify(form.form_data).split(OLD_PREFIX).join(NEW_PREFIX)
  );
  const { error } = await supabase
    .from("activity_forms")
    .update({ form_data: formData })
    .eq("id", form.id);
  if (error) {
    console.error(`  FAILED to update form ${form.id}: ${error.message}`);
    process.exitCode = 1;
  } else {
    rewritten++;
  }
}
console.log(`Rewrote URLs in ${rewritten}/${formsToRewrite.length} forms`);
