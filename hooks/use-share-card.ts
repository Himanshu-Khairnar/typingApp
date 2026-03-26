"use client";

import { useCallback, useState, type RefObject } from "react";
import html2canvas from "html2canvas";

export function useShareCard() {
  const [capturing, setCapturing] = useState(false);

  const shareResult = useCallback(async (elementRef: RefObject<HTMLElement | null>) => {
    const element = elementRef.current;
    if (!element) return;

    setCapturing(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) return;

      // Try clipboard first (requires secure context)
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        } catch {
          // Clipboard failed, fall through to download
        }
      }

      // Always offer download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `typearena-result-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setCapturing(false);
    }
  }, []);

  return { capturing, shareResult };
}
