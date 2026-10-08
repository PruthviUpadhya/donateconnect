import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { fileStorageService } from "../services/file.service";
import { AppError } from "../middleware/error.middleware";

const router = Router();

// In-memory multer storage with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError({
          statusCode: 400,
          code: "INVALID_FILE_TYPE",
          message: "Only JPG, PNG, WEBP, and PDF documents are allowed",
        })
      );
    }
  },
});

/**
 * POST /api/v1/uploads
 * Stores document or image directly in PostgreSQL database (no Cloudinary).
 * Returns the URL endpoint to stream/view the file: /api/v1/files/:id
 */
router.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError({
          statusCode: 400,
          code: "NO_FILE_PROVIDED",
          message: "Please choose a file or image to upload",
        });
      }

      const stored = await fileStorageService.storeFile({
        filename: req.file.originalname || `upload_${Date.now()}`,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });

      // Construct URL for retrieval using request host or configured URL
      const host = req.get("host") || "172.20.0.40:3000";
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/api/v1/files/${stored.id}`;

      res.status(200).json({
        success: true,
        data: {
          id: stored.id,
          url: fileUrl,
          mimetype: stored.mimeType,
          size: stored.size,
          filename: stored.filename,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
