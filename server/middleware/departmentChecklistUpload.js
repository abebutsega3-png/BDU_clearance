import multer from 'multer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uploadDirectory = fileURLToPath(new URL('../uploads/department-checklist/', import.meta.url));
fs.mkdirSync(uploadDirectory, { recursive: true });
const allowedTypes = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => {
    const extension = allowedTypes.get(file.mimetype);
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const expectedExtension = allowedTypes.get(file.mimetype);
    const actualExtension = path.extname(file.originalname).toLowerCase();
    const isJpeg = file.mimetype === 'image/jpeg' && actualExtension === '.jpeg';
    if (!expectedExtension || (actualExtension !== expectedExtension && !isJpeg)) {
      callback(new Error('Only PDF, JPEG, PNG, and WebP files are allowed.'));
      return;
    }
    callback(null, true);
  },
});

export const uploadDepartmentChecklistAttachment = (req, res, next) => {
  upload.single('attachment')(req, res, (error) => {
    if (!error) return next();
    const isSizeLimit = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    const isMulterError = error instanceof multer.MulterError;
    return res.status(isSizeLimit ? 413 : isMulterError ? 400 : 415).json({
      success: false,
      message: isSizeLimit
        ? 'Attachments must be 5 MB or smaller.'
        : error.message || 'Unable to upload the attachment.',
    });
  });
};

export { uploadDirectory };
