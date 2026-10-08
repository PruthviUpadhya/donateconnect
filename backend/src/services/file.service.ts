import { prisma } from "../db/prisma";
import { AppError } from "../middleware/error.middleware";

export class FileStorageService {
  /**
   * Stores a file or compressed image buffer directly in the PostgreSQL database as a base64 record.
   */
  async storeFile(options: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ id: string; filename: string; mimeType: string; size: number }> {
    const { filename, mimeType, buffer } = options;

    if (!buffer || buffer.length === 0) {
      throw new AppError({
        statusCode: 400,
        code: "EMPTY_FILE",
        message: "Uploaded file is empty",
      });
    }

    const base64Data = buffer.toString("base64");

    const record = await prisma.storedFile.create({
      data: {
        filename,
        mimeType,
        data: base64Data,
        size: buffer.length,
      },
    });

    return {
      id: record.id,
      filename: record.filename,
      mimeType: record.mimeType,
      size: record.size,
    };
  }

  /**
   * Fetches the file data from PostgreSQL by ID.
   */
  async getFile(id: string): Promise<{ filename: string; mimeType: string; buffer: Buffer; size: number }> {
    const record = await prisma.storedFile.findUnique({
      where: { id },
    });

    if (!record) {
      throw new AppError({
        statusCode: 404,
        code: "FILE_NOT_FOUND",
        message: "File not found",
      });
    }

    const buffer = Buffer.from(record.data, "base64");

    return {
      filename: record.filename,
      mimeType: record.mimeType,
      buffer,
      size: record.size,
    };
  }
}

export const fileStorageService = new FileStorageService();
export default fileStorageService;
