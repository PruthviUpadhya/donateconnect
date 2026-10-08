import { Router, Request, Response, NextFunction } from "express";
import { fileStorageService } from "../services/file.service";

const router = Router();

/**
 * GET /api/v1/files/:id
 * Streams the stored document or image directly from the PostgreSQL database
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const file = await fileStorageService.getFile(id);

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    // Allow inline viewing in browser / image viewer or downloading
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    // Cache for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400");

    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
