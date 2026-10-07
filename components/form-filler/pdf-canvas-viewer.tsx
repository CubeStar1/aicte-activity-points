"use client";

import { PDFViewer } from "@embedpdf/react-pdf-viewer";

/**
 * Scrollable PDF viewer for browsers whose built-in PDF embed shows only the first page and
 * does not scroll (iOS, iPadOS, macOS). EmbedPDF renders with PDFium compiled to WASM, and
 * fetches that binary from a CDN, so nothing extra is served from this app.
 */
export function PDFCanvasViewer({ url }: { url: string }) {
  return (
    <PDFViewer
      // The preview URL changes on every regeneration, so remount to load the new document.
      key={url}
      className="h-full w-full"
      config={{
        src: url,
        theme: { preference: "system" },
        tabBar: "never",
        disabledCategories: ["annotation", "redaction", "tools", "history", "document"],
      }}
    />
  );
}
