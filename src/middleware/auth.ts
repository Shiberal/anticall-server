import { Request, Response, NextFunction } from 'express';
import { validate as validateUuid } from 'uuid';

export interface AuthRequest extends Request {
  deviceId?: string;
}

function toStr(v: string | string[] | undefined): string | undefined {
  return v === undefined ? undefined : Array.isArray(v) ? v[0] : v;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const deviceId = toStr(req.header('X-Device-UUID')) || toStr(req.header('Authorization'))?.replace('Bearer ', '');

  if (!deviceId) {
    return res.status(401).json({ error: 'Missing X-Device-UUID header or Bearer token' });
  }

  if (!validateUuid(deviceId)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  req.deviceId = deviceId;
  next();
};
