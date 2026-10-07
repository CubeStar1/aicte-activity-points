"use client";

import { useState, useEffect, useRef } from "react";
import { FormFillerData } from "@/lib/types/form-filler";
import { wrap } from "comlink";
import dynamic from "next/dynamic";
import { type WorkerType } from "./pdf.worker";

// pdf.js touches browser globals at import time, so it is loaded on the client only.
const PDFCanvasViewer = dynamic(
  () => import("./pdf-canvas-viewer").then((m) => m.PDFCanvasViewer),
  { ssr: false }
);

// iOS, iPadOS and macOS browsers show only the first page of an embedded PDF and do not
// scroll it. iPadOS reports itself as "Macintosh", so one pattern covers all three.
function isApplePlatform() {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent);
}

interface PDFPreviewProps {
  data: FormFillerData;
}

export function PDFPreview({ data }: PDFPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const serviceRef = useRef<any>(null);
  const [useCanvasViewer, setUseCanvasViewer] = useState(false);

  useEffect(() => {
    setUseCanvasViewer(isApplePlatform());
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL("./pdf.worker.ts", import.meta.url));
    serviceRef.current = wrap<WorkerType>(workerRef.current);

    return () => {
      workerRef.current?.terminate();
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const generatePDF = async () => {
      if (!serviceRef.current) return;

      try {
        setLoading(true);
        setError(null);
        
        if (url) {
          URL.revokeObjectURL(url);
        }

        const newUrl = await serviceRef.current.renderPDF(data);
        
        if (active) {
          setUrl(newUrl);
        } else {
          URL.revokeObjectURL(newUrl);
        }
      } catch (err) {
        console.error("Error generating PDF preview:", err);
        if (active) setError("Failed to generate preview");
      } finally {
        if (active) setLoading(false);
      }
    };


    const timeoutId = setTimeout(generatePDF, 500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  if (loading && !url) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Generating preview...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      {url &&
        (useCanvasViewer ? (
          <PDFCanvasViewer url={url} />
        ) : (
          <iframe
            src={url}
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        ))}
    </div>
  );
}
