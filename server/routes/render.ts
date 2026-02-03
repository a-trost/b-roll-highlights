import express from "express";
import { renderHighlightVideo } from "../services/remotionRenderer";
import type { HighlightProps, WordBox, MarkingMode, CameraMovement, BlurMode } from "../../src/types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
} from "../../src/types";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      filename,
      selectedWords,
      backgroundColor,
      imageWidth,
      imageHeight,
      highlightColor,
      markingMode,
      leadInSeconds,
      charsPerSecond,
      leadOutSeconds,
      blurredBackground,
      cameraMovement,
      blurMode,
    } = req.body;

    if (!filename || !selectedWords || !backgroundColor) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const props: HighlightProps = {
      imageSrc: `http://localhost:3001/uploads/${filename}`,
      selectedWords: selectedWords as WordBox[],
      backgroundColor: backgroundColor as [number, number, number],
      imageWidth: imageWidth || 1920,
      imageHeight: imageHeight || 1080,
      highlightColor: highlightColor || "rgba(255, 230, 0, 0.5)",
      markingMode: (markingMode as MarkingMode) || "highlight",
      leadInSeconds: leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS,
      charsPerSecond: charsPerSecond ?? DEFAULT_CHARS_PER_SECOND,
      leadOutSeconds: leadOutSeconds ?? DEFAULT_LEAD_OUT_SECONDS,
      blurredBackground: blurredBackground ?? false,
      cameraMovement: (cameraMovement as CameraMovement) || "left-right",
      blurMode: (blurMode as BlurMode) || "blur-in",
    };

    const videoPath = await renderHighlightVideo(props);

    res.json({ videoPath });
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({ error: "Failed to render video" });
  }
});

export default router;
