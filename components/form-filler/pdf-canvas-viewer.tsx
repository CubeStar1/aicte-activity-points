"use client";

import { useTheme } from "next-themes";
import { PDFViewer } from "@embedpdf/react-pdf-viewer";

// The viewer's colours point at the app's own theme tokens, so it follows the app's light/dark
// setting (not the OS) and stays in sync with the rest of the UI. CSS variables inherit into
// the viewer, so the same mapping serves both modes.
const appColors = {
  background: {
    app: "var(--muted)",
    surface: "var(--card)",
    surfaceAlt: "var(--muted)",
    elevated: "var(--popover)",
    input: "var(--input)",
  },
  foreground: {
    primary: "var(--foreground)",
    secondary: "var(--muted-foreground)",
    muted: "var(--muted-foreground)",
    onAccent: "var(--primary-foreground)",
  },
  border: {
    default: "var(--border)",
    subtle: "var(--border)",
  },
  accent: {
    primary: "var(--primary)",
    primaryHover: "color-mix(in oklch, var(--primary), var(--foreground) 12%)",
    primaryActive: "color-mix(in oklch, var(--primary), var(--foreground) 20%)",
    primaryLight: "color-mix(in oklch, var(--primary) 15%, transparent)",
    primaryForeground: "var(--primary-foreground)",
  },
  interactive: {
    hover: "var(--accent)",
    active: "var(--accent)",
    selected: "color-mix(in oklch, var(--primary) 15%, transparent)",
    focus: "var(--ring)",
  },
};

/**
 * Scrollable PDF viewer for browsers whose built-in PDF embed shows only the first page and
 * does not scroll (iOS, iPadOS, macOS). EmbedPDF renders with PDFium compiled to WASM, and
 * fetches that binary from a CDN, so nothing extra is served from this app.
 */
export function PDFCanvasViewer({ url }: { url: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <PDFViewer
      // The preview URL changes on every regeneration, so remount to load the new document.
      key={url}
      className="h-full w-full"
      config={{
        src: url,
        theme: {
          preference: resolvedTheme === "dark" ? "dark" : "light",
          light: appColors,
          dark: appColors,
        },
        tabBar: "never",
        disabledCategories: ["annotation", "redaction", "tools", "history", "document"],
      }}
    />
  );
}
