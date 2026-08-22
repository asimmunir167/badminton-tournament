import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { ApiError } from "../middleware/errorHandler";

export const uploadsDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_EXT[file.mimetype] ?? "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_EXT[file.mimetype]) {
      cb(new ApiError(400, "Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function absoluteUploadUrl(req: { protocol: string; get(name: string): string | undefined }, filename: string) {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}
