"use client";

import { useEffect, useRef, useState } from "react";

// pdf.js is served as-is from /public/pdfjs (copied from pdfjs-dist/legacy/build) rather than
// bundled: its pre-bundled ESM file clashes with Next's webpack runtime and throws on import.
// The legacy build is used because it also runs on older iOS Safari versions.
const PDFJS_URL = "/pdfjs/pdf.min.mjs";
const PDFJS_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";

// Aspect ratio used for a page's placeholder until it has rendered (A4).
const A4_RATIO = 297 / 210;
// Cap the device pixel ratio so large pages stay under iOS's canvas memory limit.
const MAX_PIXEL_RATIO = 2;

/* eslint-disable @typescript-eslint/no-explicit-any */
let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= import(/* webpackIgnore: true */ PDFJS_URL).then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return lib;
  });
  return pdfjsPromise;
}

interface PageSlotProps {
  pdf: any;
  pageNumber: number;
  width: number;
  root: HTMLElement | null;
}

/** Draws one page onto a canvas, and only while it is near the viewport (keeps iOS memory low). */
function PageSlot({ pdf, pageNumber, width, root }: PageSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [height, setHeight] = useState(width * A4_RATIO);

  useEffect(() => {
    const el = slotRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { root, rootMargin: "100% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas || width <= 0) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const viewport = page.getViewport({ scale: scale * ratio });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setHeight(viewport.height / ratio);

      task = page.render({ canvasContext: canvas.getContext("2d")!, viewport });
      await task!.promise.catch(() => {}); // a cancelled render rejects
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, pdf, pageNumber, width]);

  return (
    <div
      ref={slotRef}
      className="mx-auto mb-3 overflow-hidden bg-white shadow-sm"
      style={{ width, height }}
    >
      {visible && <canvas ref={canvasRef} style={{ width, height }} />}
    </div>
  );
}

/** Scrollable PDF viewer drawn with pdf.js, for browsers whose built-in PDF embed does not scroll. */
export function PDFCanvasViewer({ url }: { url: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [pdf, setPdf] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!container) return;
    const update = () => setWidth(Math.max(container.clientWidth - 24, 0));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  useEffect(() => {
    let cancelled = false;
    let doc: any = null;
    setError(false);

    loadPdfjs()
      .then((lib) => lib.getDocument({ url }).promise)
      .then((loaded) => {
        if (cancelled) return loaded.destroy();
        doc = loaded;
        setPdf(loaded);
      })
      .catch((err) => {
        console.error("Error rendering PDF preview:", err);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [url]);

  return (
    <div
      ref={setContainer}
      className="h-full w-full overflow-y-auto overscroll-contain bg-muted p-3 [-webkit-overflow-scrolling:touch]"
    >
      {error ? (
        <div className="py-10 text-center text-sm text-red-500">Failed to load PDF</div>
      ) : !pdf ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading pages...</div>
      ) : (
        width > 0 &&
        Array.from({ length: pdf.numPages }, (_, i) => (
          <PageSlot key={i + 1} pdf={pdf} pageNumber={i + 1} width={width} root={container} />
        ))
      )}
    </div>
  );
}
