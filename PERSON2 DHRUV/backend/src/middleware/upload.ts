import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env';

// Ensure upload directory exists safely
const uploadDirResolved = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDirResolved)) {
  fs.mkdirSync(uploadDirResolved, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirResolved);
  },
  filename: (_req, file, cb) => {
    // Prevent path traversal by sanitizing the extension and generating a random hex name
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, `${randomName}${ext}`);
  },
});

export const uploadEvidence = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});
