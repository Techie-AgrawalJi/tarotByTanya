import { Router, type IRouter } from "express";
import {
  getLatestClientPhotoUrl,
  isCloudinaryReady,
} from "../lib/cloudinary";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/client-photo", async (_req, res) => {
  res.set("Cache-Control", "no-store");

  if (!isCloudinaryReady()) {
    res.status(503).json({
      imageUrl: null,
      message: "Cloudinary is not configured on the server.",
    });
    return;
  }

  try {
    const imageUrl = await getLatestClientPhotoUrl();

    if (!imageUrl) {
      res.status(404).json({
        imageUrl: null,
        message: "No client photo found in Cloudinary.",
      });
      return;
    }

    res.json({ imageUrl });
  } catch (err) {
    logger.error({ err }, "Failed to fetch client photo from Cloudinary");
    res.status(500).json({
      imageUrl: null,
      message: "Failed to fetch client photo.",
    });
  }
});

export default router;