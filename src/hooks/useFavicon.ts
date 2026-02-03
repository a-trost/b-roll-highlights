import { useEffect } from "react";

type FaviconState = "idle" | "rendering" | "complete";

const FAVICON_EMOJIS: Record<FaviconState, string> = {
  idle: "✨",
  rendering: "⏳",
  complete: "🎬",
};

function setEmojiFavicon(emoji: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  ctx.font = "56px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 32, 36);

  const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
    || document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "icon";
  link.href = canvas.toDataURL();

  if (!document.querySelector("link[rel*='icon']")) {
    document.head.appendChild(link);
  }
}

export function useFavicon(isRendering: boolean, hasVideo: boolean) {
  useEffect(() => {
    let state: FaviconState = "idle";

    if (isRendering) {
      state = "rendering";
    } else if (hasVideo) {
      state = "complete";
    }

    setEmojiFavicon(FAVICON_EMOJIS[state]);

    // Also update the title for additional visibility
    const baseTitle = "B-Roll Highlights";
    if (isRendering) {
      document.title = `Rendering... | ${baseTitle}`;
    } else if (hasVideo) {
      document.title = `Ready! | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [isRendering, hasVideo]);
}
