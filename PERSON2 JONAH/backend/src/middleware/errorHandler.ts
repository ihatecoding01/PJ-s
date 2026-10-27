import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): any {
  if (err instanceof ZodError) {
    return sendError(
      res,
      'Validation error: Invalid request parameters',
      400,
      err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      'VALIDATION_ERROR'
    );
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return sendError(res, `File upload error: ${err.message}`, 400, null, 'UPLOAD_ERROR');
  }

  // Generic errors
  const message = err.message || 'Internal server error occurred';
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('[Unhandled Error]', err);
  } else {
    console.warn(`[API ${statusCode}]`, message);
  }
  return sendError(
    res,
    message,
    statusCode,
    null,
    err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR')
  );
}
